import { readStore, updateStore } from "@/src/server/lib/file-store"
import type { RepoRecord } from "./types"

export function findRepoByFullName(fullName: string) {
  return readStore().repos.find((repo) => repo.full_name.toLowerCase() === fullName.toLowerCase()) || null
}

export async function upsertRepo(repo: RepoRecord) {
  return await updateStore((store) => {
    const existingIndex = store.repos.findIndex((item) => item.full_name.toLowerCase() === repo.full_name.toLowerCase())
    const existing = existingIndex >= 0 ? store.repos[existingIndex] : null
    const now = new Date().toISOString()

    const next: RepoRecord = {
      ...repo,
      id: existing?.id || repo.id,
      created_at: existing?.created_at || repo.created_at || now,
      updated_at: now,
    }

    if (existingIndex >= 0) {
      store.repos[existingIndex] = next
    } else {
      store.repos.push(next)
    }

    return next
  })
}

export function listRepos() {
  return [...readStore().repos].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
}
