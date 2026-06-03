import { type Metadata } from "next"
import { PublicReportPage } from "./public-report-client"

interface PageProps {
  params: Promise<{ reportId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { reportId } = await params
  const id = Number(reportId)

  if (!Number.isFinite(id) || id <= 0) {
    return { title: "报告未找到 | GitSight" }
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const res = await fetch(`${baseUrl}/api/public/reports/${id}`, { next: { revalidate: 3600 } })
    if (!res.ok) return { title: "报告未找到 | GitSight" }

    const data = await res.json()
    const repoName = data.repo?.full_name || "Unknown"
    const sectionLabel = sectionTypeLabel(data.section_type)

    return {
      title: `${repoName} - ${sectionLabel} 分析报告 | GitSight`,
      description: data.content?.summary
        ? String(data.content.summary).slice(0, 160)
        : `${repoName} 的深度分析报告，由 GitSight 生成`,
      openGraph: {
        title: `${repoName} - ${sectionLabel} | GitSight`,
        description: data.content?.summary
          ? String(data.content.summary).slice(0, 160)
          : undefined,
        type: "article",
      },
    }
  } catch {
    return { title: "分析报告 | GitSight" }
  }
}

function sectionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    tldr: "项目速览",
    reverse_prd: "逆向 PRD",
    architecture: "架构分析",
    code_wiki: "代码百科",
    timeline: "演进时间线",
    tech_stack: "技术栈",
    community: "社区健康",
    contribution_guide: "贡献指南",
  }
  return labels[type] || type
}

export default function Page({ params }: PageProps) {
  return <PublicReportPage />
}
