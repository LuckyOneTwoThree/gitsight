import type { RepoRecord } from "./types"

export interface RepoIntelScore {
  total: number
  grade: string
  velocity: number
  community: number
  maturity: number
}

export function computeRepoIntelScore(repo: RepoRecord): RepoIntelScore {
  const velocity = computeVelocityDimension(repo)
  const community = computeCommunityDimension(repo)
  const maturity = computeMaturityDimension(repo)

  const total = Math.round(velocity * 0.4 + community * 0.35 + maturity * 0.25)
  const grade = scoreToGrade(total)

  return { total, grade, velocity, community, maturity }
}

// ── Velocity: 项目活跃度与增长势能 ──────────────────────────
// 基础分来自绝对 Star 规模（保证无增量数据时也有合理分数）
// 增量分来自短期 Star 增长（有数据时提供区分度）
function computeVelocityDimension(repo: RepoRecord): number {
  const totalStars = repo.stars || 0

  // 基础分：Star 绝对规模（0-50 分）
  // 100 stars → 20分, 1k → 30分, 10k → 40分, 50k+ → 50分
  const starBase = totalStars >= 50000 ? 50
    : totalStars >= 10000 ? 40 + Math.min(totalStars / 50000 * 10, 10)
    : totalStars >= 1000 ? 30 + Math.min(totalStars / 10000 * 10, 10)
    : totalStars >= 100 ? 20 + Math.min(totalStars / 1000 * 10, 10)
    : totalStars >= 10 ? 10 + Math.min(totalStars / 100 * 10, 10)
    : Math.min(totalStars / 10 * 10, 10)

  // 增量分：短期 Star 增长（0-30 分）
  const starsToday = repo.stars_today || 0
  const starsWeek = repo.stars_week || 0
  const starsMonth = repo.stars_month || 0

  const todayBonus = Math.min(starsToday / 5, 10)
  const weekBonus = Math.min(starsWeek / 20, 10)
  const monthBonus = Math.min(starsMonth / 50, 10)

  // Fork 活跃度（0-10 分）
  const forkBonus = Math.min(repo.forks / 200, 10)

  // Watcher 关注度（0-10 分）
  const watcherBonus = repo.stars > 0
    ? Math.min(repo.watchers / repo.stars * 50, 10)
    : 0

  return Math.min(100, Math.round(starBase + todayBonus + weekBonus + monthBonus + forkBonus + watcherBonus))
}

// ── Community: 社区健康度与参与度 ────────────────────────────
function computeCommunityDimension(repo: RepoRecord): number {
  // Fork/Star 比率：反映二次开发意愿（0-30 分）
  // 正常范围 0.1-0.5，0.3 以上为佳
  const forkRatio = repo.stars > 0
    ? Math.min(repo.forks / repo.stars, 0.5) / 0.3 * 30
    : 0

  // 贡献者规模（0-30 分）
  // 5人 → 15分, 20人 → 24分, 50人+ → 30分
  const contributorScore = repo.contributors_count >= 50 ? 30
    : repo.contributors_count >= 20 ? 24 + Math.min((repo.contributors_count - 20) / 30 * 6, 6)
    : repo.contributors_count >= 5 ? 15 + Math.min((repo.contributors_count - 5) / 15 * 9, 9)
    : repo.contributors_count >= 1 ? 8 + Math.min(repo.contributors_count / 5 * 7, 7)
    : 5 // 有项目但无贡献者数据时给基础分

  // Issue 健康度：open_issues/stars 比率越低越好（0-20 分）
  // 比率 < 0.01 为极佳，> 0.1 为较差
  const issueRatio = repo.stars > 0 ? repo.open_issues_count / repo.stars : 0.05
  const issueScore = issueRatio <= 0.01 ? 20
    : issueRatio <= 0.03 ? 16
    : issueRatio <= 0.05 ? 12
    : issueRatio <= 0.1 ? 8
    : 4

  // Watcher 活跃度（0-20 分）
  const watcherScore = repo.stars > 0
    ? Math.min(repo.watchers / repo.stars * 100, 20)
    : 0

  return Math.min(100, Math.round(forkRatio + contributorScore + issueScore + watcherScore))
}

// ── Maturity: 项目成熟度与稳定性 ─────────────────────────────
function computeMaturityDimension(repo: RepoRecord): number {
  // 项目年龄（0-35 分）
  // ≥2年 → 35, ≥1年 → 28, ≥6月 → 20, ≥3月 → 14, ≥1月 → 8
  const ageDays = repo.created_at
    ? (Date.now() - new Date(repo.created_at).getTime()) / (1000 * 60 * 60 * 24)
    : 0

  const ageScore = ageDays >= 730 ? 35
    : ageDays >= 365 ? 28 + Math.min((ageDays - 365) / 365 * 7, 7)
    : ageDays >= 180 ? 20 + Math.min((ageDays - 180) / 185 * 8, 8)
    : ageDays >= 90 ? 14 + Math.min((ageDays - 90) / 90 * 6, 6)
    : ageDays >= 30 ? 8 + Math.min((ageDays - 30) / 60 * 6, 6)
    : Math.min(ageDays / 30 * 8, 8)

  // 贡献者成熟度（0-25 分）
  // 10人 → 15分, 30人 → 20分, 50人+ → 25分
  const contributorMaturity = repo.contributors_count >= 50 ? 25
    : repo.contributors_count >= 30 ? 20 + Math.min((repo.contributors_count - 30) / 20 * 5, 5)
    : repo.contributors_count >= 10 ? 15 + Math.min((repo.contributors_count - 10) / 20 * 5, 5)
    : repo.contributors_count >= 3 ? 10 + Math.min(repo.contributors_count / 10 * 5, 5)
    : 8

  // Star 规模加分（0-20 分）
  // 1k → 10分, 10k → 16分, 50k+ → 20分
  const starMaturity = repo.stars >= 50000 ? 20
    : repo.stars >= 10000 ? 16 + Math.min((repo.stars - 10000) / 40000 * 4, 4)
    : repo.stars >= 1000 ? 10 + Math.min((repo.stars - 1000) / 9000 * 6, 6)
    : repo.stars >= 100 ? 5 + Math.min(repo.stars / 1000 * 5, 5)
    : Math.min(repo.stars / 100 * 5, 5)

  // License 加分（0-10 分）
  const hasLicense = repo.license && repo.license !== "NOASSERTION" && repo.license !== "NONE"
  const licenseScore = hasLicense ? 10 : 3

  // 分析加分
  const analysisBonus = repo.analysis_count > 0 ? 5 : 0

  // 惩罚项
  const forkPenalty = repo.is_fork ? -10 : 0
  const archivePenalty = repo.is_archived ? -20 : 0

  return Math.max(0, Math.min(100, Math.round(
    ageScore + contributorMaturity + starMaturity + licenseScore + analysisBonus + forkPenalty + archivePenalty
  )))
}

function scoreToGrade(score: number): string {
  if (score >= 85) return "A+"
  if (score >= 75) return "A"
  if (score >= 65) return "B"
  if (score >= 50) return "C"
  if (score >= 35) return "D"
  return "E"
}
