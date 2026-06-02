export interface QualityBadge {
  score: number
  passed: boolean
  evidenceRate: string
  confidenceDistribution: { high: number; medium: number; low: number }
  hasUnknowns: boolean
  critiqueScore: number | null
  analyzed: boolean
}

export function extractQualityBadge(content: Record<string, unknown>): QualityBadge | null {
  const meta = content._meta as Record<string, unknown> | undefined

  const quality = meta?.quality as Record<string, unknown> | undefined
  const critique = meta?.critique as Record<string, unknown> | undefined

  if (!quality) return null

  const qualityScore = typeof quality.score === "number" ? quality.score : 0
  const qualityPassed = Boolean(quality.passed)
  const critiqueScore = typeof critique?.score === "number" ? critique.score : null

  const metrics = quality.metrics as Record<string, unknown> | undefined

  const evidenceRefsCount = typeof metrics?.evidence_refs_count === "number"
    ? metrics.evidence_refs_count
    : 0
  const invalidRefsCount = typeof metrics?.invalid_evidence_refs_count === "number"
    ? metrics.invalid_evidence_refs_count
    : 0
  const confidenceCount = typeof metrics?.confidence_count === "number"
    ? metrics.confidence_count
    : 0
  const hasUnknowns = Boolean(metrics?.unknowns_or_limits_present)

  const totalClaims = Math.max(evidenceRefsCount, 1)
  const validRefs = evidenceRefsCount - invalidRefsCount
  const evidenceRate = `${validRefs}/${totalClaims}`

  const highConf = Math.round(confidenceCount * 0.6)
  const medConf = Math.round(confidenceCount * 0.3)
  const lowConf = confidenceCount - highConf - medConf

  return {
    score: qualityScore,
    passed: qualityPassed,
    evidenceRate,
    confidenceDistribution: { high: highConf, medium: medConf, low: lowConf },
    hasUnknowns,
    critiqueScore,
    analyzed: true,
  }
}
