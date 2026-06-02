<div align="center">

# GitSight

**开源 GitHub 项目智能分析桌面工具**

AI 驱动的 GitHub 开源项目深度分析工具 — 发现热门项目、解析技术架构、洞察行业赛道、辅助技术选型决策

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

</div>

---

## 为什么需要 GitSight？

面对 GitHub 上数百万开源项目，你是否遇到过这些问题：

- **技术选型困难**：Star 数不能代表一切，如何评估项目的真实成熟度和风险？
- **信息碎片化**：README、Issue、PR、Release 信息散落各处，难以快速形成判断
- **缺乏对比视角**：同类项目各有什么优劣？如何选择最适合自己的？
- **跟踪成本高**：关注的技术领域持续演进，手动跟踪效率低下

GitSight 将 GitHub 原始数据转化为**可追溯、可验证、可操作**的深度分析报告，帮助你做出更明智的开源技术决策。

---

## 核心特性

### Intel Score 三维评分

独创的开源项目健康度评估体系，从三个维度量化项目状态：

| 维度 | 含义 | 评估内容 |
|------|------|----------|
| **Velocity** | 活跃度 | 近期 commit 频率、Issue 响应速度、Release 节奏 |
| **Community** | 社区力 | 贡献者增长、PR 合并率、社区多样性 |
| **Maturity** | 成熟度 | 项目年龄、Star 趋势稳定性、文档完整度 |

### 8 类深度分析报告

每份报告由 AI 扮演特定专家角色生成，基于**证据链体系**确保分析可信：

| 报告类型 | 角色 | 产出 |
|----------|------|------|
| **TL;DR** | 资深产品分析师 | 2 分钟判断项目是否值得深入研究 |
| **逆向 PRD** | 首席产品策略师 | 商业模式推演 + 机会评分卡 + 行动计划 |
| **架构分析** | 首席软件架构师 | 系统架构 + 模块边界 + 数据流 + Mermaid 图 |
| **代码百科** | 资深开发者倡导者 | 开发者上手指南 + 阅读路径 + 扩展点 |
| **时间线** | 产品战略分析师 | 产品演化里程碑 + 战略转型点 |
| **技术栈** | 技术栈分析师 | 技术选型评估 + 供应链风险 + 工程成熟度 |
| **社区健康** | 开源社区健康分析师 | 社区健康评分 + 维护压力 + 贡献者友好度 |
| **贡献指南** | 开源维护者 | 从兴趣到第一个 PR 的完整路径 |

### 两种分析模式

- **Fast 模式**：跳过证据提取，单次生成，适合快速了解项目概要
- **Deep 模式**：三阶段流水线（证据提取 → 结构化生成 → 质量审稿），自动重试机制，产出深度报告

### 多仓库对比分析

选择 2-6 个项目，AI 自动生成覆盖多维度横向对比报告，支持雷达图可视化。

### AI 语义搜索

用自然语言描述需求（支持中英文），系统自动解析搜索意图、多源并行搜索、智能排序。

### 赛道全景图

8 大技术赛道（AI/ML、AI Agent、RAG、前端/UI、DevOps、数据库、编程工具、Web3）的生态全景：气泡图 + 项目排名 + 赛道摘要。

### 情报订阅

自定义告警规则：按语言、标签、Star 阈值、频率筛选，支持多渠道推送（飞书、企微、钉钉、Bark、PushPlus、Qmsg、Discord、Telegram、WxPusher、Server酱、自定义 Webhook）。

### 收藏管理

一键收藏感兴趣的项目，随时查看收藏列表，支持标签筛选。

### 浅色/深色主题

支持浅色和深色主题切换，中英文双语界面，侧边栏快捷切换。

---

## 技术架构

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 16 + React 19 |
| 语言 | TypeScript 5.7 |
| 样式 | TailwindCSS 4 + shadcn/ui |
| 数据存储 | SQLite（better-sqlite3） |
| AI 接入 | OpenAI 兼容 API（5+ 提供商） |
| 图表 | Recharts + Mermaid |
| 国际化 | 自研轻量 i18n（字典 + Context） |
| 主题 | next-themes + CSS 变量（oklch 色彩空间） |

