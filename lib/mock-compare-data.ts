import type { ProjectData } from "@/components/projects/project-card";

// 竞品对比数据类型
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

// 功能维度定义
export const featureDimensions = {
  core: {
    label: "核心功能",
    items: [
      { key: "visualWorkflow", label: "可视化工作流" },
      { key: "ragPipeline", label: "RAG Pipeline" },
      { key: "agentOrchestration", label: "Agent 编排" },
      { key: "multiModel", label: "多模型支持" },
      { key: "promptManagement", label: "Prompt 管理" },
      { key: "knowledgeBase", label: "知识库管理" },
    ]
  },
  integration: {
    label: "集成能力",
    items: [
      { key: "apiAccess", label: "API 接口" },
      { key: "webhook", label: "Webhook" },
      { key: "thirdPartyPlugins", label: "第三方插件" },
      { key: "customModel", label: "自定义模型" },
      { key: "cloudDeploy", label: "云端部署" },
      { key: "privateDeploy", label: "私有化部署" },
    ]
  },
  enterprise: {
    label: "企业特性",
    items: [
      { key: "sso", label: "SSO 单点登录" },
      { key: "rbac", label: "权限管理" },
      { key: "auditLog", label: "审计日志" },
      { key: "dataIsolation", label: "数据隔离" },
      { key: "sla", label: "SLA 保障" },
      { key: "support", label: "技术支持" },
    ]
  }
};

