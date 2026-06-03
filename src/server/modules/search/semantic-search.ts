import { generateJsonWithLlm } from "@/src/server/lib/llm-provider"
import { searchGitHubRepos, type GitHubSearchResult } from "./github-search"
import { findRepoByFullName, upsertRepo } from "../project/repo-store"
import { recordRepoMetricsSnapshot } from "../project/metrics-store"
import { readStore } from "@/src/server/lib/file-store"
import type { RepoRecord } from "../project/types"

const CJK_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f]/

function hasChinese(text: string): boolean {
  return CJK_REGEX.test(text)
}

function tokenizeQuery(query: string): string[] {
  const tokens: string[] = []
  let buffer = ""
  let inChinese = false

  for (const ch of query) {
    const isCh = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(ch)
    if (isCh) {
      if (!inChinese && buffer.trim()) {
        tokens.push(buffer.trim())
        buffer = ""
      }
      inChinese = true
      buffer += ch
    } else if (/[\s]/.test(ch)) {
      if (buffer.trim()) {
        tokens.push(buffer.trim())
        buffer = ""
      }
      inChinese = false
    } else {
      if (inChinese && buffer.trim()) {
        tokens.push(buffer.trim())
        buffer = ""
      }
      inChinese = false
      buffer += ch
    }
  }
  if (buffer.trim()) tokens.push(buffer.trim())

  return [...new Set(tokens)]
}

export interface SemanticSearchRequest {
  query: string
  limit?: number
}

export interface IntentTag {
  type: "领域" | "类别" | "特性" | "语言" | "场景" | "规模"
  value: string
}

export interface SemanticSearchResult {
  repo: RepoRecord
  matchScore: number
  matchReason: string
  aiSummary: string
  matchedIntents: Array<{
    type: string
    label: string
    matched: boolean
  }>
}

export interface SemanticSearchResponse {
  query: string
  intentTags: IntentTag[]
  results: SemanticSearchResult[]
  aiSummary: string
  totalFound: number
}

interface ParsedIntent {
  githubQueries: string[]
  tags: IntentTag[]
  filters: {
    language?: string
    topics?: string[]
    minStars?: number
  }
  coreConcepts: string[]
}

export async function parseSearchIntent(query: string): Promise<ParsedIntent> {
  const t0 = Date.now()
  const result = await generateJsonWithLlm({
    system: `You are a search intent parser for a GitHub repository search engine.
Given a user's natural language query, extract:
1. "githubQueries": Array of 2-4 diverse GitHub search query strings using different keywords/synonyms. Use GitHub search syntax (language:, topic:, stars:>N etc.) BUT do NOT use operators — just plain keywords, max 4 keywords each. ALL keywords must be lowercase.
2. "tags": Array of intent tags, each with "type" (one of: 领域/类别/特性/语言/场景/规模) and "value" (lowercase English)
3. "filters": Optional filters with "language", "topics" array, "minStars" number
4. "coreConcepts": Array of 2-5 English keywords/phrases that MUST be present in a relevant repository's name, description, or topics. ALL concepts must be lowercase.

Domain knowledge: "skill" in AI coding = codex skill, claude code skill, cursor rule, AGENTS.md. "设计" = design system, UI design. Popular AI platforms: OpenAI Codex, Claude Code, Cursor, Windsurf, Copilot.

CRITICAL: All output strings (githubQueries, tags.value, coreConcepts) MUST be lowercase to ensure case-insensitive matching.

Always respond in JSON format.`,
    user: query,
    temperature: 0.3,
  })
  console.log(`[semantic-search] parseSearchIntent took ${Date.now() - t0}ms`)

  const parsed = result.content as Record<string, unknown>
  const queries = parsed.githubQueries as string[] | undefined
  const rawTags = (parsed.tags as IntentTag[]) || []
  return {
    githubQueries: (queries?.length ? queries : [query]).map((q) => q.toLowerCase()),
    tags: rawTags.map((t) => ({ ...t, value: t.value.toLowerCase() })),
    filters: (parsed.filters as ParsedIntent["filters"]) || {},
    coreConcepts: ((parsed.coreConcepts as string[]) || []).map((c) => c.toLowerCase()),
  }
}

