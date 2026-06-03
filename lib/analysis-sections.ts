import type { ProjectData } from "@/components/projects/project-card"

export interface ComparisonProject extends ProjectData {
  // 基础数据
  contributors: number;
  openIssues: number;
  closedIssues: number;
  prMergeRate: number;
  issueResponseTime: string;
  releaseFrequency: string;
  createdAt: string;

  // 技术方案
  techStack: string[];
  deployment: string[];
  database?: string[];
  frameworks: string[];

  // 功能模块
  features: Record<string, boolean | string>;

  // 商业模式
  businessModel: string;
  pricing: string;
  targetAudience: string;
}

export interface RepoDetail {
  id: string
  name: string
  fullName: string
  owner: string
  ownerAvatar: string
  description: string
  stars: number
  forks: number
  watchers: number
  issues: number
  language: string
  license: string
  createdAt: string
  updatedAt: string
  topics: string[]
  starHistory: number[]
  hasStarHistory?: boolean
  contributors: number
  lastRelease: string
  lastReleaseDate: string
}

export interface AnalysisSection {
  id: string
  name: string
  nameEn: string
  icon: string
  description: string
  status: "ready" | "generating" | "not_generated" | "cached"
  progress?: number
  progressStage?: string
  cachedAt?: string
  estimatedTime?: string
  targetUser: string[]
}

export const ANALYSIS_SECTIONS: AnalysisSection[] = [
  {
    id: "tldr",
    name: "TL;DR 快速摘要",
    nameEn: "TL;DR Summary",
    icon: "Zap",
    description: "项目是什么、解决什么痛点、核心优势、适用场景",
    status: "not_generated",
    estimatedTime: "约 30 秒",
    targetUser: ["所有人"]
  },
  {
    id: "reverse-prd",
    name: "逆向 PRD",
    nameEn: "Reverse PRD",
    icon: "FileText",
    description: "产品定位、功能列表、用户故事、商业模式推断",
    status: "not_generated",
    estimatedTime: "约 60 秒",
    targetUser: ["PM", "创业者"]
  },
  {
    id: "architecture",
    name: "核心架构梳理",
    nameEn: "Architecture Analysis",
    icon: "Network",
    description: "技术栈全景图、模块拆解、数据流图、关键设计决策",
    status: "not_generated",
    estimatedTime: "约 90 秒",
    targetUser: ["开发者", "架构师"]
  },
  {
    id: "codewiki",
    name: "CodeWiki 导读",
    nameEn: "CodeWiki Guide",
    icon: "BookOpen",
    description: "快速启动指南、核心模块入口、常见问题 FAQ",
    status: "not_generated",
    estimatedTime: "约 60 秒",
    targetUser: ["独立开发者"]
  },
  {
    id: "timemachine",
    name: "时光机分析",
    nameEn: "Time Machine",
    icon: "History",
    description: "从 MVP 到现在的演进历程，推断产品路线决策逻辑",
    status: "not_generated",
    estimatedTime: "约 90 秒",
    targetUser: ["PM", "架构师"]
  },
  {
    id: "tech-stack",
    name: "技术栈分析",
    nameEn: "Tech Stack Analysis",
    icon: "Layers",
    description: "技术选型全景、依赖分析、供应链风险评估",
    status: "not_generated",
    estimatedTime: "约 60 秒",
    targetUser: ["开发者", "架构师"]
  },
  {
    id: "community",
    name: "社区健康度",
    nameEn: "Community Health",
    icon: "HeartPulse",
    description: "社区活跃度、贡献者友好度、License 分析、治理规范性",
    status: "not_generated",
    estimatedTime: "约 60 秒",
    targetUser: ["投资人", "创业者"]
  },
  {
    id: "contribution-guide",
    name: "贡献指南",
    nameEn: "Contribution Guide",
    icon: "GitPullRequest",
    description: "上手步骤、贡献领域、编码规范、PR 流程",
    status: "not_generated",
    estimatedTime: "约 60 秒",
    targetUser: ["开源贡献者"]
  },
  {
    id: "supply_chain",
    name: "供应链安全分析",
    nameEn: "Supply Chain Security",
    icon: "Shield",
    description: "依赖风险、许可证合规、维护者风险、安全建议",
    status: "not_generated",
    estimatedTime: "约 90 秒",
    targetUser: ["安全工程师", "架构师"]
  }
]
