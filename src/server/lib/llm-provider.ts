import { getServerEnv } from "./env"

export class LlmNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`LLM provider is not configured: ${provider}`)
    this.name = "LlmNotConfiguredError"
  }
}

export class LlmGenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LlmGenerationError"
  }
}

interface ChatCompletionResponse {
  choices?: Array<{
    finish_reason?: string
    message?: {
      content?: string
    }
  }>
  usage?: {
    total_tokens?: number
  }
}

export interface LlmConfig {
  provider: string
  apiKey: string
  baseUrl: string
  model: string
  contextWindow?: number
}

export interface GenerateJsonOptions {
  system: string
  user: string
  temperature?: number
  llmConfig?: Omit<LlmConfig, "contextWindow"> & { contextWindow?: number }
}

const modelContextWindows: Record<string, number> = {
  "gpt-4.1-mini": 128000,
  "gpt-4.1": 128000,
  "gpt-4.1-nano": 128000,
  "gpt-4o-mini": 128000,
  "gpt-4o": 128000,
  "deepseek-chat": 64000,
  "deepseek-reasoner": 64000,
  "moonshot-v1-8k": 8192,
  "moonshot-v1-32k": 32768,
  "moonshot-v1-128k": 131072,
  "mimo-v2.5-pro": 131072,
  "xiaomi/mimo-v2.5-pro": 131072,
}

const DEFAULT_CONTEXT_WINDOW = 128000
const RESERVED_OUTPUT_TOKENS = 12000
const CHARS_PER_TOKEN = 3.5

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

function truncateToTokenBudget(text: string, maxTokens: number): string {
  const maxChars = Math.floor(maxTokens * CHARS_PER_TOKEN)
  if (text.length <= maxChars) return text

  const truncated = text.slice(0, maxChars)
  const lastNewline = truncated.lastIndexOf("\n")
  const cutPoint = lastNewline > maxChars * 0.8 ? lastNewline : maxChars

  return text.slice(0, cutPoint) + "\n\n[... 内容因长度限制已被截断 ...]"
}

export async function generateJsonWithLlm(options: GenerateJsonOptions) {
  const config = resolveLlmConfig(options.llmConfig)
  if (!config.apiKey) {
    throw new LlmNotConfiguredError(config.provider)
  }

  const inputBudget = config.contextWindow - RESERVED_OUTPUT_TOKENS
  const systemTokens = estimateTokens(options.system)
  const userTokens = estimateTokens(options.user)
  const totalInputTokens = systemTokens + userTokens

  let userContent = options.user
  if (totalInputTokens > inputBudget) {
    const userBudget = inputBudget - systemTokens
    if (userBudget < 2000) {
      throw new LlmGenerationError(
        `System prompt alone exceeds token budget (system: ${systemTokens}, budget: ${inputBudget}). Consider reducing the system prompt length.`
      )
    }
    userContent = truncateToTokenBudget(options.user, userBudget)
  }

  const requestBody: Record<string, unknown> = {
    model: config.model,
    messages: [
      {
        role: "system",
        content: options.system,
      },
      {
        role: "user",
        content: userContent,
      },
    ],
    temperature: options.temperature ?? 0.2,
    max_tokens: RESERVED_OUTPUT_TOKENS,
    response_format: {
      type: "json_object",
    },
  }

  if (config.provider === "openai" || config.provider === "deepseek") {
    requestBody.stream_options = { include_usage: true }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 180_000)

  let response: Response
  try {
    response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        ...(config.provider === "openrouter"
          ? {
              "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://repointel.local",
              "X-Title": "RepoIntel",
            }
          : {}),
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === "AbortError") {
      throw new LlmGenerationError("LLM request timed out after 180 seconds")
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    const text = await response.text()
    throw new LlmGenerationError(`LLM request failed with status ${response.status}: ${text}`)
  }

  const payload = (await response.json()) as ChatCompletionResponse
  const choice = payload.choices?.[0]
  const content = choice?.message?.content
  if (!content) {
    throw new LlmGenerationError("LLM response did not include content")
  }

  const parsedContent = parseJsonContent(content)
  if (!parsedContent) {
    const preview = content.replace(/\s+/g, " ").slice(0, 500)
    const finishReason = choice?.finish_reason ? ` Finish reason: ${choice.finish_reason}.` : ""
    throw new LlmGenerationError(`LLM response was not valid JSON.${finishReason} Response preview: ${preview}`)
  }

  return {
    provider: config.provider,
    model: config.model,
    content: parsedContent,
    tokenCost: payload.usage?.total_tokens || 0,
  }
}

function parseJsonContent(content: string): Record<string, unknown> | null {
  const normalized = normalizeJsonLikeContent(content)

  const direct = tryParseJson(normalized)
  if (direct) return direct

  const fenced = normalized.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) {
    const parsed = tryParseJson(fenced[1].trim())
    if (parsed) return parsed
  }

  const extracted = extractFirstJsonObject(normalized)
  if (extracted) {
    const parsed = tryParseJson(extracted)
    if (parsed) return parsed
  }

  const repaired = repairJsonLikeContent(extracted || normalized)
  return repaired ? tryParseJson(repaired) : null
}

function tryParseJson(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

function normalizeJsonLikeContent(content: string) {
  return content
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
}

function repairJsonLikeContent(value: string) {
  const trimmed = value.trim()
  const sliceByLastBrace = sliceFromFirstToLastBrace(trimmed)
  const candidate = sliceByLastBrace || trimmed

  return candidate
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/[\u201C\u201D]/g, "\"")
}

function sliceFromFirstToLastBrace(value: string) {
  const start = value.indexOf("{")
  const end = value.lastIndexOf("}")
  if (start < 0 || end <= start) return null
  return value.slice(start, end + 1)
}

function extractFirstJsonObject(value: string) {
  const start = value.indexOf("{")
  if (start < 0) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < value.length; index++) {
    const char = value[index]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === "\\") {
      escaped = true
      continue
    }

    if (char === "\"") {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === "{") {
      depth += 1
    } else if (char === "}") {
      depth -= 1
      if (depth === 0) {
        return value.slice(start, index + 1)
      }
    }
  }

  return null
}

function resolveLlmConfig(override?: GenerateJsonOptions["llmConfig"]): Required<LlmConfig> {
  if (override) {
    return {
      provider: override.provider || "custom",
      apiKey: override.apiKey,
      baseUrl: override.baseUrl,
      model: override.model,
      contextWindow: override.contextWindow || modelContextWindows[override.model] || DEFAULT_CONTEXT_WINDOW,
    }
  }

  const env = getServerEnv()
  const provider = env.llmProvider.toLowerCase()

  return {
    provider,
    apiKey: env.llmApiKey,
    baseUrl: env.llmBaseUrl,
    model: env.llmModel,
    contextWindow: modelContextWindows[env.llmModel] || DEFAULT_CONTEXT_WINDOW,
  }
}