interface RankedRepo {
  fullName: string
  matchScore: number
  matchReason: string
  aiSummary: string
  matchedIntents: Array<{ type: string; label: string; matched: boolean }>
}

const STRONG_SYNONYMS: Record<string, string[]> = {
  skill: ["rule", "prompt", "instruction", "workflow"],
  design: ["ui/ux", "visual", "style", "theme", "layout", "aesthetic"],
  frontend: ["front-end", "web", "ui"],
  database: ["db", "storage"],
  framework: ["library", "sdk", "toolkit"],
  lightweight: ["lightweight", "light-weight", "lite", "minimal", "embedded"],
  graph: ["network", "node", "edge", "relationship"],
}

const WEAK_SYNONYMS: Record<string, string[]> = {
  skill: ["claude", "codex", "cursor", "copilot", "agent", "windsurf"],
  design: ["component", "pattern", "system"],
  database: ["orm", "query", "cache"],
  ai: ["llm", "gpt", "openai", "copilot", "codex", "ml"],
}

const synonymMap: Record<string, string[]> = {
  "前端": ["frontend", "front-end", "web", "ui"],
  "后端": ["backend", "back-end", "server", "server-side"],
  "全栈": ["fullstack", "full-stack"],
  "移动端": ["mobile", "ios", "android", "react-native", "flutter"],
  "数据库": ["database", "db", "sql", "nosql", "orm"],
  "微服务": ["microservice", "microservices", "service-mesh"],
  "容器": ["container", "docker", "kubernetes", "k8s"],
  "部署": ["deploy", "deployment", "ci-cd", "devops"],
  "测试": ["testing", "test", "unit-test", "e2e"],
  "监控": ["monitoring", "observability", "logging", "tracing"],
  "安全": ["security", "auth", "authentication", "encryption"],
  "设计": ["design", "design-system", "ui-design", "figma"],
  "可视化": ["visualization", "chart", "graph", "d3", "echarts"],
  "机器学习": ["machine-learning", "ml", "deep-learning", "neural-network"],
  "深度学习": ["deep-learning", "dl", "neural-network", "pytorch", "tensorflow"],
  "大模型": ["llm", "large-language-model", "gpt", "claude", "gemini"],
  "AI编程": ["ai-coding", "copilot", "code-assistant", "ai-agent"],
  "低代码": ["low-code", "no-code", "lowcode"],
  "编辑器": ["editor", "ide", "code-editor", "monaco"],
  "爬虫": ["crawler", "spider", "scraper", "scraping"],
  "CLI": ["cli", "command-line", "terminal", "shell"],
  "API": ["api", "rest", "graphql", "rpc"],
  "游戏": ["game", "game-engine", "gamedev"],
  "区块链": ["blockchain", "web3", "crypto", "smart-contract"],
  "音视频": ["audio", "video", "webrtc", "streaming", "ffmpeg"],
  "性能优化": ["performance", "optimization", "profiling", "benchmark"],
  "工具库": ["utility", "toolkit", "helper", "lib"],
  "模板": ["template", "starter", "boilerplate", "scaffold"],
  "框架": ["framework", "library", "sdk"],
  "插件": ["plugin", "extension", "addon", "middleware"],
}

function getSynonyms(word: string): { strong: string[]; weak: string[] } {
  const lower = word.toLowerCase()
  return {
    strong: STRONG_SYNONYMS[lower] || [],
    weak: WEAK_SYNONYMS[lower] || [],
  }
}

