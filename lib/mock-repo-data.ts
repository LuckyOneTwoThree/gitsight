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

export const mockRepoDetail: RepoDetail = {
  id: "1",
  name: "Dify",
  fullName: "langgenius/dify",
  owner: "langgenius",
  ownerAvatar: "https://avatars.githubusercontent.com/u/127165244?s=200&v=4",
  description: "Dify is an open-source LLM app development platform. Dify's intuitive interface combines AI workflow, RAG pipeline, agent capabilities, model management, observability features and more, letting you quickly go from prototype to production.",
  stars: 52800,
  forks: 7600,
  watchers: 412,
  issues: 286,
  language: "TypeScript",
  license: "Apache-2.0",
  createdAt: "2023-04-12",
  updatedAt: "2024-01-15",
  topics: ["llm", "ai", "rag", "agent", "workflow", "chatbot", "gpt", "langchain"],
  starHistory: [35000, 38000, 41000, 44000, 47000, 49000, 51000, 52800],
  contributors: 486,
  lastRelease: "v0.8.3",
  lastReleaseDate: "2024-01-10"
}

export const mockAnalysisSections: AnalysisSection[] = [
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

// Mock content for different analysis sections
export const mockAnalysisContent: Record<string, {
  title: string
  content: string
  mermaid?: string
  lastUpdated?: string
}> = {
  "tldr": {
    title: "TL;DR 快速摘要",
    lastUpdated: "2024-01-14 18:32",
    content: `## 项目定位

**Dify** 是一个开源的 LLM 应用开发平台，旨在让开发者和非技术用户都能快速构建基于大语言模型的 AI 应用。

## 核心痛点解决

| 痛点 | Dify 的解决方案 |
|------|----------------|
| LLM 应用开发门槛高 | 提供可视化的工作流编排界面 |
| RAG 流水线搭建复杂 | 内置完整的知识库管理和检索能力 |
| 多模型切换成本高 | 统一的模型抽象层，支持一键切换 |
| 缺乏可观测性 | 内置 Prompt 日志、Token 消耗追踪 |

## 核心优势

1. **低代码/无代码友好**：通过拖拽即可搭建复杂的 AI 工作流
2. **RAG 开箱即用**：内置向量数据库、文档解析、检索策略
3. **多模型支持**：OpenAI、Claude、本地模型等无缝切换
4. **企业级特性**：权限管理、审计日志、私有化部署

## 适用场景

- 企业内部知识库问答系统
- 智能客服与对话机器人
- 文档摘要与内容生成
- AI Agent 原型快速验证`
  },
  "reverse-prd": {
    title: "逆向 PRD：产品需求文档",
    lastUpdated: "2024-01-13 09:15",
    content: `## 产品定位声明

> Dify 定位为「LLM 应用的 WordPress」——让任何人都能在几分钟内构建、部署和运营 AI 应用。

## 核心功能列表

### P0 核心功能

| 功能模块 | 子功能 | 描述 |
|---------|--------|------|
| 工作流编排 | 可视化 Canvas | 拖拽式节点编排，支持条件分支、循环、并行 |
| 工作流编排 | 预置节点库 | LLM、知识检索、HTTP 请求、代码执行等 |
| 知识库管理 | 文档上传 | 支持 PDF、Word、Markdown、网页抓取 |
| 知识库管理 | 向量检索 | 自动分块、Embedding、语义检索 |
| 模型管理 | 多供应商接入 | OpenAI、Anthropic、Azure、本地 Ollama |
| 模型管理 | 负载均衡 | 多 API Key 轮询、故障自动切换 |

### P1 增强功能

| 功能模块 | 子功能 | 描述 |
|---------|--------|------|
| Agent 能力 | 工具调用 | 支持 Function Calling、插件扩展 |
| Agent 能力 | ReAct 模式 | 推理-行动循环的自主 Agent |
| 可观测性 | Prompt 日志 | 完整的输入输出记录 |
| 可观测性 | Token 统计 | 按应用、用户维度的消耗追踪 |

## 用户故事（User Stories）

### 作为一名产品经理
- 我希望能够通过拖拽方式搭建 AI 应用原型
- 以便于在不依赖开发资源的情况下验证产品想法

### 作为一名开发者
- 我希望能够通过 API 集成 Dify 的能力到现有系统
- 以便于快速为已有产品增加 AI 功能

### 作为一名企业 IT 管理员
- 我希望能够私有化部署并管理用户权限
- 以便于满足企业数据安全合规要求

## 商业模式推断

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                    Dify 商业模式                         │
├─────────────────────────────────────────────────────────┤
│  Open-Core 模式                                         │
│  ├── 社区版 (MIT)：核心编排引擎、基础 RAG              │
│  └── 企业版 (付费)：SSO、审计、SLA、专属支持            │
├─────────────────────────────────────────────────────────┤
│  Cloud SaaS (dify.ai)                                   │
│  ├── 免费层：有限 Token 额度                            │
│  ├── Pro：$59/月，更高额度                              │
│  └── Enterprise：定制报价                               │
└─────────────────────────────────────────────────────────┘
\`\`\``
  },
  "architecture": {
    title: "核心架构梳理",
    content: `## 技术栈全景图

> 此分析视角尚未生成，点击下方按钮消耗配额生成报告。

### 预计包含内容

- 前后端技术栈分析
- 核心模块职责说明
- 数据流图（Mermaid Flowchart）
- 关键设计决策说明
- 依赖关系分析`
  },
  "codewiki": {
    title: "CodeWiki 导读",
    content: `## CodeWiki 导读

> 此分析视角尚未生成，点击下方按钮消耗配额生成报告。

### 预计包含内容

- 快速启动指南
- 核心入口文件
- 关键代码路径
- 常见问题 FAQ
- 开发环境配置`
  },
  "timemachine": {
    title: "时光机分析",
    content: `## 时光机分析

> 此分析视角尚未生成，点击下方按钮消耗配额生成报告。

### 预计包含内容

- MVP 范围推断
- 关键里程碑
- 演进模式分析
- 战略转折点
- 未来展望`
  },
  "tech-stack": {
    title: "技术栈分析",
    content: `## 技术栈分析

> 此分析视角尚未生成，点击下方按钮消耗配额生成报告。

### 预计包含内容

- 技术选型全景
- 各技术用途与选型理由
- 优劣势评估
- 替代方案对比
- 供应链风险评估`
  },
  "community": {
    title: "社区健康度",
    content: `## 社区健康度

> 此分析视角尚未生成，点击下方按钮消耗配额生成报告。

### 预计包含内容

- 社区健康度评分
- 贡献者友好度评估
- License 分析
- 社区优势与风险
- 改进建议`
  },
  "contribution-guide": {
    title: "贡献指南",
    content: `## 贡献指南

> 此分析视角尚未生成，点击下方按钮消耗配额生成报告。

### 预计包含内容

- 开发环境搭建
- 贡献领域推荐
- 编码规范
- PR 流程
- 沟通渠道`
  },
  "supply_chain": {
    title: "供应链安全分析",
    content: `## 供应链安全分析

> 此分析视角尚未生成，点击下方按钮消耗配额生成报告。

### 预计包含内容

- 依赖概览与风险评级
- 许可证合规性分析
- 维护者 Bus Factor 评估
- 已知漏洞扫描
- 供应链安全建议`
  }
}
