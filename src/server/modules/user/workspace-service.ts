import { readStore, updateStore } from "@/src/server/lib/file-store"

export function getWorkspace() {
  const store = readStore()
  const reposById = new Map(store.repos.map((repo) => [repo.id, repo]))

  const analysisReports = store.analysis_reports
    .filter((report) => report.status === "cached")
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .map((report) => {
      const repo = reposById.get(report.repo_id)
      return {
        id: report.id,
        repo_id: report.repo_id,
        repo_full_name: repo?.full_name || "unknown/repo",
        repo_owner: repo?.owner || "unknown",
        repo_name: repo?.name || "repo",
        section_type: report.section_type,
        mode: report.mode,
        language: report.language,
        generated_by: report.generated_by,
        generated_at: report.generated_at,
        updated_at: report.updated_at,
        is_stale: report.is_stale,
      }
    })

  const compareReports = store.compare_jobs
    .filter((job) => job.status === "cached" || job.status === "failed")
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .map((job) => ({
      id: job.id,
      repos: job.repos,
      status: job.status,
      generated_by: job.generated_by,
      updated_at: job.updated_at,
      error: job.error,
      has_markdown: Boolean(job.markdown),
      markdown: job.markdown,
    }))

  const analysisTasks = store.analysis_jobs
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(0, 20)
    .map((job) => {
      const repo = reposById.get(job.repo_id)
      return {
        id: job.id,
        type: "analysis" as const,
        repo_full_name: repo?.full_name || `${job.owner}/${job.name}`,
        repo_owner: job.owner,
        repo_name: job.name,
        section_type: job.section_type,
        mode: job.mode,
        language: job.language,
        status: job.status,
        report_id: job.report_id,
        error: job.error,
        created_at: job.created_at,
        updated_at: job.updated_at,
      }
    })

  const compareTasks = store.compare_jobs
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(0, 20)
    .map((job) => ({
      id: job.id,
      type: "compare" as const,
      repos: job.repos,
      status: job.status === "cached" ? "completed" : job.status === "generating" ? "running" : job.status,
      error: job.error,
      created_at: job.created_at,
      updated_at: job.updated_at,
    }))

  const tasks = [...analysisTasks, ...compareTasks]
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(0, 30)

  const reportRepoIds = new Set(analysisReports.map((r) => r.repo_id))
  const recentRepos = store.repos
    .filter((repo) => reportRepoIds.has(repo.id))
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(0, 8)

  return {
    stats: {
      analysis_reports: analysisReports.length,
      compare_reports: compareReports.length,
      recent_repos: recentRepos.length,
      active_tasks: tasks.filter((task) => task.status === "pending" || task.status === "running").length,
      failed_tasks: tasks.filter((task) => task.status === "failed").length,
    },
    tasks,
    analysis_reports: analysisReports,
    compare_reports: compareReports,
    recent_repos: recentRepos,
  }
}

export function deleteAnalysisReport(reportId: number) {
  return updateStore((store) => {
    const before = store.analysis_reports.length
    store.analysis_reports = store.analysis_reports.filter((report) => report.id !== reportId)
    return store.analysis_reports.length < before
  })
}

export function deleteCompareReport(jobId: string) {
  return updateStore((store) => {
    const before = store.compare_jobs.length
    store.compare_jobs = store.compare_jobs.filter((job) => job.id !== jobId)
    return store.compare_jobs.length < before
  })
}
