import { getServerEnv } from "@/src/server/lib/env"
import type { RepoRecord } from "./types"

interface GitHubRepositoryResponse {
  id: number
  full_name: string
  name: string
  owner: {
    login: string
  }
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  watchers_count: number
  license: {
    spdx_id: string | null
    key: string | null
    name: string | null
  } | null
  topics?: string[]
  homepage: string | null
  archived: boolean
  fork: boolean
  default_branch: string
}

export class GitHubRepositoryNotFoundError extends Error {
  constructor(fullName: string) {
    super(`GitHub repository not found: ${fullName}`)
    this.name = "GitHubRepositoryNotFoundError"
  }
}

export async function fetchGitHubRepo(owner: string, name: string): Promise<RepoRecord> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "GitSight-MVP",
    ...(getServerEnv().githubToken
      ? {
          Authorization: `Bearer ${getServerEnv().githubToken}`,
        }
      : {}),
  }

  const response = await fetch(`${getServerEnv().githubApiBaseUrl}/repos/${owner}/${name}`, {
    headers,
    next: {
      revalidate: 0,
    },
  })

  if (response.status === 404) {
    throw new GitHubRepositoryNotFoundError(`${owner}/${name}`)
  }

  if (!response.ok) {
    throw new Error(`GitHub API request failed with status ${response.status}`)
  }

  const data = (await response.json()) as GitHubRepositoryResponse
  const now = new Date().toISOString()

  let contributorsCount = 0
  try {
    const contributorsResponse = await fetch(
      `${getServerEnv().githubApiBaseUrl}/repos/${owner}/${name}/contributors?per_page=1&anon=true`,
      { headers, next: { revalidate: 0 } }
    )
    if (contributorsResponse.ok) {
      const linkHeader = contributorsResponse.headers.get("link") || ""
      const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/)
      if (lastPageMatch) {
        contributorsCount = parseInt(lastPageMatch[1], 10)
      } else {
        const contributors = await contributorsResponse.json()
        contributorsCount = Array.isArray(contributors) ? contributors.length : 0
      }
    }
  } catch {
    // contributors is optional, don't fail the whole request
  }

  return {
    id: data.id,
    github_id: data.id,
    full_name: data.full_name,
    name: data.name,
    owner: data.owner.login,
    description: data.description,
    language: data.language,
    stars: data.stargazers_count,
    forks: data.forks_count,
    open_issues_count: data.open_issues_count,
    watchers: data.watchers_count,
    license: data.license?.spdx_id || data.license?.key || data.license?.name || null,
    topics: data.topics || [],
    homepage: data.homepage || null,
    is_archived: data.archived,
    is_fork: data.fork,
    default_branch: data.default_branch,
    contributors_count: contributorsCount,
    source: "on_demand",
    analysis_count: 0,
    last_analyzed_at: null,
    synced_at: now,
    stars_today: 0,
    stars_week: 0,
    stars_month: 0,
    velocity_score: 0,
    intel_score: 0,
    intel_grade: "D",
    trending_rank: null,
    last_metrics_sync: null,
    created_at: now,
    updated_at: now,
  }
}

