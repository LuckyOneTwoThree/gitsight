import { readStore } from "@/src/server/lib/file-store"
import type { RepoRecord } from "@/src/server/modules/project/types"

export interface LandscapeProject {
  id: string
  name: string
  owner: string
  ownerAvatar: string
  description: string
  language: string
  stars: number
  forks: number
  starsWeek: number
  recentActivity: number
  communitySize: number
  topics: string[]
  techRoute: string | null
  aiSummary: string
}

export interface TechRouteInfo {
  name: string
  description: string
  representative: string
  keywords: string[]
}

export interface TrackSummaryData {
  name: string
  description: string
  techRoutes: TechRouteInfo[]
  stats: {
    totalProjects: number
    totalContributors: number
    weekGrowth: string
    avgStars: number
  }
  risingStars: { name: string; reason: string }[]
}

export interface LandscapeData {
  track: string
  projects: LandscapeProject[]
  summary: TrackSummaryData
}

interface TrackDefinition {
  name: string
  description: string
  exactTopics: string[]
  broadKeywords: string[]
  languageFilters: string[]
  techRoutes: TechRouteInfo[]
}

export const trackDefinitions: Record<string, TrackDefinition> = {
  "ai-ml": {
    name: "AI / ML",
    description: "AI/ML 赛道覆盖大语言模型、机器学习框架、模型训练与推理等核心方向。从基础模型到应用层，AI 正在重塑软件开发的每个环节。",
    exactTopics: ["ai", "llm", "machine-learning", "deep-learning", "gpt", "openai", "chatgpt", "gemini", "claude", "transformer", "diffusion", "stable-diffusion", "pytorch", "tensorflow", "huggingface"],
    broadKeywords: ["language model", "neural network", "deep learning", "machine learning"],
    languageFilters: [],
    techRoutes: [
      { name: "大模型推理", description: "模型推理与部署框架，优化推理性能和成本", representative: "vLLM / TGI", keywords: ["inference", "serving", "deploy", "vllm", "tgi"] },
      { name: "模型训练", description: "模型训练框架与工具链", representative: "PyTorch / HuggingFace", keywords: ["training", "fine-tuning", "lora", "peft", "pytorch", "huggingface"] },
      { name: "多模态", description: "图像、视频、语音等多模态 AI", representative: "Stable Diffusion / ComfyUI", keywords: ["diffusion", "image", "video", "audio", "multimodal", "vision"] },
    ],
  },
  "ai-agent": {
    name: "AI Agent",
    description: "AI Agent 赛道聚焦于大语言模型驱动的自主智能体框架。从工具调用到多步推理，从单 Agent 到多 Agent 协作，该赛道正在重新定义软件自动化的边界。",
    exactTopics: ["agent", "agents", "ai-agents", "ai-agent", "mcp", "langchain", "crewai", "autogen", "autogpt", "agent-skills", "skills", "claude-code", "codex", "cursor", "windsurf", "copilot"],
    broadKeywords: ["agent framework", "multi-agent", "autonomous agent"],
    languageFilters: [],
    techRoutes: [
      { name: "多 Agent 协作", description: "多智能体协作框架，支持角色分工与任务编排", representative: "CrewAI / AutoGen", keywords: ["multi-agent", "crew", "autogen", "collaboration", "orchestrat"] },
      { name: "MCP 工具链", description: "基于 Model Context Protocol 的工具集成", representative: "Claude Code / Codex", keywords: ["mcp", "tool", "skill", "claude-code", "codex", "cursor", "copilot"] },
      { name: "自主决策", description: "具备自主规划和执行能力的 Agent", representative: "AutoGPT / OpenHands", keywords: ["autonomous", "auto-gpt", "planning", "reasoning", "self-driving"] },
    ],
  },
  "rag": {
    name: "RAG / 知识检索",
    description: "RAG（检索增强生成）赛道涵盖向量数据库、嵌入模型、文档解析和检索策略等核心组件。随着企业对知识库问答需求的爆发，RAG 已成为 LLM 落地最成熟的技术范式之一。",
    exactTopics: ["rag", "vector", "embedding", "retrieval", "knowledge", "vector-database", "graph-database", "graph", "neo4j", "chroma", "qdrant", "pinecone", "llamaindex", "haystack"],
    broadKeywords: ["vector database", "retrieval augmented", "knowledge base", "semantic search"],
    languageFilters: [],
    techRoutes: [
      { name: "RAG 框架", description: "端到端 RAG 管线框架，集成检索与生成", representative: "LlamaIndex / Haystack", keywords: ["rag", "llamaindex", "haystack", "pipeline", "retrieval"] },
      { name: "向量数据库", description: "高性能向量存储与检索引擎", representative: "Chroma / Qdrant", keywords: ["vector", "chroma", "qdrant", "pinecone", "milvus", "weaviate"] },
      { name: "图数据库", description: "知识图谱存储与查询，支持关系推理", representative: "Neo4j / NebulaGraph", keywords: ["graph", "neo4j", "nebula", "knowledge-graph"] },
    ],
  },
  "frontend": {
    name: "前端 / UI",
    description: "前端赛道覆盖 UI 框架、组件库、设计系统和构建工具。React Server Components 和 Islands Architecture 正在重塑前端架构范式，AI 驱动的 UI 生成也在快速崛起。",
    exactTopics: ["react", "vue", "frontend", "ui", "css", "tailwindcss", "nextjs", "design-system", "design-systems", "ui-kit", "ui-components", "component-library", "react-components", "reactjs", "react-native", "radix-ui", "design", "ui-design", "design-tokens", "components", "front-end", "vite", "accessibility"],
    broadKeywords: [],
    languageFilters: [],
    techRoutes: [
      { name: "UI 组件库", description: "高质量 UI 组件库与设计系统", representative: "Radix UI / Shadcn", keywords: ["component", "ui-kit", "design-system", "radix", "shadcn"] },
      { name: "CSS / 样式", description: "CSS 框架与样式解决方案", representative: "Tailwind CSS / Panda", keywords: ["css", "tailwind", "style", "design-token"] },
      { name: "全栈框架", description: "集成前后端的全栈元框架", representative: "Next.js / Nuxt", keywords: ["nextjs", "nuxt", "remix", "sveltekit", "fullstack"] },
    ],
  },
  "devops": {
    name: "DevOps / 基础设施",
    description: "DevOps 赛道聚焦 CI/CD、容器编排、可观测性和基础设施即代码。云原生生态持续演进，平台工程和 GitOps 正在成为新的标准实践。",
    exactTopics: ["devops", "kubernetes", "docker", "ci-cd", "monitoring", "observability", "infrastructure", "terraform", "helm", "prometheus", "grafana"],
    broadKeywords: ["container orchestration", "continuous integration", "infrastructure as code"],
    languageFilters: [],
    techRoutes: [
      { name: "容器编排", description: "容器编排与调度平台", representative: "Kubernetes / Docker", keywords: ["kubernetes", "docker", "container", "helm", "pod"] },
      { name: "可观测性", description: "监控、日志与链路追踪", representative: "Prometheus / Grafana", keywords: ["monitoring", "observability", "prometheus", "grafana", "tracing", "logging"] },
      { name: "IaC / GitOps", description: "基础设施即代码与 GitOps 工作流", representative: "Terraform / ArgoCD", keywords: ["terraform", "gitops", "argocd", "infrastructure-as-code"] },
    ],
  },
  "database": {
    name: "数据库 / 存储",
    description: "数据库赛道覆盖关系型数据库、NoSQL、缓存和新型存储引擎。Serverless 数据库和向量数据库正在改变数据基础设施的格局。",
    exactTopics: ["database", "sql", "nosql", "cache", "storage", "redis", "postgresql", "mysql", "mongodb", "sqlite", "clickhouse", "supabase"],
    broadKeywords: ["database engine", "data storage", "query engine"],
    languageFilters: [],
    techRoutes: [
      { name: "关系型数据库", description: "SQL 数据库与新型关系型引擎", representative: "PostgreSQL / MySQL", keywords: ["sql", "postgresql", "mysql", "sqlite", "relational"] },
      { name: "NoSQL / 文档", description: "文档、键值和宽列存储", representative: "MongoDB / Redis", keywords: ["nosql", "mongodb", "redis", "document", "key-value", "cache"] },
      { name: "分析型引擎", description: "OLAP 与实时分析引擎", representative: "ClickHouse / DuckDB", keywords: ["olap", "analytics", "clickhouse", "duckdb", "columnar"] },
    ],
  },
  "dev-tools": {
    name: "编程工具",
    description: "编程工具赛道覆盖 IDE、CLI、代码质量和开发者体验。AI 编程助手正在重塑开发工作流，从代码补全到自动化测试全面渗透。",
    exactTopics: ["cli", "developer-tools", "ide", "editor", "linting", "neovim", "vscode", "terminal", "shell", "automation"],
    broadKeywords: ["developer tool", "command line", "code editor"],
    languageFilters: [],
    techRoutes: [
      { name: "AI 编程助手", description: "AI 驱动的代码生成与补全工具", representative: "Cursor / Copilot", keywords: ["copilot", "cursor", "ai-code", "code-assist", "code-completion"] },
      { name: "编辑器 / IDE", description: "代码编辑器与 IDE 框架", representative: "Neovim / VS Code", keywords: ["editor", "ide", "neovim", "vscode", "lsp"] },
      { name: "CLI / 终端", description: "命令行工具与终端增强", representative: "Starship / Zellij", keywords: ["cli", "terminal", "shell", "prompt", "tui"] },
    ],
  },
  "web3": {
    name: "Web3 / 区块链",
    description: "Web3 赛道覆盖区块链基础设施、DeFi 协议、智能合约框架和跨链桥接等方向。随着机构入场和监管明晰化，Web3 基础设施正在从实验走向生产级部署。",
    exactTopics: ["web3", "blockchain", "defi", "smart-contract", "ethereum", "solana", "crypto", "polymarket", "prediction-markets", "nft"],
    broadKeywords: ["decentralized", "blockchain protocol", "smart contract"],
    languageFilters: [],
    techRoutes: [
      { name: "DeFi / 预测市场", description: "去中心化金融与预测市场协议", representative: "Polymarket / Uniswap", keywords: ["defi", "polymarket", "prediction", "swap", "lending"] },
      { name: "链上基础设施", description: "节点客户端和链上基础设施", representative: "Ethereum / Solana", keywords: ["node", "rpc", "validator", "consensus", "ethereum", "solana"] },
      { name: "智能合约", description: "智能合约开发框架与工具", representative: "Foundry / Hardhat", keywords: ["smart-contract", "solidity", "foundry", "hardhat"] },
    ],
  },
}