function computeRelevanceScore(
  query: string,
  repo: GitHubSearchResult,
  tags: IntentTag[],
  translatedQueries: string[],
  coreConcepts: string[]
): { score: number; passed: boolean; reason: string } {
  const queryLower = query.toLowerCase()
  const queryWords = tokenizeQuery(queryLower)
  const tagValues = tags.map((t) => t.value.toLowerCase())

  const translatedTerms = [...new Set(
    translatedQueries.flatMap((q) =>
      tokenizeQuery(q.toLowerCase()).filter((w) => w.length > 1 && !w.includes(':'))
    )
  )]

  const desc = (repo.description || "").toLowerCase()
  const fullName = repo.full_name.toLowerCase()
  const repoName = repo.name.toLowerCase()
  const ownerName = repo.owner?.login?.toLowerCase() || ""
  const topics = (repo.topics || []).map((t) => t.toLowerCase())
  const allText = `${fullName} ${repoName} ${desc} ${topics.join(" ")}`

  let score = 0
  let coreHits = 0
  const matchDetails: string[] = []

  // === Layer 1: Core Concept Gate ===
  // At least N core concepts must be hit, otherwise the result is irrelevant
  const coreConceptsLower = coreConcepts.map((c) => c.toLowerCase())
  let coreHitCount = 0
  for (const concept of coreConceptsLower) {
    const conceptWords = concept.split(/\s+/)
    const hit = conceptWords.every((w) => allText.includes(w))
    if (hit) {
      coreHitCount++
      coreHits++
    }
  }
  const coreRatio = coreConceptsLower.length > 0 ? coreHitCount / coreConceptsLower.length : 1
  const passed = coreConceptsLower.length === 0 || coreHitCount >= Math.max(1, Math.ceil(coreConceptsLower.length * 0.5))

  // === Layer 2: Name Matching (highest signal) ===
  // Repo name is the strongest signal of what the project IS
  const nameKeywordDimensions = new Set<string>()
  for (const word of queryWords) {
    if (word.length < 2) continue
    if (repoName === word) { score += 20; nameKeywordDimensions.add(word); matchDetails.push(`name=exact:${word}`) }
    else if (repoName.includes(word)) { score += 14; nameKeywordDimensions.add(word); matchDetails.push(`name:contains:${word}`) }
    else if (fullName.includes(word)) { score += 5 }
  }

  for (const tt of translatedTerms) {
    if (repoName.includes(tt)) { score += 12; nameKeywordDimensions.add(tt); matchDetails.push(`name:translated:${tt}`) }
    else if (fullName.includes(tt)) { score += 4 }
  }

  // Bonus: multiple DISTINCT keyword dimensions in name = very high relevance
  // e.g. "frontend-design-skill" hits 3 dimensions vs "taste-skill" hits 1
  if (nameKeywordDimensions.size >= 3) score += 25
  else if (nameKeywordDimensions.size >= 2) score += 12

  // === Layer 3: Description Matching (rich signal) ===
  // Description contains the most detailed information about what the project does
  for (const word of queryWords) {
    if (word.length < 2) continue
    if (desc.includes(word)) { score += 5; matchDetails.push(`desc:${word}`) }

    const { strong, weak } = getSynonyms(word)
    for (const syn of strong) {
      if (allText.includes(syn)) { score += 3; matchDetails.push(`desc:syn-strong:${syn}`) }
    }
    for (const syn of weak) {
      if (allText.includes(syn)) { score += 0.5; matchDetails.push(`desc:syn-weak:${syn}`) }
    }
  }

  for (const tt of translatedTerms) {
    if (desc.includes(tt)) { score += 6; matchDetails.push(`desc:translated:${tt}`) }
  }

  // Consecutive phrase matching in description (e.g. "frontend design" as a phrase)
  for (const concept of coreConceptsLower) {
    if (desc.includes(concept)) { score += 8; matchDetails.push(`desc:phrase:${concept}`) }
  }

  // === Layer 4: Topics Matching (author-curated signal) ===
  // Topics are explicitly set by the project author — very high quality signal
  for (const word of queryWords) {
    if (word.length < 2) continue
    if (topics.some((t) => t === word)) { score += 10; matchDetails.push(`topic:exact:${word}`) }
    else if (topics.some((t) => t.includes(word))) { score += 6; matchDetails.push(`topic:partial:${word}`) }
  }

  for (const tt of translatedTerms) {
    if (topics.some((t) => t === tt)) { score += 8; matchDetails.push(`topic:translated:${tt}`) }
    else if (topics.some((t) => t.includes(tt))) { score += 4 }
  }

  for (const concept of coreConceptsLower) {
    if (topics.some((t) => t.includes(concept) || concept.includes(t))) {
      score += 6; matchDetails.push(`topic:concept:${concept}`)
    }
  }

  // === Layer 5: Tag Matching ===
  for (const tagVal of tagValues) {
    const tagWords = tagVal.split(/\s+/)
    for (const tw of tagWords) {
      if (desc.includes(tw)) score += 3
      if (topics.some((t) => t.includes(tw))) score += 4
    }
  }

  // === Layer 6: Language Matching ===
  if (repo.language) {
    const langLower = repo.language.toLowerCase()
    if (tagValues.some((tv) => tv.includes(langLower))) score += 5
    if (translatedTerms.includes(langLower)) score += 3
  }

  // === Layer 7: Dimension Coverage Bonus ===
  // How many distinct query dimensions does this result cover?
  const dimensions = new Set<string>()
  for (const word of queryWords) {
    if (word.length < 2) continue
    const { strong, weak } = getSynonyms(word)
    if (allText.includes(word) || strong.some((s) => allText.includes(s)) || weak.some((s) => allText.includes(s))) {
      dimensions.add(word)
    }
  }
  for (const tt of translatedTerms) {
    if (allText.includes(tt)) dimensions.add(tt)
  }
  for (const concept of coreConceptsLower) {
    if (allText.includes(concept)) dimensions.add(concept)
  }
  const dimensionCoverage = queryWords.length + translatedTerms.length > 0
    ? dimensions.size / (queryWords.length + Math.min(translatedTerms.length, 5))
    : 0
  score += Math.round(dimensionCoverage * 15)

  // === Layer 8: Popularity Signal (minor) ===
  // Popularity should not dominate relevance, but helps break ties
  if (repo.stargazers_count > 50000) score += 4
  else if (repo.stargazers_count > 10000) score += 3
  else if (repo.stargazers_count > 1000) score += 2
  else if (repo.stargazers_count > 100) score += 1

  // === Layer 9: Core Concept Bonus ===
  // Domain-specific concepts (领域/类别/特性) are more important than category concepts (场景/规模)
  const domainTags = tags.filter((t) => t.type === "领域" || t.type === "类别" || t.type === "特性")
  const domainHits = domainTags.filter((t) => {
    const tv = t.value.toLowerCase()
    return allText.includes(tv) || topics.some((tp) => tp.includes(tv))
  }).length
  const domainRatio = domainTags.length > 0 ? domainHits / domainTags.length : 1

  if (coreRatio >= 1.0 && domainRatio >= 1.0) score += 25
  else if (coreRatio >= 0.8 && domainRatio >= 0.5) score += 15
  else if (coreRatio >= 0.6) score += 5
  else if (coreRatio >= 0.4) score += 0

  // === Penalty: archived or fork ===
  if (repo.archived) score -= 10
  if (repo.fork) score -= 5

  // Normalize: raw score can go up to ~150+, map to 0-99 with diminishing returns
  // Using a sigmoid-like mapping: score 30+ starts to flatten
  const normalizedScore = Math.round(99 * (1 - Math.exp(-score / 40)))

  const reason = matchDetails.slice(0, 5).join(", ") || "minimal match"

  return { score: normalizedScore, passed, reason }
}

