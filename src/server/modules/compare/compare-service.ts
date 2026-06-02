import { generateJsonWithLlm } from "@/src/server/lib/llm-provider"
import type { LlmConfig } from "@/src/server/lib/llm-provider"
import { readStore, updateStore } from "@/src/server/lib/file-store"
import { resolveRepo } from "@/src/server/modules/project/project-service"
import type { RepoRecord } from "@/src/server/modules/project/types"

export interface CompareRepoInput {
  owner: string
  name: string
}

export type CompareAnalysisJobStatus = "generating" | "cached" | "failed"

export interface CompareAnalysisJob {
  id: string
  repos: CompareRepoInput[]
  status: CompareAnalysisJobStatus
  markdown: string | null
  generated_by: string | null
  error: string | null
  created_at: string
  updated_at: string
}

type LlmConfigOverride = Omit<LlmConfig, "contextWindow"> & { contextWindow?: number }

export async function startComparisonMarkdownJob(repos: CompareRepoInput[], llmConfig?: LlmConfigOverride) {
  const uniqueRepos = dedupeRepos(repos)
  if (uniqueRepos.length < 2) {
    throw new Error("At least two repositories are required for comparison.")
  }

  const now = new Date().toISOString()

  const job: CompareAnalysisJob = {
    id: `compare-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    repos: uniqueRepos,
    status: "generating",
    markdown: null,
    generated_by: null,
    error: null,
    created_at: now,
    updated_at: now,
  }

  upsertComparisonJob(job)

  void generateComparisonMarkdown(uniqueRepos, llmConfig)
    .then(async (result) => {
      await updateComparisonJob(job.id, {
        status: "cached",
        markdown: result.markdown,
        generated_by: result.generated_by,
      })
    })
    .catch(async (error) => {
      await updateComparisonJob(job.id, {
        status: "failed",
        error: error instanceof Error ? error.message : "Failed to generate comparison analysis.",
      })
    })

  return job
}

export function getComparisonMarkdownJob(id: string) {
  return readStore().compare_jobs.find((job) => job.id === id) || null
}

export async function retryComparisonMarkdownJob(id: string, llmConfig?: LlmConfigOverride) {
  const job = getComparisonMarkdownJob(id)
  if (!job) return null

  await updateComparisonJob(id, {
    status: "generating",
    markdown: null,
    generated_by: null,
    error: null,
  })

  void generateComparisonMarkdown(job.repos, llmConfig)
    .then(async (result) => {
      await updateComparisonJob(id, {
        status: "cached",
        markdown: result.markdown,
        generated_by: result.generated_by,
      })
    })
    .catch(async (error) => {
      await updateComparisonJob(id, {
        status: "failed",
        error: error instanceof Error ? error.message : "Failed to generate comparison analysis.",
      })
    })

  return getComparisonMarkdownJob(id)
}

export async function generateComparisonMarkdown(repos: CompareRepoInput[], llmConfig?: LlmConfigOverride) {
  const uniqueRepos = dedupeRepos(repos)
  const resolved = await Promise.all(
    uniqueRepos.map(async (repo) => {
      const result = await resolveRepo(repo.owner, repo.name)
      return result.repo
    })
  )

  if (resolved.length < 2) {
    throw new Error("At least two repositories are required for comparison.")
  }

  try {
    const result = await generateJsonWithLlm({ ...buildComparisonPrompt(resolved), llmConfig })
    const markdown = typeof result.content.markdown === "string"
      ? result.content.markdown.trim()
      : ""

    if (markdown) {
      return {
        markdown,
        generated_by: `${result.provider}:${result.model}`,
      }
    }
  } catch (error) {
    console.warn("[CompareService] LLM comparison failed, using deterministic fallback.", error)
  }

  return {
    markdown: buildFallbackMarkdown(resolved),
    generated_by: "fallback:metadata",
  }
}

async function updateComparisonJob(id: string, patch: Partial<CompareAnalysisJob>) {
  const current = getComparisonMarkdownJob(id)
  if (!current) return null

  const next = {
    ...current,
    ...patch,
    updated_at: new Date().toISOString(),
  }

  await upsertComparisonJob(next)
  return next
}

async function upsertComparisonJob(job: CompareAnalysisJob) {
  return await updateStore((store) => {
    const index = store.compare_jobs.findIndex((item) => item.id === job.id)
    if (index >= 0) {
      store.compare_jobs[index] = job
    } else {
      store.compare_jobs.push(job)
    }
    return job
  })
}

function buildComparisonPrompt(repos: RepoRecord[]) {
  const repoData = repos.map((repo) => ({
    full_name: repo.full_name,
    description: repo.description || "",
    language: repo.language || "Unknown",
    stars: repo.stars,
    forks: repo.forks,
    open_issues_count: repo.open_issues_count,
    watchers: repo.watchers,
    license: repo.license || "Unknown",
    topics: repo.topics,
    homepage: repo.homepage,
    default_branch: repo.default_branch,
    source: repo.source,
    is_archived: repo.is_archived,
    is_fork: repo.is_fork,
    synced_at: repo.synced_at,
  }))

  return {
    system: [
      "你是一名资深商业化产品顾问、开源生态分析师和技术战略顾问。",
      "你的任务不是写普通项目介绍，而是生成一份可供创业者、产品负责人、投资人或技术负责人做决策的商业级横向对比报告。",
      "必须基于输入仓库元数据分析，不得编造 README、源码、用户访谈、收入、融资、客户案例或未提供的事实。",
      "可以做推断，但必须显式标注为“推断”，并说明推断依据来自哪些元数据字段。",
      "如果证据不足，直接写“证据不足，无法确认”，不要用空泛套话填充。",
      "商业建议必须说明适用对象、下一步动作、为什么现在做、主要风险、以及哪些补充证据会改变建议。",
      "输出必须是严格 JSON，且只能包含一个字段：{\"markdown\":\"...\"}。",
    ].join("\n"),
    user: [
      "# 目标",
      "请基于下方 GitHub 仓库元数据，生成一份高商业价值的中文 Markdown 深度对比分析报告。",
      "",
      "# 分析原则",
      "- 先给结论，再给证据，再给行动建议。",
      "- 每个关键判断都要说明依据，依据只能来自 stars、forks、open_issues_count、watchers、language、license、topics、description、homepage、is_fork、is_archived、synced_at 等输入字段。",
      "- 不要把 Star 多简单等同于商业价值高，要区分社区热度、开发者采用、维护压力、商业化可能性、进入壁垒。",
      "- 对比必须横向展开，不能逐个仓库流水账介绍。",
      "- 输出要具体、可执行、可用于业务决策，避免“持续关注”“加强运营”这类空泛建议。",
      "- 所有评分都必须附一句评分理由，并说明该评分最受哪些缺失信息影响。",
      "- 当只有元数据时，不要把商业模式、客户类型、收入潜力、产品成熟度写成确认事实；只能写为推断或待验证假设。",
      "",
      "# 必须覆盖的报告目录",
      "## 1. 一页纸决策摘要",
      "- 给出 3-5 条最重要结论。",
      "- 明确推荐优先研究/对标/避开的项目，并解释原因。",
      "- 输出一个“最终建议”：适合复制学习、适合差异化切入、适合谨慎观察、或不建议作为核心对标。",
      "",
      "## 2. 对比对象与证据边界",
      "- 列出参与对比的仓库。",
      "- 说明当前仅基于 GitHub 元数据，哪些结论是确认事实，哪些只是推断。",
      "- 标出最影响判断的缺失信息。",
      "",
      "## 3. 基础指标对比表",
      "- 使用 Markdown 表格对比：仓库、定位摘要、语言、Stars、Forks、Open Issues、Watchers、License、Topics、同步时间。",
      "- 表格后必须解释这些指标分别代表什么，不能只堆数字。",
      "",
      "## 4. 市场定位与用户场景对比",
      "- 基于 description/topics/homepage 推断每个项目可能服务的用户类型。",
      "- 对比谁更偏开发者工具、基础设施、应用平台、行业方案、自动化工具或实验性项目。",
      "- 输出适用场景矩阵：场景、最适合项目、次优项目、不适合项目、判断依据。",
      "",
      "## 5. 产品能力与差异化推断",
      "- 只能基于 description/topics 推断能力边界。",
      "- 对比核心能力、扩展能力、生态能力、部署/集成可能性、企业化可能性。",
      "- 标明“确认能力”和“推断能力”。",
      "",
      "## 6. 技术路线与生态选择",
      "- 对比主语言、可能的开发者生态、技术采用门槛、团队招聘/维护成本。",
      "- 分析技术路线对商业化、交付、二次开发、社区贡献的影响。",
      "",
      "## 7. 社区热度与维护压力",
      "- 综合 Stars、Forks、Watchers、Open Issues 判断社区吸引力和维护压力。",
      "- 输出每个项目的社区信号评分，满分 10 分，并解释扣分原因。",
      "",
      "## 8. 商业化与进入壁垒判断",
      "- 推断每个项目可能的商业化路径：SaaS、Open-core、企业服务、托管服务、插件生态、咨询交付等。",
      "- 分析进入壁垒：技术壁垒、生态壁垒、品牌壁垒、数据/工作流迁移成本、社区网络效应。",
      "- 明确哪些判断证据不足。",
      "",
      "## 9. 机会缺口与新产品切入点",
      "- 提出 5-8 个可落地切入机会。",
      "- 每个机会包含：目标用户、痛点假设、为什么现有项目可能没有很好覆盖、MVP 方向、验证方式、风险。",
      "- 不允许只写概念，必须能转化为产品实验。",
      "",
      "## 10. 风险、反例与不确定性",
      "- 主动写出可能推翻当前判断的反例。",
      "- 列出需要进一步拉取 README、源码、Issue、PR、Release、贡献者数据验证的问题。",
      "",
      "## 11. 综合评分卡",
      "- 用 Markdown 表格给每个项目评分：社区热度、开发者采用潜力、维护健康度、商业化潜力、差异化空间、进入壁垒、综合建议。",
      "- 分数 1-10，必须给出一句评分理由。",
      "",
      "## 12. 下一步行动计划",
      "- 分为 24 小时、7 天、30 天三个阶段。",
      "- 明确应该继续分析哪些项目、补哪些数据、做哪些访谈或原型验证。",
      "",
      "# 质量要求",
      "- 报告要像咨询顾问交付物，而不是博客文章。",
      "- 结论必须锋利，但证据边界必须诚实。",
      "- 每个大章节至少包含可执行判断或明确的不确定性。",
      "- 每条关键建议都要能回答：谁该行动、马上做什么、为什么这比其他动作更优先、失败信号是什么。",
      "- 不要为了凑满章节而重复指标解释；优先输出能改变决策的差异、反例、风险和验证动作。",
      "- Markdown 中必须使用表格、项目符号和清晰标题。",
      "- 不要输出代码块包裹 Markdown。",
      "",
      "# 仓库元数据",
      JSON.stringify(repoData),
    ].join("\n"),
    temperature: 0.16,
  }
}

function buildFallbackMarkdown(repos: RepoRecord[]) {
  const rows = repos
    .map((repo) => {
      return [
        repo.full_name,
        repo.description || "No description provided.",
        repo.language || "Unknown",
        String(repo.stars),
        String(repo.forks),
        String(repo.open_issues_count),
        String(repo.watchers),
        repo.license || "Unknown",
        repo.topics.join(", ") || "None",
        repo.synced_at || "unknown",
      ].join(" | ")
    })
    .join("\n")

  const leader = [...repos].sort((a, b) => b.stars - a.stars)[0]
  const forkLeader = [...repos].sort((a, b) => b.forks - a.forks)[0]
  const highestIssuePressure = [...repos].sort((a, b) => b.open_issues_count - a.open_issues_count)[0]
  const languageSet = Array.from(new Set(repos.map((repo) => repo.language || "Unknown"))).join(", ")

  return [
    "# 项目对比分析报告",
    "",
    "## 1. 一页纸决策摘要",
    `- 当前对比 ${repos.length} 个仓库：${repos.map((repo) => repo.full_name).join("、")}。`,
    leader ? `- 从 Star 规模看，${leader.full_name} 当前社区关注度最高，适合作为第一优先级观察对象。` : "",
    forkLeader ? `- 从 Fork 数看，${forkLeader.full_name} 的二次开发/学习信号相对更强。` : "",
    highestIssuePressure ? `- 从 Open Issues 看，${highestIssuePressure.full_name} 的维护压力或用户反馈堆积最高，需要进一步验证 Issue 类型。` : "",
    `- 技术语言覆盖：${languageSet}。语言差异会影响二次开发门槛、招聘成本和生态兼容性。`,
    "- 最终建议：先以社区热度最高和 Fork 信号最强的项目作为核心对标，再补充 README、Issue、Release 和贡献者数据后做二次判断。",
    "",
    "## 2. 对比对象与证据边界",
    "- 当前报告由 GitHub 仓库元数据生成，确认事实包括仓库名称、描述、语言、Stars、Forks、Open Issues、Watchers、License、Topics、同步时间。",
    "- 商业模式、真实用户画像、功能完整度、收入能力、企业客户、代码质量均证据不足，无法确认。",
    "- 下文涉及定位、商业化、机会缺口的内容属于基于 description/topics/社区指标的推断。",
    "",
    "## 3. 基础指标对比表",
    "| 仓库 | 定位摘要 | 语言 | Stars | Forks | Open Issues | Watchers | License | Topics | 同步时间 |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |",
    rows,
    "",
    "指标解释：Stars 更接近社区关注度，Forks 更接近学习和二次开发意愿，Open Issues 可能代表维护压力或活跃反馈，Watchers 代表持续关注强度。单一指标不能直接等同于商业价值。",
    "",
    "## 4. 市场定位与用户场景对比",
    "| 场景 | 最适合项目 | 判断依据 | 需要补充验证 |",
    "| --- | --- | --- | --- |",
    ...repos.map((repo) => {
      const topics = repo.topics.join(", ") || "topics 缺失"
      return `| ${repo.description || repo.full_name} | ${repo.full_name} | description/topics: ${topics} | README、用户案例、Issue 类型 |`
    }),
    "",
    "## 5. 产品能力与差异化推断",
    ...repos.map((repo) => {
      const topics = repo.topics.join(", ") || "证据不足"
      return `- ${repo.full_name}: 确认信息为 ${repo.description || "无描述"}；可推断能力边界来自 topics：${topics}。`
    }),
    "",
    "## 6. 技术路线与生态选择",
    ...repos.map((repo) => {
      return `- ${repo.full_name}: 主语言 ${repo.language || "Unknown"}。这会影响开发者生态、插件扩展、招聘难度和企业落地成本。`
    }),
    "",
    "## 7. 社区热度与维护压力",
    "| 仓库 | 社区信号评分 | 评分理由 |",
    "| --- | ---: | --- |",
    ...repos.map((repo) => {
      const score = scoreCommunitySignal(repo, repos)
      return `| ${repo.full_name} | ${score}/10 | Stars=${repo.stars}, Forks=${repo.forks}, Open Issues=${repo.open_issues_count}, Watchers=${repo.watchers} |`
    }),
    "",
    "## 8. 商业化与进入壁垒判断",
    "- 可能路径包括 SaaS、Open-core、企业托管、插件生态、咨询交付和私有化部署，但当前证据不足，无法确认各项目真实商业模式。",
    "- 初步进入壁垒主要来自社区规模、生态认知、二次开发基础和用户迁移成本。",
    "",
    "## 9. 机会缺口与新产品切入点",
    "- 机会 1：围绕高 Open Issues 项目的未满足需求做 Issue 聚类，验证用户痛点密度。",
    "- 机会 2：针对主流项目复杂部署或学习成本，做更轻量的垂直场景版本。",
    "- 机会 3：围绕企业落地的权限、审计、监控、成本治理做增强层。",
    "- 机会 4：围绕特定行业工作流做模板化解决方案，而不是泛平台竞争。",
    "- 机会 5：对 Star 高但 License/部署/维护成本较高的项目，寻找替代型产品机会。",
    "",
    "## 10. 风险、反例与不确定性",
    "- 如果 README 或 Release 显示项目长期停滞，当前社区热度判断需要下调。",
    "- 如果 Open Issues 主要是低价值问题或重复问题，维护压力判断需要修正。",
    "- 如果项目已有成熟商业公司支持，进入壁垒可能显著高于元数据表现。",
    "",
    "## 11. 综合评分卡",
    "| 仓库 | 社区热度 | 开发者采用潜力 | 维护健康度 | 商业化潜力 | 差异化空间 | 综合建议 |",
    "| --- | ---: | ---: | ---: | ---: | ---: | --- |",
    ...repos.map((repo) => {
      const community = scoreCommunitySignal(repo, repos)
      const maintenance = Math.max(1, 10 - Math.round(repo.open_issues_count / Math.max(repo.stars, 1) * 1000))
      const adoption = Math.min(10, Math.max(1, Math.round((community + Math.min(10, repo.forks / 1000)) / 2)))
      const commercial = Math.min(10, Math.max(1, Math.round((community + adoption) / 2)))
      const differentiation = Math.max(1, 11 - community)
      return `| ${repo.full_name} | ${community} | ${adoption} | ${maintenance} | ${commercial} | ${differentiation} | 继续补充 README、Issue、Release 后复核 |`
    }),
    "",
    "## 12. 下一步行动计划",
    "- 24 小时：拉取 README、目录结构、Release、最近 Issues 和 PR，补齐能力边界与维护节奏。",
    "- 7 天：对重点项目生成逆向 PRD、架构分析、社区健康报告，并做二次横向对比。",
    "- 30 天：围绕 2-3 个机会缺口做用户访谈、原型验证和竞品替代性测试。",
  ].filter(Boolean).join("\n")
}

function scoreCommunitySignal(repo: RepoRecord, repos: RepoRecord[]) {
  const maxStars = Math.max(...repos.map((item) => item.stars), 1)
  const maxForks = Math.max(...repos.map((item) => item.forks), 1)
  const maxWatchers = Math.max(...repos.map((item) => item.watchers), 1)
  const score = (
    (repo.stars / maxStars) * 4 +
    (repo.forks / maxForks) * 3 +
    (repo.watchers / maxWatchers) * 2 +
    (repo.topics.length > 0 ? 1 : 0)
  )

  return Math.min(10, Math.max(1, Math.round(score)))
}

function dedupeRepos(repos: CompareRepoInput[]) {
  const seen = new Set<string>()
  return repos.filter((repo) => {
    const key = `${repo.owner}/${repo.name}`.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