export function matchTrack(repo: RepoRecord, trackKey: string): boolean {
  const track = trackDefinitions[trackKey]
  if (!track) return false

  const repoTopics = (repo.topics || []).map((t: string) => t.toLowerCase())
  const desc = (repo.description || "").toLowerCase()
  const name = repo.name.toLowerCase()

  const exactMatch = track.exactTopics.some((filter) =>
    repoTopics.includes(filter)
  )

  if (exactMatch) return true

  const broadMatch = track.broadKeywords.some((keyword) =>
    desc.includes(keyword) || name.includes(keyword)
  )

  if (broadMatch) return true

  if (track.languageFilters.length > 0 && repo.language) {
    return track.languageFilters.includes(repo.language.toLowerCase())
  }

  return false
}

function assignTechRoute(repo: RepoRecord, trackKey: string): string | null {
  const track = trackDefinitions[trackKey]
  if (!track || track.techRoutes.length === 0) return null

  const desc = (repo.description || "").toLowerCase()
  const repoTopics = (repo.topics || []).map((t: string) => t.toLowerCase())
  const topics = repoTopics.join(" ")
  const name = repo.name.toLowerCase()
  const text = `${desc} ${topics} ${name}`

  for (const route of track.techRoutes) {
    const matched = route.keywords.some((kw) => text.includes(kw))
    if (matched) return route.name
  }

  for (const route of track.techRoutes) {
    const topicOverlap = route.keywords.some((kw) =>
      repoTopics.some((t) => t.includes(kw) || kw.includes(t))
    )
    if (topicOverlap) return route.name
  }

  if (trackKey === "frontend") {
    if (repoTopics.includes("css") || repoTopics.includes("tailwindcss") || repoTopics.includes("design-tokens")) return "CSS / 样式"
    if (repoTopics.includes("nextjs") || repoTopics.includes("nuxt") || repoTopics.includes("remix")) return "全栈框架"
    return "UI 组件库"
  }
  if (trackKey === "ai-ml") {
    if (repoTopics.includes("pytorch") || repoTopics.includes("tensorflow") || repoTopics.includes("huggingface")) return "模型训练"
    if (repoTopics.includes("diffusion") || repoTopics.includes("stable-diffusion")) return "多模态"
    return "大模型推理"
  }
  if (trackKey === "ai-agent") {
    if (repoTopics.includes("mcp") || repoTopics.includes("skills") || repoTopics.includes("claude-code") || repoTopics.includes("codex") || repoTopics.includes("cursor")) return "MCP 工具链"
    if (repoTopics.includes("multi-agent") || repoTopics.includes("crewai") || repoTopics.includes("autogen")) return "多 Agent 协作"
    return "自主决策"
  }
  if (trackKey === "rag") {
    if (repoTopics.includes("vector") || repoTopics.includes("chroma") || repoTopics.includes("qdrant")) return "向量数据库"
    if (repoTopics.includes("graph") || repoTopics.includes("neo4j")) return "图数据库"
    return "RAG 框架"
  }
  if (trackKey === "devops") {
    if (repoTopics.includes("kubernetes") || repoTopics.includes("docker") || repoTopics.includes("helm")) return "容器编排"
    if (repoTopics.includes("monitoring") || repoTopics.includes("observability") || repoTopics.includes("prometheus")) return "可观测性"
    return "IaC / GitOps"
  }
  if (trackKey === "database") {
    if (repoTopics.includes("sql") || repoTopics.includes("postgresql") || repoTopics.includes("mysql") || repoTopics.includes("sqlite")) return "关系型数据库"
    if (repoTopics.includes("nosql") || repoTopics.includes("mongodb") || repoTopics.includes("redis") || repoTopics.includes("cache")) return "NoSQL / 文档"
    return "分析型引擎"
  }
  if (trackKey === "dev-tools") {
    if (repoTopics.includes("cli") || repoTopics.includes("terminal") || repoTopics.includes("shell")) return "CLI / 终端"
    if (repoTopics.includes("editor") || repoTopics.includes("ide") || repoTopics.includes("neovim")) return "编辑器 / IDE"
    return "AI 编程助手"
  }
  if (trackKey === "web3") {
    if (repoTopics.includes("defi") || repoTopics.includes("polymarket") || repoTopics.includes("prediction-markets")) return "DeFi / 预测市场"
    if (repoTopics.includes("smart-contract") || repoTopics.includes("solidity")) return "智能合约"
    return "链上基础设施"
  }

  return track.techRoutes[0].name
}