function searchLocalStore(query: string, keywords: string[], tags: IntentTag[], coreConcepts: string[], limit: number): RepoRecord[] {
  const store = readStore()
  const queryLower = query.toLowerCase()
  const queryWords = tokenizeQuery(queryLower)
  const tagValues = tags.map((t) => t.value.toLowerCase())
  const conceptWords = coreConcepts.flatMap((c) => c.toLowerCase().split(/\s+/)).filter((w) => w.length > 1)
  const allKeywords = [...new Set([...queryWords, ...keywords.map((k) => k.toLowerCase()), ...tagValues, ...conceptWords])]

  const scored = store.repos.map((repo) => {
    const desc = (repo.description || "").toLowerCase()
    const name = repo.name.toLowerCase()
    const fullName = repo.full_name.toLowerCase()
    const topics = (repo.topics || []).map((t: string) => t.toLowerCase())
    const text = `${fullName} ${name} ${desc} ${topics.join(" ")}`

    let score = 0
    for (const kw of allKeywords) {
      if (name === kw) score += 20
      else if (name.includes(kw)) score += 14
      if (desc.includes(kw)) score += 5
      if (topics.some((t) => t === kw)) score += 10
      else if (topics.some((t) => t.includes(kw))) score += 6
    }

    for (const concept of coreConcepts) {
      const cl = concept.toLowerCase()
      if (text.includes(cl)) score += 8
    }

    return { repo, score }
  })

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.repo)
}

