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

export const techRouteColors: Record<string, string> = {
  // AI / ML
  "大模型推理": "#3b82f6",
  "模型训练": "#8b5cf6",
  "多模态": "#ec4899",
  // AI Agent
  "多 Agent 协作": "#06b6d4",
  "MCP 工具链": "#f59e0b",
  "自主决策": "#ef4444",
  // RAG
  "RAG 框架": "#10b981",
  "向量数据库": "#6366f1",
  "图数据库": "#14b8a6",
  // 前端
  "UI 组件库": "#f97316",
  "CSS / 样式": "#06b6d4",
  "全栈框架": "#8b5cf6",
  // DevOps
  "容器编排": "#3b82f6",
  "可观测性": "#10b981",
  "IaC / GitOps": "#f59e0b",
  // 数据库
  "关系型数据库": "#6366f1",
  "NoSQL / 文档": "#ec4899",
  "分析型引擎": "#14b8a6",
  // 编程工具
  "AI 编程助手": "#f97316",
  "编辑器 / IDE": "#3b82f6",
  "CLI / 终端": "#10b981",
  // Web3
  "DeFi / 预测市场": "#8b5cf6",
  "链上基础设施": "#6366f1",
  "智能合约": "#f59e0b",
  // 旧值兼容
  "RAG 增强型": "#3b82f6",
  "自主决策型": "#8b5cf6",
  "本地部署型": "#10b981",
};

export const languages = [
  { value: "rust", label: "Rust", color: "#dea584" },
  { value: "typescript", label: "TypeScript", color: "#3178c6" },
  { value: "python", label: "Python", color: "#3572A5" },
  { value: "go", label: "Go", color: "#00ADD8" },
  { value: "cpp", label: "C++", color: "#f34b7d" },
  { value: "javascript", label: "JavaScript", color: "#f1e05a" },
];

export const tags = [
  { value: "web3", label: "Web3", category: "领域" },
  { value: "llm-agent", label: "LLM Agent", category: "AI" },
  { value: "ai", label: "AI", category: "AI" },
  { value: "rag", label: "RAG", category: "AI" },
  { value: "devops", label: "DevOps", category: "工具" },
  { value: "frontend", label: "前端", category: "工具" },
  { value: "database", label: "数据库", category: "工具" },
];

export const frequencyOptions = [
  { value: "daily", label: "每日" },
  { value: "weekly", label: "每周" },
  { value: "instant", label: "即时推送" },
];

export const reportTypeLabels: Record<string, string> = {
  tldr: "TL;DR",
  prd: "逆向 PRD",
  architecture: "架构梳理",
  codewiki: "CodeWiki",
  business: "商业分析",
  timeline: "时光机",
};

export const reportTypeColors: Record<string, string> = {
  tldr: "#3b82f6",
  prd: "#8b5cf6",
  architecture: "#10b981",
  codewiki: "#f59e0b",
  business: "#ef4444",
  timeline: "#06b6d4",
};
