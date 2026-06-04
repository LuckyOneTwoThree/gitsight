export interface RepoRecord {
  id: number
  github_id: number
  full_name: string
  name: string
  owner: string
  owner_avatar_url: string | null
  description: string | null
  language: string | null
  stars: number
  forks: number
  open_issues_count: number
  watchers: number
  license: string | null
  topics: string[]
  homepage: string | null
  is_archived: boolean
  is_fork: boolean
  default_branch: string
  contributors_count: number
  source: "on_demand" | "trending_sync" | "seed"
  analysis_count: number
  last_analyzed_at: string | null
  synced_at: string | null
  stars_today: number
  stars_week: number
  stars_month: number
  velocity_score: number
  intel_score: number
  intel_grade: string
  trending_rank: number | null
  last_metrics_sync: string | null
  created_at: string
  updated_at: string
}

export interface ResolveRepoResult {
  repo: RepoRecord
  is_new: boolean
}

