import { jsonResponse, errorResponse } from "@/src/server/lib/http"
import { withErrorHandling } from "@/src/server/lib/with-error-handling"
import { readConfig, writeConfig } from "@/src/server/lib/desktop-config"

const PROFILE_KEY = "profile"

interface ProfileData {
  name: string
  email: string
  company: string
  role: string
  timezone: string
  language: string
}

function getDefaultProfile(): ProfileData {
  return {
    name: "",
    email: "",
    company: "",
    role: "",
    timezone: "Asia/Shanghai",
    language: "zh-CN",
  }
}

function getProfileFromConfig(config: Record<string, unknown>): ProfileData {
  const raw = config[PROFILE_KEY]
  if (raw && typeof raw === "object") {
    return { ...getDefaultProfile(), ...(raw as Partial<ProfileData>) }
  }
  return getDefaultProfile()
}

export const GET = withErrorHandling(() => {
  const config = readConfig() as unknown as Record<string, unknown>
  const profile = getProfileFromConfig(config)
  return jsonResponse({ profile })
})

export const PUT = withErrorHandling(async (request: Request) => {
  const body = (await request.json()) as Record<string, unknown>
  const config = readConfig() as unknown as Record<string, unknown>

  const currentProfile = getProfileFromConfig(config)

  const updatedProfile: ProfileData = {
    ...currentProfile,
    ...(typeof body.name === "string" && { name: body.name }),
    ...(typeof body.company === "string" && { company: body.company }),
    ...(typeof body.role === "string" && { role: body.role }),
    ...(typeof body.timezone === "string" && { timezone: body.timezone }),
    ...(typeof body.language === "string" && { language: body.language }),
  }

  config[PROFILE_KEY] = updatedProfile
  writeConfig(config as any)

  return jsonResponse({ profile: updatedProfile })
})
