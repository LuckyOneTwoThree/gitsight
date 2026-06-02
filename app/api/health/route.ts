import { jsonResponse } from "@/src/server/lib/http"
import { accessSync, constants, existsSync, mkdirSync } from "fs"
import path from "path"
import { getServerEnv } from "@/src/server/lib/env"

function checkDataDirectory() {
  const dataDir = path.join(process.cwd(), "data")
  try {
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true })
    }
    accessSync(dataDir, constants.R_OK | constants.W_OK)
    return {
      status: "ok",
      writable: true,
    }
  } catch (error) {
    return {
      status: "error",
      writable: false,
      message: error instanceof Error ? error.message : "Data directory is not writable.",
    }
  }
}

function getConfiguredLlmProvider() {
  const env = getServerEnv()
  return {
    provider: env.llmProvider.toLowerCase(),
    configured: Boolean(env.llmApiKey),
  }
}

export function GET() {
  const storage = checkDataDirectory()
  const llm = getConfiguredLlmProvider()
  const env = getServerEnv()
  const github = {
    configured: Boolean(env.githubToken),
    api_base_url: env.githubApiBaseUrl,
  }

  return jsonResponse({
    status: storage.status === "ok" && llm.configured ? "ok" : "degraded",
    version: "0.1.0",
    uptime: Math.floor(process.uptime()),
    checks: {
      storage,
      github,
      llm,
    },
  })
}