// 模拟对比项目数据
export const mockComparisonProjects: ComparisonProject[] = [
  {
    id: "1",
    name: "dify",
    owner: "langgenius",
    ownerAvatar: "https://avatars.githubusercontent.com/u/127165244?v=4",
    description: "An open-source LLM app development platform",
    language: "TypeScript",
    languageColor: "#3178c6",
    stars: 38600,
    forks: 5400,
    starsToday: 456,
    starsWeek: 2890,
    lastUpdate: "3小时前",
    license: "Apache-2.0",
    tags: ["LLM", "RAG", "AI Agent", "Workflow", "No-Code"],
    sparklineData: [80, 95, 110, 140, 180, 210, 250, 290, 340, 380, 420, 456],
    aiSummary: "开源 LLM 应用开发平台，提供可视化 Workflow、RAG Pipeline 和 Agent 编排能力。",
    contributors: 342,
    openIssues: 1245,
    closedIssues: 4532,
    prMergeRate: 78,
    issueResponseTime: "< 24小时",
    releaseFrequency: "每周",
    createdAt: "2023-03-15",
    techStack: ["TypeScript", "Python", "React", "Flask"],
    deployment: ["Docker", "Kubernetes", "Cloud"],
    database: ["PostgreSQL", "Redis", "Weaviate"],
    frameworks: ["LangChain", "LlamaIndex"],
    features: {
      visualWorkflow: true,
      ragPipeline: true,
      agentOrchestration: true,
      multiModel: true,
      promptManagement: true,
      knowledgeBase: true,
      apiAccess: true,
      webhook: true,
      thirdPartyPlugins: true,
      customModel: true,
      cloudDeploy: true,
      privateDeploy: true,
      sso: true,
      rbac: true,
      auditLog: true,
      dataIsolation: true,
      sla: "Enterprise",
      support: "Enterprise",
    },
    businessModel: "Open-core + SaaS",
    pricing: "Free / $59/月 / Enterprise",
    targetAudience: "企业 / 开发者",
  },
  {
    id: "2",
    name: "flowise",
    owner: "FlowiseAI",
    ownerAvatar: "https://avatars.githubusercontent.com/u/128289781?v=4",
    description: "Drag & drop UI to build your customized LLM flow",
    language: "TypeScript",
    languageColor: "#3178c6",
    stars: 27800,
    forks: 14200,
    starsToday: 234,
    starsWeek: 1680,
    lastUpdate: "5小时前",
    license: "Apache-2.0",
    tags: ["LLM", "Low-Code", "Workflow", "LangChain"],
    sparklineData: [60, 75, 88, 102, 120, 145, 168, 190, 210, 225, 230, 234],
    aiSummary: "拖拽式 LLM 应用构建工具，基于 LangChain 生态，支持快速搭建 AI 工作流。",
    contributors: 186,
    openIssues: 892,
    closedIssues: 2341,
    prMergeRate: 65,
    issueResponseTime: "< 48小时",
    releaseFrequency: "双周",
    createdAt: "2023-02-20",
    techStack: ["TypeScript", "Node.js", "React"],
    deployment: ["Docker", "Self-hosted"],
    database: ["SQLite", "PostgreSQL", "MySQL"],
    frameworks: ["LangChain"],
    features: {
      visualWorkflow: true,
      ragPipeline: true,
      agentOrchestration: "基础",
      multiModel: true,
      promptManagement: "基础",
      knowledgeBase: true,
      apiAccess: true,
      webhook: true,
      thirdPartyPlugins: true,
      customModel: true,
      cloudDeploy: false,
      privateDeploy: true,
      sso: false,
      rbac: "基础",
      auditLog: false,
      dataIsolation: false,
      sla: false,
      support: "社区",
    },
    businessModel: "完全开源",
    pricing: "Free (Self-hosted)",
    targetAudience: "开发者 / 技术团队",
  },
  {
    id: "3",
    name: "langflow",
    owner: "langflow-ai",
    ownerAvatar: "https://avatars.githubusercontent.com/u/138797953?v=4",
    description: "A visual framework for building multi-agent and RAG applications",
    language: "Python",
    languageColor: "#3572A5",
    stars: 22400,
    forks: 3200,
    starsToday: 189,
    starsWeek: 1420,
    lastUpdate: "2小时前",
    license: "MIT",
    tags: ["LLM", "Multi-Agent", "RAG", "Visual", "Python"],
    sparklineData: [45, 58, 72, 88, 105, 125, 148, 165, 180, 190, 195, 189],
    aiSummary: "可视化多 Agent 与 RAG 应用开发框架，Python 生态，支持复杂 AI 流程编排。",
    contributors: 245,
    openIssues: 678,
    closedIssues: 1892,
    prMergeRate: 72,
    issueResponseTime: "< 24小时",
    releaseFrequency: "每周",
    createdAt: "2023-04-10",
    techStack: ["Python", "React", "FastAPI"],
    deployment: ["Docker", "Cloud", "Self-hosted"],
    database: ["PostgreSQL", "SQLite"],
    frameworks: ["LangChain", "Custom"],
    features: {
      visualWorkflow: true,
      ragPipeline: true,
      agentOrchestration: true,
      multiModel: true,
      promptManagement: true,
      knowledgeBase: true,
      apiAccess: true,
      webhook: true,
      thirdPartyPlugins: "有限",
      customModel: true,
      cloudDeploy: true,
      privateDeploy: true,
      sso: "Cloud版",
      rbac: true,
      auditLog: "Cloud版",
      dataIsolation: "Cloud版",
      sla: "Cloud版",
      support: "Cloud版 / 社区",
    },
    businessModel: "Open-core + Cloud",
    pricing: "Free / Cloud 付费",
    targetAudience: "开发者 / 数据科学家",
  },
  {
    id: "4",
    name: "n8n",
    owner: "n8n-io",
    ownerAvatar: "https://avatars.githubusercontent.com/u/45487711?v=4",
    description: "Fair-code workflow automation platform",
    language: "TypeScript",
    languageColor: "#3178c6",
    stars: 42300,
    forks: 5600,
    starsToday: 312,
    starsWeek: 2100,
    lastUpdate: "1小时前",
    license: "Fair-code",
    tags: ["Workflow", "Automation", "Integration", "No-Code", "AI"],
    sparklineData: [180, 195, 210, 240, 260, 280, 295, 305, 315, 320, 318, 312],
    aiSummary: "工作流自动化平台，支持 400+ 集成，近期增强 AI 能力，适合复杂业务流程编排。",
    contributors: 520,
    openIssues: 1890,
    closedIssues: 8920,
    prMergeRate: 82,
    issueResponseTime: "< 12小时",
    releaseFrequency: "每周",
    createdAt: "2019-06-01",
    techStack: ["TypeScript", "Node.js", "Vue.js"],
    deployment: ["Docker", "Kubernetes", "Cloud", "Desktop"],
    database: ["PostgreSQL", "SQLite", "MySQL"],
    frameworks: ["自研"],
    features: {
      visualWorkflow: true,
      ragPipeline: "通过插件",
      agentOrchestration: "基础",
      multiModel: "通过插件",
      promptManagement: false,
      knowledgeBase: false,
      apiAccess: true,
      webhook: true,
      thirdPartyPlugins: true,
      customModel: "通过插件",
      cloudDeploy: true,
      privateDeploy: true,
      sso: true,
      rbac: true,
      auditLog: true,
      dataIsolation: true,
      sla: true,
      support: "全渠道",
    },
    businessModel: "Fair-code + Enterprise",
    pricing: "Free / €20/月 / Enterprise",
    targetAudience: "企业 / 运营团队",
  },
];

