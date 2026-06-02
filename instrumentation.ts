export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startSyncScheduler } = await import("./src/server/lib/sync-scheduler")
    startSyncScheduler()
  }
}