function computeRecentActivity(repo: RepoRecord): number {
  const base = Math.min(repo.open_issues_count / 10, 30) + Math.min(repo.forks / 100, 30)
  return Math.min(Math.round(base + (repo.stars > 1000 ? 20 : repo.stars > 100 ? 10 : 0)), 100)
}

export function getLandscapeData(trackKey: string): LandscapeData {
  const store = readStore()
  const track = trackDefinitions[trackKey]

  if (!track) {
    return {
      track: trackKey,
      projects: [],
      summary: {
        name: "未知赛道",
        description: "",
        techRoutes: [],
        stats: { totalProjects: 0, totalContributors: 0, weekGrowth: "0%", avgStars: 0 },
        risingStars: [],
      },
    }
  }

  const matchedRepos = store.repos
    .filter((repo) => matchTrack(repo, trackKey))
    .sort((a, b) => b.stars - a.stars)

  const projects: LandscapeProject[] = matchedRepos.map((repo) => {
    return {
      id: String(repo.id),
      name: repo.name,
      owner: repo.owner,
      ownerAvatar: `https://github.com/${repo.owner}.png`,
      description: repo.description || "",
      language: repo.language || "Unknown",
      stars: repo.stars,
      forks: repo.forks,
      starsWeek: repo.stars_week,
      recentActivity: computeRecentActivity(repo),
      communitySize: repo.watchers + repo.forks,
      topics: repo.topics || [],
      techRoute: assignTechRoute(repo, trackKey),
      aiSummary: repo.description || `${repo.name} - ${repo.language || "多语言"} 项目`,
    }
  })

  const totalStars = matchedRepos.reduce((sum, r) => sum + r.stars, 0)
  const avgStars = matchedRepos.length > 0 ? Math.round(totalStars / matchedRepos.length) : 0
  const totalContributors = matchedRepos.reduce((sum, r) => sum + r.watchers + r.forks, 0)

  const totalStarsWeek = projects.reduce((sum, p) => sum + p.starsWeek, 0)
  const weekGrowthPct = totalStars > 0
    ? `+${((totalStarsWeek / totalStars) * 100).toFixed(1)}%`
    : "0%"

  const risingStars = [...projects]
    .sort((a, b) => b.starsWeek - a.starsWeek)
    .slice(0, 3)
    .map((p) => ({
      name: `${p.owner}/${p.name}`,
      reason: `↑${p.starsWeek.toLocaleString()}/周 · ★${p.stars.toLocaleString()} · ${p.language}`,
    }))

  return {
    track: trackKey,
    projects,
    summary: {
      name: track.name,
      description: track.description,
      techRoutes: track.techRoutes,
      stats: {
        totalProjects: matchedRepos.length,
        totalContributors,
        weekGrowth: weekGrowthPct,
        avgStars,
      },
      risingStars,
    },
  }
}

