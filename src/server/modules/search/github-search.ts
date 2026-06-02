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
    "User-Agent": "RepoIntel-MVP",
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