// AI 机会洞察数据
export interface PainPoint {
  id: string;
  title: string;
  frequency: number;
  source: string;
  issueCount: number;
  trend: "up" | "down" | "stable";
}

export interface FeatureGap {
  feature: string;
  category: string;
  demand: "high" | "medium" | "low";
  competitors: string[];
  description: string;
}

export interface DifferentiationSuggestion {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  impact: "high" | "medium" | "low";
  tags: string[];
}

export const mockPainPoints: PainPoint[] = [
  { id: "1", title: "复杂工作流调试困难", frequency: 89, source: "GitHub Issues", issueCount: 342, trend: "up" },
  { id: "2", title: "模型切换成本高", frequency: 76, source: "GitHub Issues", issueCount: 287, trend: "up" },
  { id: "3", title: "知识库更新延迟", frequency: 71, source: "Discussions", issueCount: 245, trend: "stable" },
  { id: "4", title: "API 响应速度慢", frequency: 68, source: "GitHub Issues", issueCount: 198, trend: "down" },
  { id: "5", title: "自定义组件开发门槛高", frequency: 64, source: "Discussions", issueCount: 176, trend: "up" },
  { id: "6", title: "多租户数据隔离不完善", frequency: 58, source: "GitHub Issues", issueCount: 156, trend: "stable" },
  { id: "7", title: "缺乏完善的版本管理", frequency: 52, source: "Feature Requests", issueCount: 134, trend: "up" },
  { id: "8", title: "日志与监控能力弱", frequency: 48, source: "GitHub Issues", issueCount: 112, trend: "stable" },
  { id: "9", title: "Prompt 版本迭代管理难", frequency: 45, source: "Discussions", issueCount: 98, trend: "up" },
  { id: "10", title: "团队协作功能缺失", frequency: 42, source: "Feature Requests", issueCount: 87, trend: "up" },
];

export const mockFeatureGaps: FeatureGap[] = [
  {
    feature: "实时协作编辑",
    category: "协作",
    demand: "high",
    competitors: [],
    description: "类似 Figma 的多人实时协作工作流编辑能力",
  },
  {
    feature: "AI 自动调试",
    category: "开发体验",
    demand: "high",
    competitors: [],
    description: "基于 AI 自动诊断工作流问题并提供修复建议",
  },
  {
    feature: "Prompt A/B 测试",
    category: "测试",
    demand: "medium",
    competitors: ["n8n"],
    description: "内置 Prompt 版本对比测试与效果评估",
  },
  {
    feature: "成本预估与优化",
    category: "运维",
    demand: "high",
    competitors: [],
    description: "实时预估 Token 消耗与成本，提供优化建议",
  },
  {
    feature: "可视化 RAG 调优",
    category: "RAG",
    demand: "medium",
    competitors: ["langflow"],
    description: "图形化界面调整检索策略与分块参数",
  },
];

export const mockDifferentiationSuggestions: DifferentiationSuggestion[] = [
  {
    id: "1",
    title: "AI 驱动的工作流自动生成",
    description: "用户描述需求后，AI 自动生成完整工作流蓝图，降低上手门槛",
    difficulty: "medium",
    impact: "high",
    tags: ["AI", "自动化", "用户体验"],
  },
  {
    id: "2",
    title: "成本可视化与智能优化",
    description: "实时追踪 Token 消耗与 API 调用成本，AI 推荐最优模型组合",
    difficulty: "easy",
    impact: "high",
    tags: ["成本优化", "可观测性"],
  },
  {
    id: "3",
    title: "面向非技术用户的自然语言界面",
    description: "支持通过对话方式创建和修改工作流，彻底消除技术门槛",
    difficulty: "hard",
    impact: "high",
    tags: ["AI", "自然语言", "普惠化"],
  },
  {
    id: "4",
    title: "内置 Prompt 工程最佳实践库",
    description: "预置行业场景 Prompt 模板，一键应用并支持社区共享",
    difficulty: "easy",
    impact: "medium",
    tags: ["Prompt", "模板", "社区"],
  },
  {
    id: "5",
    title: "端到端的 AI 应用测试套件",
    description: "集成测试用例管理、回归测试、效果评估的完整测试解决方案",
    difficulty: "medium",
    impact: "medium",
    tags: ["测试", "质量保障", "DevOps"],
  },
];
