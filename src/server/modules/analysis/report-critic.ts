import { generateJsonWithLlm } from "@/src/server/lib/llm-provider"
import type { EvidencePack } from "./evidence-extractor"
import type { ReportLanguage } from "./prompt-builder"
import type { AnalysisSectionType } from "./types"

export interface ReportCritique {
  passed: boolean
  score: number
  issues: string[]
  rewrite_instructions: string[]
}

export async function critiqueReport(
  sectionType: AnalysisSectionType,
  report: Record<string, unknown>,
  evidencePack: EvidencePack,
  lang: ReportLanguage = "zh"
): Promise<ReportCritique> {
  const result = await generateJsonWithLlm({
    system: buildCriticSystemPrompt(lang),
    user: buildCriticPrompt(sectionType, report, evidencePack, lang),
    temperature: 0.05,
  })

  return normalizeCritique(result.content)
}

function buildCriticSystemPrompt(lang: ReportLanguage) {
  if (lang === "en") {
    return [
      "You are GitSight's commercial report quality reviewer.",
      "Your task is to critique the report, not rewrite it.",
      "Check for hallucinations, invalid evidence references, unsupported conclusions, vague content, missing risks, and weak commercial judgment.",
      "A report can be structurally complete and still fail if it does not help a paying user make a concrete product, technical, investment, or adoption decision.",
      "Only evaluate against evidence_catalog and evidence_pack. Do not introduce external knowledge.",
      "Return only valid JSON. Return all natural-language fields in English.",
    ].join("\n")
  }

  return [
    "你是 GitSight 的商业化报告质检专家。",
    "你的任务是审稿，不是重写报告。",
    "请检查报告是否存在幻觉、证据引用错误、把推断写成事实、内容空泛、关键风险缺失、商业判断不够可执行等问题。",
    "即使字段完整，只要报告不能帮助付费用户做出具体的产品、技术、投资或采用决策，也应判为不通过。",
    "只能基于 evidence_catalog 和 evidence_pack 评估，不要引入外部知识。",
    "只返回合法 JSON。所有自然语言字段使用简体中文。",
  ].join("\n")
}

function buildCriticPrompt(
  sectionType: AnalysisSectionType,
  report: Record<string, unknown>,
  evidencePack: EvidencePack,
  lang: ReportLanguage
) {
  return [
    lang === "en" ? `# Review Target: ${sectionType}` : `# 审稿对象：${sectionType}`,
    "",
    "# Evidence Pack",
    JSON.stringify(evidencePack),
    "",
    "# Report Draft",
    JSON.stringify(report),
    "",
    lang === "en" ? "# Output JSON Schema" : "# 输出 JSON Schema",
    JSON.stringify(buildCritiqueSchema(lang), null, 2),
    "",
    lang === "en" ? "# Review Criteria" : "# 审稿标准",
    ...buildReviewCriteria(lang),
  ].join("\n")
}

function buildCritiqueSchema(lang: ReportLanguage) {
  return {
    passed: false,
    score: 0,
    issues: [
      lang === "en"
        ? "Specific issue, must identify the field or conclusion"
        : "具体问题，必须指出字段或结论",
    ],
    rewrite_instructions: [
      lang === "en"
        ? "Concrete revision instruction for the rewrite model"
        : "给重写模型的具体修订指令",
    ],
  }
}

function buildReviewCriteria(lang: ReportLanguage) {
  if (lang === "en") {
    return [
      "1. score is 0-100. Commercially displayable reports must score at least 82.",
      "2. If the report contains evidence_refs that are not in evidence_catalog, it must fail.",
      "3. If conclusions lack evidence, use weak evidence, or over-infer, point it out.",
      "4. If the report lacks unknowns, evidence limits, or next validation steps, point it out.",
      "5. If the content is generic and lacks concrete paths, files, data, scenarios, or decisions, point it out.",
      "6. If the report merely repeats the README without second-order insight, point it out.",
      "7. If recommendations do not state who should act, what to do next, why now, and what evidence would change the recommendation, point it out.",
      "8. If numeric scores are not explained by evidence strength, missing data, and downside risk, point it out.",
      "9. If the report is suitable for paid users, passed=true; otherwise passed=false.",
    ]
  }

  return [
    "1. score 为 0-100，商业化可展示标准至少 82 分。",
    "2. 如果报告中存在不在 evidence_catalog 内的 evidence_refs，必须 failed。",
    "3. 如果结论没有证据支撑、证据过弱或过度推断，必须指出。",
    "4. 如果报告没有写未知项、证据限制或下一步验证项，必须指出。",
    "5. 如果内容泛泛而谈，缺少具体路径、文件、数据、场景或决策建议，必须指出。",
    "6. 如果报告只是复述 README，没有形成产品、技术、社区或贡献层面的二阶洞察，必须指出。",
    "7. 如果建议没有说明谁应该行动、下一步做什么、为什么现在做、什么证据会改变建议，必须指出。",
    "8. 如果数字评分没有结合证据强度、缺失数据和下行风险解释，必须指出。",
    "9. 如果可以展示给付费用户，passed=true；否则 passed=false。",
  ]
}

function normalizeCritique(content: Record<string, unknown>): ReportCritique {
  const score = typeof content.score === "number" ? content.score : Number(content.score || 0)
  const issues = toStringArray(content.issues)
  const rewriteInstructions = toStringArray(content.rewrite_instructions)

  return {
    passed: Boolean(content.passed) && score >= 82 && issues.length === 0,
    score: Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0,
    issues,
    rewrite_instructions: rewriteInstructions,
  }
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}
