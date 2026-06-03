import { getServerEnv } from "@/src/server/lib/env"
import type { RepoRecord } from "./types"

export interface GitHubRepoContext {
  repo: RepoRecord
  readme: string | null
  tree: string[]
  configFiles: Array<{
    path: string
    content: string
  }>
  sourceFiles: Array<{
    path: string
    content: string
  }>
  ciFiles: Array<{
    path: string
    content: string
  }>
  releases: GitHubReleaseSummary[]
  issues: GitHubIssueSummary[]
  pullRequests: GitHubPullRequestSummary[]
  contributors: GitHubContributorSummary[]
  warnings: string[]
}

export interface GitHubReleaseSummary {
  tag_name: string
  name: string | null
  published_at: string | null
  prerelease: boolean
  draft: boolean
  body: string | null
}

export interface GitHubIssueSummary {
  number: number
  title: string
  state: string
  labels: string[]
  comments: number
  created_at: string
  updated_at: string
}

export interface GitHubPullRequestSummary {
  number: number
  title: string
  state: string
  draft: boolean
  comments: number
  created_at: string
  updated_at: string
  merged_at: string | null
}

export interface GitHubContributorSummary {
  login: string
  contributions: number
  type: string
}

interface GitHubReadmeResponse {
  content?: string
  encoding?: string
}

interface GitHubTreeResponse {
  tree?: Array<{
    path?: string
    type?: string
  }>
}

interface GitHubReleaseResponse {
  tag_name?: string
  name?: string | null
  published_at?: string | null
  prerelease?: boolean
  draft?: boolean
  body?: string | null
}

interface GitHubIssueResponse {
  number?: number
  title?: string
  state?: string
  labels?: Array<{ name?: string }>
  comments?: number
  created_at?: string
  updated_at?: string
  pull_request?: unknown
}

interface GitHubPullRequestResponse {
  number?: number
  title?: string
  state?: string
  draft?: boolean
  comments?: number
  created_at?: string
  updated_at?: string
  merged_at?: string | null
}

interface GitHubContributorResponse {
  login?: string
  contributions?: number
  type?: string
}

const importantConfigPaths = [
  "package.json",
  "pnpm-workspace.yaml",
  "turbo.json",
  "next.config.js",
  "next.config.mjs",
  "vite.config.ts",
  "tsconfig.json",
  "pyproject.toml",
  "requirements.txt",
  "go.mod",
  "Cargo.toml",
  "pom.xml",
  "build.gradle",
  "Makefile",
  "docker-compose.yml",
  "Dockerfile",
  ".eslintrc.json",
  ".eslintrc.js",
  ".eslintrc.cjs",
  "eslint.config.js",
  "eslint.config.mjs",
  ".prettierrc",
  ".prettierrc.json",
  "prettier.config.js",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  ".github/dependabot.yml",
  "renovate.json",
]

const importantCiPathPatterns = [
  /^\.github\/workflows\/[^/]+\.ya?ml$/,
  /^\.github\/actions\//,
  /^\.circleci\/config\.yml$/,
  /^\.gitlab-ci\.ya?ml$/,
  /^azure-pipelines\.ya?ml$/,
]