export function getAvailableTracks(): { value: string; label: string; projectCount: number }[] {
  const store = readStore()

  return Object.entries(trackDefinitions).map(([key, track]) => {
    const count = store.repos.filter((repo) => matchTrack(repo, key)).length
    return { value: key, label: track.name, projectCount: count }
  })
}

export interface RelatedTrack {
  key: string
  name: string
  description: string
  projectCount: number
  trending: boolean
  matchedTopics: string[]
}

export function getRelatedTracks(topics: string[]): RelatedTrack[] {
  const store = readStore()
  const inputTopics = topics.map((t) => t.toLowerCase())

  const scored: Array<{ key: string; track: TrackDefinition; score: number; matched: string[] }> = []

  for (const [key, track] of Object.entries(trackDefinitions)) {
    const matched: string[] = []
    for (const topic of inputTopics) {
      if (track.exactTopics.includes(topic)) {
        matched.push(topic)
      }
    }
    for (const topic of inputTopics) {
      if (!matched.includes(topic)) {
        const broadHit = track.broadKeywords.some((kw) => topic.includes(kw) || kw.includes(topic))
        if (broadHit) matched.push(topic)
      }
    }

    if (matched.length === 0) continue

    const projectCount = store.repos.filter((repo) => matchTrack(repo, key)).length
    const trending = projectCount > 50

    scored.push({ key, track, score: matched.length, matched })
  }

  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, 4).map(({ key, track, matched, score }) => ({
    key,
    name: track.name,
    description: track.description.slice(0, 60) + "...",
    projectCount: store.repos.filter((repo) => matchTrack(repo, key)).length,
    trending: score >= 2,
    matchedTopics: matched,
  }))
}
