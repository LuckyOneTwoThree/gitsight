import { getServerEnv } from "@/src/server/lib/env"

export interface GitHubSearchResult {
  id: number
  name: string
  full_name: string
  owner: {
    login: string
    avatar_url: string
  }
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  watchers_count: number
  license: {
    key: string
    spdx_id: string
    name: string
  } | null
  topics: string[]
  homepage: string | null
  archived: boolean
  fork: boolean
  default_branch: string
  created_at: string
  updated_at: string
  pushed_at: string
}

interface GitHubSearchResponse {
  total_count: number
  incomplete_results: boolean
  items: GitHubSearchResult[]
}

export async function searchGitHubRepos(
  query: string,
  limit: number = 20
): Promise<GitHubSearchResult[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "GitSight-MVP",
  }

  if (getServerEnv().githubToken) {
    headers.Authorization = `Bearer ${getServerEnv().githubToken}`
  }

  const perPage = Math.min(limit, 100)
  const url = `${getServerEnv().githubApiBaseUrl}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}`

  try {
    const response = await fetch(url, {
      headers,
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      const text = await response.text()
      console.error(`[semantic-search] GitHub search failed: ${response.status} ${text}`)
      return []
    }

    const data = (await response.json()) as GitHubSearchResponse
    return data.items || []
  } catch (error) {
    console.error(`[semantic-search] GitHub search fetch error for "${query}":`, error instanceof Error ? error.message : error)
    return []
  }
}

/**
 * 按 topic 发现热门项目，用于补充 Trending 数据源。
 * 对每个 topic 构造 GitHub Search 查询，返回去重后的结果。
 */
export async function discoverReposByTopics(
  topics: string[],
  options?: {
    minStars?: number
    language?: string
    perTopic?: number
  }
): Promise<GitHubSearchResult[]> {
  const { minStars = 100, language, perTopic = 30 } = options || {}
  const allResults: GitHubSearchResult[] = []
  const seen = new Set<string>()

  for (const topic of topics) {
    let query = `topic:${topic}`
    if (minStars > 0) query += ` stars:>=${minStars}`
    if (language) query += ` language:${language}`
    query += ` fork:false`

    const results = await searchGitHubRepos(query, perTopic)
    for (const item of results) {
      if (!seen.has(item.full_name)) {
        seen.add(item.full_name)
        allResults.push(item)
      }
    }

    // GitHub Search API 限流：认证 30 次/分钟，未认证 10 次/分钟
    // 每次 topic 请求间隔 2.5 秒，确保不超限
    await sleep(2500)
  }

  return allResults
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