export async function collectGitHubRepoContext(repo: RepoRecord): Promise<GitHubRepoContext> {
  const warnings: string[] = []
  const [readmeResult, treeResult] = await Promise.allSettled([
    fetchReadme(repo.owner, repo.name),
    fetchTree(repo.owner, repo.name, repo.default_branch),
  ])

  const readme = readmeResult.status === "fulfilled" ? readmeResult.value : null
  if (readmeResult.status === "rejected") {
    warnings.push("README could not be fetched from GitHub.")
  }

  const tree = treeResult.status === "fulfilled" ? treeResult.value : []
  if (treeResult.status === "rejected") {
    warnings.push("Repository tree could not be fetched from GitHub.")
  }

  const configFiles = await fetchConfigFiles(repo.owner, repo.name, tree)
  if (configFiles.length === 0) {
    warnings.push("No key config files were available for analysis.")
  }

  const [sourceFilesResult, ciFilesResult, releasesResult, issuesResult, pullRequestsResult, contributorsResult] =
    await Promise.allSettled([
      fetchSourceFiles(repo.owner, repo.name, tree),
      fetchCiFiles(repo.owner, repo.name, tree),
      fetchReleases(repo.owner, repo.name),
      fetchIssues(repo.owner, repo.name),
      fetchPullRequests(repo.owner, repo.name),
      fetchContributors(repo.owner, repo.name),
    ])

  const sourceFiles = sourceFilesResult.status === "fulfilled" ? sourceFilesResult.value : []
  if (sourceFilesResult.status === "rejected") {
    warnings.push("Core source files could not be fetched from GitHub.")
  }

  const ciFiles = ciFilesResult.status === "fulfilled" ? ciFilesResult.value : []
  if (ciFilesResult.status === "rejected") {
    warnings.push("CI configuration files could not be fetched from GitHub.")
  }

  const releases = releasesResult.status === "fulfilled" ? releasesResult.value : []
  if (releasesResult.status === "rejected") {
    warnings.push("Release history could not be fetched from GitHub.")
  }

  const issues = issuesResult.status === "fulfilled" ? issuesResult.value : []
  if (issuesResult.status === "rejected") {
    warnings.push("Recent issues could not be fetched from GitHub.")
  }

  const pullRequests = pullRequestsResult.status === "fulfilled" ? pullRequestsResult.value : []
  if (pullRequestsResult.status === "rejected") {
    warnings.push("Recent pull requests could not be fetched from GitHub.")
  }

  const contributors = contributorsResult.status === "fulfilled" ? contributorsResult.value : []
  if (contributorsResult.status === "rejected") {
    warnings.push("Contributor summary could not be fetched from GitHub.")
  }

  return {
    repo,
    readme,
    tree: tree.slice(0, 200),
    configFiles,
    sourceFiles,
    ciFiles,
    releases,
    issues,
    pullRequests,
    contributors,
    warnings,
  }
}

async function fetchReadme(owner: string, name: string) {
  const response = await githubFetch(`/repos/${owner}/${name}/readme`)
  if (!response.ok) {
    throw new Error(`README request failed with status ${response.status}`)
  }

  const payload = (await response.json()) as GitHubReadmeResponse
  if (!payload.content || payload.encoding !== "base64") return null

  return Buffer.from(payload.content, "base64").toString("utf8").slice(0, 24000)
}

async function fetchTree(owner: string, name: string, branch: string) {
  const response = await githubFetch(`/repos/${owner}/${name}/git/trees/${branch}?recursive=1`)
  if (!response.ok) {
    throw new Error(`Tree request failed with status ${response.status}`)
  }

  const payload = (await response.json()) as GitHubTreeResponse
  return (payload.tree || [])
    .filter((item) => item.type === "blob" && item.path)
    .map((item) => item.path!)
}

async function fetchConfigFiles(owner: string, name: string, tree: string[]) {
  const selectedPaths = importantConfigPaths.filter((path) => tree.includes(path)).slice(0, 12)
  return fetchTextFiles(owner, name, selectedPaths, 8000)
}

async function fetchSourceFiles(owner: string, name: string, tree: string[]) {
  const selectedPaths = selectSourceFilePaths(tree)
  return fetchTextFiles(owner, name, selectedPaths, 6000)
}

async function fetchCiFiles(owner: string, name: string, tree: string[]) {
  const selectedPaths = tree
    .filter((path) => importantCiPathPatterns.some((pattern) => pattern.test(path)))
    .slice(0, 8)
  return fetchTextFiles(owner, name, selectedPaths, 5000)
}

async function fetchTextFiles(owner: string, name: string, paths: string[], maxContentLength: number) {
  const results = await Promise.allSettled(
    paths.map(async (path) => ({
      path,
      content: await fetchRawFile(owner, name, path),
    }))
  )

  return results
    .filter((result): result is PromiseFulfilledResult<{ path: string; content: string }> => {
      return result.status === "fulfilled" && result.value.content.trim().length > 0
    })
    .map((result) => ({
      path: result.value.path,
      content: result.value.content.slice(0, maxContentLength),
    }))
}

async function fetchReleases(owner: string, name: string): Promise<GitHubReleaseSummary[]> {
  const response = await githubFetch(`/repos/${owner}/${name}/releases?per_page=12`)
  if (!response.ok) {
    throw new Error(`Releases request failed with status ${response.status}`)
  }

  const payload = (await response.json()) as GitHubReleaseResponse[]
  return payload.map((release) => ({
    tag_name: release.tag_name || "unknown",
    name: release.name || null,
    published_at: release.published_at || null,
    prerelease: Boolean(release.prerelease),
    draft: Boolean(release.draft),
    body: release.body ? release.body.slice(0, 1200) : null,
  }))
}

