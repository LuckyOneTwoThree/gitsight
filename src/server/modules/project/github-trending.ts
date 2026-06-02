import type { RepoRecord } from "./types"

export interface TrendingRepo {
  fullName: string
  name: string
  owner: string
  description: string
  language: string | null
  stars: number
  starsToday: number
  topics: string[]
}

export async function fetchGitHubTrending(
  since: "daily" | "weekly" | "monthly" = "weekly",
  language = ""
): Promise<TrendingRepo[]> {
  const langParam = language ? `/${language}` : ""
  const url = `https://github.com/trending${langParam}?since=${since}`

  const response = await fetch(url, {
    headers: {
      "User-Agent": "RepoIntel-MVP/1.0 (GitHub Trending Fetcher)",
      Accept: "text/html",
    },
    next: {
      revalidate: 0,
    },
  })

  if (!response.ok) {
    throw new Error(`GitHub Trending request failed with status ${response.status}`)
  }

  const html = await response.text()
  return parseTrendingHtml(html)
}

function parseTrendingHtml(html: string): TrendingRepo[] {
  const repos: TrendingRepo[] = []
  const articleRegex = /<article[^>]*class="[^"]*Box-row[^"]*"[^>]*>([\s\S]*?)<\/article>/gi
  let match: RegExpExecArray | null

  while ((match = articleRegex.exec(html)) !== null) {
    const article = match[1]

    const h2Match = article.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)
    if (!h2Match) continue
    const repoHrefMatch = h2Match[1].match(/href="\/([^"]+?)"/)
    if (!repoHrefMatch) continue
    const fullName = repoHrefMatch[1].replace(/\/$/, "")

    const [owner, name] = fullName.split("/")
    if (!owner || !name) continue

    const descMatch = article.match(/<p[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/)
    const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : ""

    const langMatch = article.match(/<span[^>]*itemprop="programmingLanguage"[^>]*>([\s\S]*?)<\/span>/)
    const language = langMatch ? langMatch[1].trim() : null

    const starsDeltaMatch = article.match(/([\d,]+)\s*stars?\s*this\s*(week|month|day)/i)
      || article.match(/([\d,]+)\s*stars?\s*today/i)
    const starsToday = starsDeltaMatch ? parseInt(starsDeltaMatch[1].replace(/,/g, ""), 10) : 0

    let stars = 0
    const stargazersMatches = [...article.matchAll(/stargazers[^>]*>([\s\S]*?)<\/a>/gi)]
    for (const m of stargazersMatches) {
      const nums = m[1].replace(/<[^>]+>/g, "").trim()
      const parsed = parseInt(nums.replace(/,/g, ""), 10)
      if (!isNaN(parsed) && parsed > stars) stars = parsed
    }

    const topicMatches = [...article.matchAll(/<a[^>]*class="[^"]*topic-tag[^"]*"[^>]*>([\s\S]*?)<\/a>/g)]
    const topics = topicMatches.map((m) => m[1].trim()).filter(Boolean)

    repos.push({
      fullName,
      name,
      owner,
      description,
      language,
      stars,
      starsToday,
      topics,
    })
  }

  return repos
}

export function trendingRepoToRepoRecord(trending: TrendingRepo, existingRepo: RepoRecord | null, since: "daily" | "weekly" | "monthly" = "weekly"): RepoRecord {
  const now = new Date().toISOString()

  return {
    id: existingRepo?.id || hashRepoId(trending.fullName),
    github_id: existingRepo?.github_id || hashRepoId(trending.fullName),
    full_name: trending.fullName,
    name: trending.name,
    owner: trending.owner,
    description: trending.description || existingRepo?.description || null,
    language: trending.language || existingRepo?.language || null,
    stars: trending.stars || existingRepo?.stars || 0,
    forks: existingRepo?.forks || 0,
    open_issues_count: existingRepo?.open_issues_count || 0,
    watchers: existingRepo?.watchers || 0,
    license: existingRepo?.license || null,
    topics: trending.topics.length ? trending.topics : (existingRepo?.topics || []),
    homepage: existingRepo?.homepage || null,
    is_archived: existingRepo?.is_archived || false,
    is_fork: existingRepo?.is_fork || false,
    default_branch: existingRepo?.default_branch || "main",
    contributors_count: existingRepo?.contributors_count || 0,
    source: "trending_sync" as const,
    analysis_count: existingRepo?.analysis_count || 0,
    last_analyzed_at: existingRepo?.last_analyzed_at || null,
    synced_at: existingRepo?.synced_at || null,
    stars_today: since === "daily" ? trending.starsToday : (existingRepo?.stars_today || 0),
    stars_week: since === "weekly" ? trending.starsToday : (existingRepo?.stars_week || 0),
    stars_month: since === "monthly" ? trending.starsToday : (existingRepo?.stars_month || 0),
    velocity_score: existingRepo?.velocity_score || 0,
    intel_score: existingRepo?.intel_score || 0,
    intel_grade: existingRepo?.intel_grade || "D",
    trending_rank: existingRepo?.trending_rank || null,
    last_metrics_sync: now,
    created_at: existingRepo?.created_at || now,
    updated_at: now,
  }
}

function hashRepoId(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash || 1
}
