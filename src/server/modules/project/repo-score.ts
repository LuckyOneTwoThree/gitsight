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

function computeVelocityDimension(repo: RepoRecord): number {
  const starsToday = repo.stars_today || 0
  const starsWeek = repo.stars_week || 0
  const starsMonth = repo.stars_month || 0
  const totalStars = repo.stars || 1

  // Daily growth rate (capped at 5% = 100 score)
  const dailyGrowthRate = (starsToday / totalStars) * 100
  const dailyScore = Math.min(dailyGrowthRate / 5 * 100, 100)

  // Weekly growth rate (capped at 20% = 100 score)
  const weeklyGrowthRate = (starsWeek / totalStars) * 100
  const weeklyScore = Math.min(weeklyGrowthRate / 20 * 100, 100)

  // Absolute velocity: stars per day this week
  const absoluteVelocity = Math.min(starsWeek / 7 / 100 * 100, 100)

  return Math.min(100, Math.round(dailyScore * 0.3 + weeklyScore * 0.3 + absoluteVelocity * 0.4))
}

function computeCommunityDimension(repo: RepoRecord): number {
  const issueRatio = repo.stars > 0
    ? Math.max(0, 1 - repo.open_issues_count / repo.stars) * 100
    : 50

  const forkRatio = repo.stars > 0
    ? Math.min(repo.forks / repo.stars, 0.5) / 0.5 * 100
    : 0

  const watcherScore = repo.stars > 0
    ? Math.min(repo.watchers / repo.stars * 10, 100)
    : 0

  const contributorScore = Math.min(repo.contributors_count / 50 * 100, 100)

  return Math.round(issueRatio * 0.25 + forkRatio * 0.25 + watcherScore * 0.2 + contributorScore * 0.3)
}

function computeMaturityDimension(repo: RepoRecord): number {
  const ageDays = repo.created_at
    ? (Date.now() - new Date(repo.created_at).getTime()) / (1000 * 60 * 60 * 24)
    : 0

  const ageScore = ageDays >= 1460 ? 100 : ageDays >= 730 ? 80 : ageDays >= 365 ? 60 : ageDays >= 180 ? 40 : ageDays >= 30 ? 20 : 10

  const contributorMaturity = Math.min(repo.contributors_count / 20 * 100, 100)

  const analysisBonus = repo.analysis_count > 0 ? 10 : 0

  const forkPenalty = repo.is_fork ? -15 : 0
  const archivePenalty = repo.is_archived ? -30 : 0

  return Math.max(0, Math.min(100, Math.round(ageScore * 0.4 + contributorMaturity * 0.3 + analysisBonus + forkPenalty + archivePenalty)))
}

function scoreToGrade(score: number): string {
  if (score >= 90) return "A+"
  if (score >= 80) return "A"
  if (score >= 70) return "B"
  if (score >= 60) return "C"
  return "D"
}