### 分析流水线

```
GitHub 仓库 URL
       │
       ▼
┌─────────────────┐
│  数据采集层       │  GitHub REST API
│  github-context  │  README / 文件树 / 配置文件 / 源码 / CI / Issues / PR / Releases
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  证据提取层       │  Deep 模式专属
│  evidence-       │  确认事实 / 推断信号 / 未知项
│  extractor       │  每条证据带唯一 ID + 来源标注
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  报告生成层       │  LLM 扮演专家角色
│  prompt-builder  │  证据包 + 原始上下文 → 结构化 JSON
│                  │  每个声明必须包含 evidence_refs + confidence
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  质量保障层       │  双重审稿
│  quality-checker │  规则化检查：必填字段 / 证据引用 / 反幻觉 / 未知项
│  report-critic   │  LLM 审稿：82 分商业化标准 / 幻觉检测 / 可执行性
│                  │  未通过自动重试一次，取高分版本
└─────────────────┘
```

### 项目结构

```
├── app/                          # Next.js 页面和 API 路由
│   ├── api/                      # API 路由
│   │   ├── repos/[owner]/[name]/ # 仓库数据 + 分析报告 API
│   │   ├── compare/              # 对比分析 API
│   │   ├── search/               # 语义搜索 API
│   │   ├── landscape/            # 赛道全景图 API
│   │   ├── alerts/               # 情报订阅 API
│   │   ├── watchlist/            # 收藏管理 API
│   │   ├── token-usage/          # Token 消耗统计 API
│   │   ├── backup/               # 数据备份/恢复 API
│   │   ├── desktop/config/       # 桌面端配置 API
│   │   └── projects/             # 项目发现 API
│   ├── page.tsx                  # 发现探索页
│   ├── dashboard/                # 数据仪表盘
│   ├── landscape/                # 赛道大盘
│   ├── compare/                  # 对比工作台
│   ├── watchlist/                # 收藏管理
│   ├── search/                   # 搜索页
│   ├── profile/                  # 分析历史
│   ├── alerts/                   # 情报订阅
│   ├── settings/                 # 设置页
│   └── repo/[owner]/[name]/      # 仓库分析详情页
├── components/                   # UI 组件
│   ├── repo/                     # 仓库分析相关组件
│   ├── search/                   # 搜索相关组件
│   ├── compare/                  # 对比相关组件
│   ├── landscape/                # 赛道相关组件
│   ├── dashboard/                # 仪表盘相关组件
│   ├── projects/                 # 项目卡片/网格组件
│   ├── layout/                   # 布局组件（侧边栏、Header）
│   ├── charts/                   # 图表组件
│   └── ui/                       # shadcn/ui 基础组件
├── src/server/                   # 后端业务逻辑
│   ├── modules/
│   │   ├── analysis/             # 分析引擎（核心）
│   │   ├── compare/              # 对比分析模块
│   │   ├── project/              # GitHub 数据获取 + Intel Score 评分
│   │   ├── search/               # 语义搜索模块
│   │   ├── landscape/            # 赛道全景图模块
│   │   ├── alerts/               # 情报订阅 + 推送模块
│   │   └── user/                 # 工作台模块
│   └── lib/
│       ├── database.ts           # SQLite 数据库
│       ├── llm-provider.ts       # LLM 多提供商适配
│       ├── desktop-config.ts     # 桌面端配置管理
│       └── env.ts                # 环境变量管理
├── lib/                          # 前端工具函数
│   ├── i18n.ts                   # 国际化字典
│   ├── constants.ts              # 常量定义
│   └── utils.ts                  # 工具函数
├── hooks/                        # React Hooks
└── public/                       # 静态资源
```

---

## 快速开始

### 环境要求

