import { jsonResponse, errorResponse } from "@/src/server/lib/http"
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

export async function GET() {
  try {
    const config = readConfig() as unknown as Record<string, unknown>
    const profile = getProfileFromConfig(config)
    return jsonResponse({ profile })
  } catch (error) {
    console.error("[auth/profile] GET error:", error)
    return errorResponse("PROFILE_LOAD_FAILED", "Failed to load profile", 500)
  }
}

export async function PUT(request: Request) {
  try {
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
  } catch (error) {
    console.error("[auth/profile] PUT error:", error)
    return errorResponse("PROFILE_SAVE_FAILED", "Failed to save profile", 500)
  }
}