async function fetchIssues(owner: string, name: string): Promise<GitHubIssueSummary[]> {
  const response = await githubFetch(`/repos/${owner}/${name}/issues?state=all&sort=updated&direction=desc&per_page=40`)
  if (!response.ok) {
    throw new Error(`Issues request failed with status ${response.status}`)
  }

  const payload = (await response.json()) as GitHubIssueResponse[]
  return payload
    .filter((issue) => !issue.pull_request)
    .slice(0, 30)
    .map((issue) => ({
      number: issue.number || 0,
      title: issue.title || "Untitled issue",
      state: issue.state || "unknown",
      labels: (issue.labels || []).map((label) => label.name).filter((label): label is string => Boolean(label)),
      comments: issue.comments || 0,
      created_at: issue.created_at || "",
      updated_at: issue.updated_at || "",
    }))
}

async function fetchPullRequests(owner: string, name: string): Promise<GitHubPullRequestSummary[]> {
  const response = await githubFetch(`/repos/${owner}/${name}/pulls?state=all&sort=updated&direction=desc&per_page=30`)
  if (!response.ok) {
    throw new Error(`Pull requests request failed with status ${response.status}`)
  }

  const payload = (await response.json()) as GitHubPullRequestResponse[]
  return payload.map((pullRequest) => ({
    number: pullRequest.number || 0,
    title: pullRequest.title || "Untitled pull request",
    state: pullRequest.state || "unknown",
    draft: Boolean(pullRequest.draft),
    comments: pullRequest.comments || 0,
    created_at: pullRequest.created_at || "",
    updated_at: pullRequest.updated_at || "",
    merged_at: pullRequest.merged_at || null,
  }))
}

async function fetchContributors(owner: string, name: string): Promise<GitHubContributorSummary[]> {
  const response = await githubFetch(`/repos/${owner}/${name}/contributors?per_page=20`)
  if (!response.ok) {
    throw new Error(`Contributors request failed with status ${response.status}`)
  }

  const payload = (await response.json()) as GitHubContributorResponse[]
  return payload.map((contributor) => ({
    login: contributor.login || "unknown",
    contributions: contributor.contributions || 0,
    type: contributor.type || "unknown",
  }))
}

function selectSourceFilePaths(tree: string[]) {
  const exactPriority = [
    "app/page.tsx",
    "app/layout.tsx",
    "src/app/page.tsx",
    "src/app/layout.tsx",
    "pages/index.tsx",
    "pages/_app.tsx",
    "src/main.ts",
    "src/main.tsx",
    "src/index.ts",
    "src/index.tsx",
    "index.ts",
    "index.js",
    "server.ts",
    "server.js",
    "app.py",
    "main.py",
    "manage.py",
    "main.go",
    "src/main.rs",
    "src/lib.rs",
  ]
  const selected = new Set(exactPriority.filter((path) => tree.includes(path)))

  const patternPriority = [
    /^cmd\/[^/]+\/main\.go$/,
    /^src\/.*\.(ts|tsx|js|jsx|py|go|rs)$/,
    /^app\/.*\.(ts|tsx|js|jsx)$/,
    /^pages\/.*\.(ts|tsx|js|jsx)$/,
    /^packages\/[^/]+\/src\/.*\.(ts|tsx|js|jsx)$/,
  ]

  for (const pattern of patternPriority) {
    for (const path of tree) {
      if (selected.size >= 14) break
      if (pattern.test(path) && !isLikelyGeneratedOrTest(path)) {
        selected.add(path)
      }
    }
  }

  return Array.from(selected).slice(0, 14)
}

function isLikelyGeneratedOrTest(path: string) {
  return /(^|\/)(dist|build|coverage|node_modules|vendor)\//.test(path) ||
    /\.(test|spec)\.(ts|tsx|js|jsx|py|go|rs)$/.test(path) ||
    /\.d\.ts$/.test(path)
}

async function fetchRawFile(owner: string, name: string, path: string) {
  const response = await githubFetch(`/repos/${owner}/${name}/contents/${path}`)
  if (!response.ok) {
    throw new Error(`File request failed with status ${response.status}`)
  }

  const payload = (await response.json()) as GitHubReadmeResponse
  if (!payload.content || payload.encoding !== "base64") return ""

  return Buffer.from(payload.content, "base64").toString("utf8")
}

function githubFetch(path: string) {
  return fetch(`${getServerEnv().githubApiBaseUrl}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "GitSight-MVP",
      ...(getServerEnv().githubToken
        ? {
            Authorization: `Bearer ${getServerEnv().githubToken}`,
          }
        : {}),
    },
    next: {
      revalidate: 0,
    },
  })
}