- Node.js >= 20
- npm >= 9

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/LuckyOneTwoThree/gitsight.git
cd gitsight

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 即可使用。

首次使用需要在设置页配置：
1. **GitHub Token** — 用于获取仓库数据（[创建 Token](https://github.com/settings/tokens)）
2. **LLM API Key** — 用于生成分析报告（支持 OpenAI / DeepSeek / Kimi / MiMo / OpenRouter）

---

## 环境变量

在项目根目录创建 `.env.local` 文件：

### 必填变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | `ghp_xxxxxxxxxxxx` |
| `LLM_PROVIDER` | LLM 提供商 | `openai` / `deepseek` / `kimi` / `mimo` / `openrouter` |

### LLM 提供商配置

按 `LLM_PROVIDER` 的值配置对应提供商的 API Key：

| 提供商 | 需要的变量 | 默认模型 |
|--------|-----------|----------|
| `openai` | `OPENAI_API_KEY` | `gpt-4.1-mini` |
| `deepseek` | `DEEPSEEK_API_KEY` | `deepseek-chat` |
| `kimi` | `KIMI_API_KEY` | `moonshot-v1-32k` |
| `mimo` | `MIMO_API_KEY` | `mimo-v2.5-pro` |
| `openrouter` | `OPENROUTER_API_KEY` | `xiaomi/mimo-v2.5-pro` |

每个提供商还支持 `*_BASE_URL` 和 `*_MODEL` 变量自定义 API 地址和模型。

### 可选变量

| 变量名 | 说明 |
|--------|------|
| `GITHUB_API_BASE_URL` | GitHub API 地址，默认 `https://api.github.com` |

---

## 推送渠道配置

GitSight 支持以下推送渠道，在设置页或订阅管理中配置：

| 渠道 | 类型 | 说明 |
|------|------|------|
| 飞书 | 国内 | 群机器人 Webhook |
| 企业微信 | 国内 | 群机器人 Webhook |
| 钉钉 | 国内 | 群机器人 Webhook |
| Bark | 国际 | iOS 推送 |
| PushPlus | 国内 | 微信推送 |
| Qmsg | 国内 | QQ 推送 |
| WxPusher | 国内 | 微信推送 |
| Server酱 | 国内 | 微信推送 |
| Discord | 国际 | Webhook |
| Telegram | 国际 | Bot API |
| 自定义 Webhook | 通用 | 任意 HTTP 端点 |

---

## 赛道覆盖

| 赛道 | 关键领域 | 技术路线 |
|------|----------|----------|
| AI/ML | 大模型推理、模型训练、多模态 | PyTorch / Transformers / Diffusion |
| AI Agent | 多 Agent 协作、MCP 工具链、自主决策 | LangChain / CrewAI / AutoGen |
| RAG / 知识检索 | RAG 框架、向量数据库、图数据库 | LlamaIndex / Milvus / Neo4j |
| 前端 / UI | UI 组件库、CSS 样式、全栈框架 | React / Vue / TailwindCSS |
| DevOps / 基础设施 | 容器编排、可观测性、IaC | Kubernetes / Terraform / Prometheus |
| 数据库 / 存储 | 关系型、NoSQL、分析型引擎 | PostgreSQL / Redis / ClickHouse |
| 编程工具 | AI 编程助手、编辑器、CLI | Neovim / VS Code / Terminal |
| Web3 / 区块链 | DeFi、链上基础设施、智能合约 | Ethereum / Solana / Solidity |

---

## 常用命令

```bash
# 开发
npm run dev              # 启动开发服务器

# 构建
npm run build            # 生产构建

# 生产运行
npm run start            # 启动生产服务器
```

---

## 数据安全

- 所有数据存储在本地 SQLite 数据库
- API Key 等敏感配置本地加密存储
- 不上传任何个人数据到第三方服务器
- 支持数据备份和恢复

---

## 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m 'Add your feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 提交 Pull Request

---

## License

[MIT](./LICENSE)