function searchResultToRepoRecord(r: GitHubSearchResult, existing: RepoRecord | null): RepoRecord {
  const now = new Date().toISOString()
  return {
    id: existing?.id || r.id,
    github_id: existing?.github_id || r.id,
    full_name: r.full_name,
    name: r.name,
    owner: r.owner?.login || r.full_name.split("/")[0],
    description: r.description || existing?.description || null,
    language: r.language || existing?.language || null,
    stars: r.stargazers_count || existing?.stars || 0,
    forks: r.forks_count || existing?.forks || 0,
    open_issues_count: r.open_issues_count || existing?.open_issues_count || 0,
    watchers: r.watchers_count || existing?.watchers || 0,
    license: r.license?.spdx_id || r.license?.key || existing?.license || null,
    topics: r.topics?.length ? r.topics : (existing?.topics || []),
    homepage: r.homepage || existing?.homepage || null,
    is_archived: r.archived || existing?.is_archived || false,
    is_fork: r.fork || existing?.is_fork || false,
    default_branch: r.default_branch || existing?.default_branch || "main",
    contributors_count: existing?.contributors_count || 0,
    source: "on_demand" as const,
    analysis_count: existing?.analysis_count || 0,
    last_analyzed_at: existing?.last_analyzed_at || null,
    synced_at: now,
    stars_today: existing?.stars_today || 0,
    stars_week: existing?.stars_week || 0,
    stars_month: existing?.stars_month || 0,
    velocity_score: existing?.velocity_score || 0,
    intel_score: existing?.intel_score || 0,
    intel_grade: existing?.intel_grade || "D",
    trending_rank: existing?.trending_rank || null,
    last_metrics_sync: existing?.last_metrics_sync || null,
    created_at: existing?.created_at || now,
    updated_at: now,
  }
}

