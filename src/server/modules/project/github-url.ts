export interface ParsedGitHubRepo {
  owner: string
  name: string
  full_name: string
}

const ownerRepoPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/

export function parseGitHubRepo(input: string): ParsedGitHubRepo | null {
  const value = input.trim()
  if (!value) return null

  const normalized = value
    .replace(/^git@github\.com:/i, "https://github.com/")
    .replace(/\.git$/i, "")

  if (ownerRepoPattern.test(normalized)) {
    return toParsedRepo(normalized)
  }

  try {
    const url = new URL(
      normalized.startsWith("github.com/") ? `https://${normalized}` : normalized
    )

    if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
      return null
    }

    const [owner, name] = url.pathname
      .split("/")
      .filter(Boolean)
      .slice(0, 2)

    if (!owner || !name) return null
    return toParsedRepo(`${owner}/${name}`)
  } catch {
    return null
  }
}

function toParsedRepo(fullName: string): ParsedGitHubRepo | null {
  const [owner, name] = fullName.split("/")
  if (!owner || !name) return null

  return {
    owner,
    name,
    full_name: `${owner}/${name}`,
  }
}