export async function semanticSearch(
  request: SemanticSearchRequest
): Promise<SemanticSearchResponse> {
  const { query, limit = 20 } = request
  const t0 = Date.now()

  const normalizedQuery = query.toLowerCase()
  const isChinese = hasChinese(query)

  let intent: ParsedIntent
  let rawResults: GitHubSearchResult[]

  const intentPromise = parseSearchIntent(normalizedQuery)
  const initialSearchPromise = searchGitHubRepos(normalizedQuery, limit)

  if (isChinese) {
    intent = await intentPromise
    const queries = [...new Set(intent.githubQueries)]
    const perQuery = Math.ceil(limit / Math.max(queries.length, 1))
    const [initialResults, ...extraBatches] = await Promise.all([
      initialSearchPromise,
      ...queries.map((q) => searchGitHubRepos(q, perQuery)),
    ])
    rawResults = [...initialResults, ...extraBatches.flat()]
    console.log(`[semantic-search] Chinese query, parallel search with LLM queries: [${queries.join(', ')}]`)
  } else {
    const [parsedIntent, githubResults] = await Promise.all([
      intentPromise,
      initialSearchPromise,
    ])
    intent = parsedIntent
    rawResults = githubResults

    const uniqueQueries = [...new Set(intent.githubQueries)].filter((q) => q !== normalizedQuery)
    if (uniqueQueries.length > 0) {
      const perQuery = Math.ceil(limit / uniqueQueries.length)
      const extraResults = await Promise.all(
        uniqueQueries.map((q) => searchGitHubRepos(q, perQuery))
      )
      rawResults = [...rawResults, ...extraResults.flat()]
    }
  }

  const allResultsMap = new Map<string, { result: GitHubSearchResult; hitCount: number }>()
  for (const r of rawResults) {
    const existing = allResultsMap.get(r.full_name)
    if (existing) {
      existing.hitCount++
    } else {
      allResultsMap.set(r.full_name, { result: r, hitCount: 1 })
    }
  }

  let searchResults = [...allResultsMap.values()]

  if (searchResults.length === 0) {
    console.log(`[semantic-search] GitHub search returned 0 results, falling back to local store search`)
    const localRepos = searchLocalStore(normalizedQuery, intent.githubQueries, intent.tags, intent.coreConcepts, limit)
    const localResults: SemanticSearchResult[] = localRepos.map((repo) => {
      const matchedIntents = intent.tags.map((t) => {
        const desc = (repo.description || "").toLowerCase()
        const topics = (repo.topics || []).map((tp) => tp.toLowerCase())
        return {
          type: t.type,
          label: t.value,
          matched: desc.includes(t.value.toLowerCase()) || topics.some((tp) => tp.includes(t.value.toLowerCase())),
        }
      })

      return {
        repo,
        matchScore: 60,
        matchReason: "本地数据匹配",
        aiSummary: repo.description?.slice(0, 100) || "",
        matchedIntents,
      }
    })

    const aiSummary = localResults.length > 0
      ? `从本地数据中找到 ${localResults.length} 个相关项目（GitHub API 暂时不可用）。${localResults.slice(0, 3).map((r) => r.repo.full_name).join("、")} 最符合您的需求。`
      : "未找到匹配的项目，请尝试调整搜索条件。"

    return {
      query,
      intentTags: intent.tags,
      results: localResults,
      aiSummary,
      totalFound: localRepos.length,
    }
  }

  console.log(`[semantic-search] Phase 1 took ${Date.now() - t0}ms, got ${searchResults.length} unique results`)

  const coreConcepts = intent.coreConcepts
  console.log(`[semantic-search] coreConcepts: [${coreConcepts.join(', ')}]`)

  const scored = searchResults.map(({ result: r, hitCount }) => {
    const { score, passed, reason } = computeRelevanceScore(
      normalizedQuery, r, intent.tags, intent.githubQueries, coreConcepts
    )
    const multiQueryBonus = hitCount > 1 ? (hitCount - 1) * 8 : 0
    const finalScore = Math.min(99, score + multiQueryBonus)
    return { repo: r, score: finalScore, passed, reason: hitCount > 1 ? `${reason} (×${hitCount} queries)` : reason }
  })

  const filtered = scored.filter((s) => s.passed)
  const ranked = filtered.sort((a, b) => b.score - a.score)

  console.log(`[semantic-search] Phase 2 (ranking) took ${Date.now() - t0}ms, ${scored.length} scored, ${filtered.length} passed filter`)

  const results: SemanticSearchResult[] = []
  for (const item of ranked) {
    const existing = findRepoByFullName(item.repo.full_name)
    const repoRecord = searchResultToRepoRecord(item.repo, existing)

    const saved = await upsertRepo(repoRecord)
    await recordRepoMetricsSnapshot(saved)

    const matchedIntents = intent.tags.map((t) => {
      const desc = (item.repo.description || "").toLowerCase()
      const topics = (item.repo.topics || []).map((tp) => tp.toLowerCase())
      return {
        type: t.type,
        label: t.value,
        matched: desc.includes(t.value.toLowerCase()) || topics.some((tp) => tp.includes(t.value.toLowerCase())),
      }
    })

    results.push({
      repo: saved,
      matchScore: item.score,
      matchReason: item.reason,
      aiSummary: item.repo.description?.slice(0, 100) || "",
      matchedIntents,
    })
  }

  const aiSummary =
    results.length > 0
      ? `为您找到了 ${results.length} 个相关项目。${results
          .slice(0, 3)
          .map((r) => `${r.repo.full_name}(${r.matchScore}分)`)
          .join("、")} 最符合您的需求。`
      : "未找到匹配的项目，请尝试调整搜索条件。"

  console.log(`[semantic-search] Total took ${Date.now() - t0}ms, returned ${results.length} results`)

  return {
    query,
    intentTags: intent.tags,
    results,
    aiSummary,
    totalFound: searchResults.length,
  }
}
