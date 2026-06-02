<div align="center">

# RepoIntel

**开源情报与智能分析中台**

AI 驱动的 GitHub 开源项目深度分析平台 — 发现热门项目、解析技术架构、洞察行业赛道、辅助技术选型决策

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

</div>

---

## 为什么需要 RepoIntel？

面对 GitHub 上数百万开源项目，你是否遇到过这些问题：

- **技术选型困难**：Star 数不能代表一切，如何评估项目的真实成熟度和风险？
- **信息碎片化**：README、Issue、PR、Release 信息散落各处，难以快速形成判断
- **缺乏对比视角**：同类项目各有什么优劣？如何选择最适合自己的？
- **跟踪成本高**：关注的技术领域持续演进，手动跟踪效率低下

RepoIntel 将 GitHub 原始数据转化为**可追溯、可验证、可操作**的深度分析报告，帮助创始人、产品经理、技术负责人和投资人做出更明智的开源技术决策。

---

## 核心特性

### 8 类深度分析报告

每份报告由 AI 扮演特定专家角色生成，基于**证据链体系**确保分析可信：

| 报告类型 | 角色 | 产出 | Pro 专属 |
|----------|------|------|----------|
| **TL;DR** | 资深产品分析师 | 2 分钟判断项目是否值得深入研究 | |
| **逆向 PRD** | 首席产品策略师 | 商业模式推演 + 机会评分卡 + 行动计划 | ✅ |
| **架构分析** | 首席软件架构师 | 系统架构 + 模块边界 + 数据流 + Mermaid 图 | ✅ |
| **代码百科** | 资深开发者倡导者 | 开发者上手指南 + 阅读路径 + 扩展点 | |
| **时间线** | 产品战略分析师 | 产品演化里程碑 + 战略转型点 | |
| **技术栈** | 技术栈分析师 | 技术选型评估 + 供应链风险 + 工程成熟度 | ✅ |
| **社区健康** | 开源社区健康分析师 | 社区健康评分 + 维护压力 + 贡献者友好度 | |
| **贡献指南** | 开源维护者 | 从兴趣到第一个 PR 的完整路径 | |

### 两种分析模式

- **Fast 模式**：跳过证据提取，单次生成，适合快速了解项目概要
- **Deep 模式**：三阶段流水线（证据提取 → 结构化生成 → 质量审稿），自动重试机制，产出付费级深度报告

### 多仓库对比分析

选择 2 个以上项目，AI 自动生成覆盖 12 个维度的横向对比报告：决策摘要、市场定位、产品能力、技术路线、社区热度、商业壁垒、机会缺口、综合评分卡等。

### AI 语义搜索

用自然语言描述你的需求（支持中英文），系统自动：
1. LLM 解析搜索意图为结构化标签
2. 多源并行 GitHub 搜索
3. 9 层相关性打分排序

### 赛道全景图

8 大技术赛道（AI/ML、AI Agent、RAG、前端/UI、DevOps、数据库、编程工具、Web3）的生态全景：气泡图 + 项目排名 + 赛道摘要。

### 情报订阅

Pro 用户可创建自定义告警规则：按语言、标签、Star 阈值、频率筛选，支持邮件 / Webhook / 飞书 / 微信多渠道推送。

---

## 技术架构

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 16 + React 19 |
| 语言 | TypeScript 5.7 |
| 样式 | TailwindCSS 4 + shadcn/ui |
| 数据存储 | JSON 文件存储（无数据库依赖） |
| AI 接入 | OpenAI 兼容 API（5+ 提供商） |
| 部署 | Docker standalone / Railway |
| 图表 | Recharts + Mermaid |

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
├── app/                          # Next.js 页面和 API 路由（39 个端点）
│   ├── api/                      # API 路由
│   │   ├── repos/[owner]/[name]/ # 仓库数据 + 分析报告 API
│   │   ├── compare/              # 对比分析 API
│   │   ├── search/               # 语义搜索 API
│   │   ├── landscape/            # 赛道全景图 API
│   │   ├── alerts/               # 情报订阅 API
│   │   ├── auth/                 # 认证 + 用户管理 API
│   │   ├── admin/                # 管理后台 API
│   │   ├── user/workspace/       # 用户工作台 API
│   │   ├── cron/                 # 定时任务 API
│   │   └── projects/             # 项目发现 API
│   ├── repo/[owner]/[name]/      # 仓库分析详情页
│   ├── search/                   # 搜索页 + 结果页
│   ├── compare/                  # 对比分析页
│   ├── landscape/                # 赛道全景图页
│   ├── alerts/                   # 情报订阅页
│   ├── profile/                  # 个人工作台
│   ├── settings/                 # 设置页
│   └── admin/                    # 管理后台
├── components/                   # UI 组件（shadcn/ui + 自定义）
│   ├── repo/                     # 仓库分析相关组件
│   ├── search/                   # 搜索相关组件
│   ├── compare/                  # 对比相关组件
│   ├── landscape/                # 赛道相关组件
│   ├── alerts/                   # 订阅相关组件
│   ├── auth/                     # 认证相关组件
│   ├── charts/                   # 图表组件
│   └── ui/                       # shadcn/ui 基础组件
├── src/server/                   # 后端业务逻辑
│   ├── modules/
│   │   ├── analysis/             # 分析引擎（核心）
│   │   │   ├── analysis-service.ts      # 分析服务主入口
│   │   │   ├── prompt-builder.ts        # Prompt 构建 + 8 类报告配置
│   │   │   ├── evidence-extractor.ts    # 证据提取
│   │   │   ├── quality-checker.ts       # 规则化质量检查
│   │   │   ├── report-critic.ts         # LLM 审稿
│   │   │   ├── analysis-store.ts        # 报告持久化
│   │   │   └── types.ts                 # 类型定义
│   │   ├── compare/              # 对比分析模块
│   │   ├── auth/                 # 认证 / 配额 / 用户管理
│   │   ├── project/              # GitHub 数据获取
│   │   │   ├── github-client.ts         # GitHub API 封装
│   │   │   ├── github-context.ts        # 仓库上下文深度采集
│   │   │   ├── velocity-service.ts      # Velocity 评分算法
│   │   │   └── repo-store.ts            # 仓库记录持久化
│   │   ├── search/               # 语义搜索模块
│   │   ├── landscape/            # 赛道全景图模块
│   │   └── alerts/               # 情报订阅模块
│   └── lib/
│       ├── file-store.ts         # JSON 文件存储引擎
│       ├── encryption.ts         # AES-256-GCM 加密
│       ├── llm-provider.ts       # LLM 多提供商适配
│       ├── env.ts                # 环境变量管理
│       └── rate-limit.ts         # 速率限制
├── data/                         # 数据目录（JSON 文件存储）
│   ├── app-store.json            # 主数据文件
│   └── backups/                  # 自动备份
├── lib/                          # 前端工具函数
├── hooks/                        # React Hooks
├── styles/                       # 全局样式
├── Dockerfile                    # Docker 构建文件
├── next.config.mjs               # Next.js 配置
└── DEPLOY.md                     # 部署指南
```

---

## 快速开始

### 环境要求

- Node.js >= 20
- npm >= 9

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/Project_RepoIntel-main.git
cd Project_RepoIntel-main

# 安装依赖
npm install

# 创建环境变量文件
cp .env.example .env.local

# 编辑 .env.local 填入必要的配置（至少需要 GITHUB_TOKEN 和一个 LLM API Key）
# 参见下方"环境变量"章节

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 即可使用。

### Docker 部署

```bash
# 构建镜像
docker build -t repointel .

# 运行容器
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --env-file .env.local \
  --name repointel \
  --restart unless-stopped \
  repointel
```

### Railway 部署

详见 [DEPLOY.md](./DEPLOY.md)，包含完整的 Railway 部署步骤、环境变量配置、持久化存储卷挂载等。

---

## 环境变量

### 必填变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `GITHUB_TOKEN` | GitHub Personal Access Token（需 `repo` + `read:user` 权限） | `ghp_xxxxxxxxxxxx` |
| `LLM_PROVIDER` | LLM 提供商 | `openai` / `deepseek` / `kimi` / `mimo` / `openrouter` |
| `ADMIN_EMAILS` | 管理员邮箱，逗号分隔 | `admin@example.com` |
| `STORE_ENCRYPTION_KEY` | 数据加密密钥（≥16 字符随机字符串） | 生成方法见下方 |
| `NEXT_PUBLIC_APP_URL` | 应用公网地址 | `https://your-domain.com` |

生成加密密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex').slice(0,32))"
```

### LLM 提供商配置

按 `LLM_PROVIDER` 的值配置对应提供商的 API Key 和参数：

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
| `RESEND_API_KEY` | Resend 邮件服务 Key（用于邮件验证码和通知） |
| `EMAIL_FROM` | 发件人地址，默认 `RepoIntel <onboarding@resend.dev>` |
| `GITHUB_API_BASE_URL` | GitHub API 地址，默认 `https://api.github.com` |

---

## 订阅计划

| 功能 | Free | Pro |
|------|------|-----|
| 月度配额 | 3 点 | 50 点 |
| 语义搜索 | 10 次/日 | 50 次/日 |
| 基础报告 | TL;DR / 代码百科 / 时间线 / 社区健康 / 贡献指南 | 全部基础 + **逆向 PRD / 架构分析 / 技术栈** |
| 对比分析 | — | ✅ 多仓库横向对比（3 点/次） |
| 情报订阅 | — | ✅ 自定义规则 + 多渠道推送 |
| 自定义 LLM | — | ✅ BYOK（自带 API Key） |

### 配额消耗

| 报告类型 | Fast 模式 | Deep 模式 |
|----------|-----------|-----------|
| TL;DR | 1 | 1 |
| 逆向 PRD (Pro) | 1 | 2 |
| 架构分析 (Pro) | 1 | 3 |
| 代码百科 | 1 | 3 |
| 时间线 | 1 | 3 |
| 技术栈 (Pro) | 1 | 2 |
| 社区健康 | 1 | 2 |
| 贡献指南 | 1 | 2 |
| 对比分析 (Pro) | — | 3 |

---

## API 概览

RepoIntel 提供 39 个 REST API 端点，主要分类：

### 仓库与分析

- `GET /api/repos/[owner]/[name]` — 仓库元数据 + 指标快照
- `GET /api/repos/[owner]/[name]/analysis` — 获取所有报告状态
- `GET /api/repos/[owner]/[name]/analysis/[sectionType]` — 获取特定报告内容
- `POST /api/repos/[owner]/[name]/analysis/[sectionType]` — 触发报告生成

### 对比分析

- `POST /api/compare/analysis` — 启动对比分析（Pro 专属）
- `GET /api/compare/analysis/[taskId]` — 查询对比任务状态与结果

### 搜索与发现

- `POST /api/search/semantic` — AI 语义搜索
- `GET /api/search/trending` — Trending 榜单
- `GET /api/search/explore` — 赛道探索推荐
- `GET /api/landscape` — 赛道全景图数据

### 情报订阅

- `GET /api/alerts/rules` — 获取告警规则列表
- `POST /api/alerts/rules` — 创建告警规则（Pro 专属）
- `PATCH /api/alerts/rules` — 更新告警规则
- `DELETE /api/alerts/rules` — 删除告警规则

### 认证与用户

- `POST /api/auth/register` — 用户注册
- `POST /api/auth/login` — 用户登录
- `GET /api/auth/me` — 获取当前用户信息
- `GET/PUT /api/auth/llm-settings` — 自定义 LLM 配置（BYOK）
- `GET/PUT /api/auth/integrations` — 推送渠道配置

### 管理后台

- `GET /api/admin/overview` — 运营概览
- `GET /api/admin/users` — 用户列表
- `PATCH /api/admin/users` — 修改用户套餐

完整 API 文档请参考源码中的路由定义。

---

## 质量保障体系

RepoIntel 的分析报告不是简单的 LLM 对话输出，而是经过多层质量把关的付费级产品：

### 1. 证据链体系

- 每份 Deep 报告先经过**证据提取**阶段，从 GitHub 上下文中识别确认事实、推断信号和未知项
- 报告中的每个关键声明必须标注 `evidence_refs`（引用哪些证据支持）和 `confidence`（置信度）
- 没有证据支撑的声明会被质量检查器标记

### 2. 反幻觉规则

内置一系列反幻觉模式检测，例如：
- 禁止声称"分析了完整 commit 历史"（实际只采集了部分数据）
- 禁止声称"响应速度快"（没有 Issue/PR 响应时间数据支撑）
- 禁止在不确定的领域给出高度确定的结论

### 3. 双重审稿

- **规则化检查**（quality-checker）：必填字段、证据引用数量、confidence 标记、未知项声明等，评分 ≥76 分通过
- **LLM 审稿**（report-critic）：9 条审稿标准，82 分商业化标准，包括幻觉检测、空泛检测、README 复读检测、建议可执行性检测

### 4. 自动重试

初审未通过的报告会自动重试一次，将质量反馈和修改指令注入下一轮 Prompt，取初版和重试版中评分更高的作为最终结果。

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

# 代码检查
npm run lint             # ESLint 检查

# 验证脚本
npm run verify:commercial-flow     # 验证商业流程（配额扣费逻辑）
npm run verify:release-readiness   # 验证发布安全（密钥泄露检测）
```

---

## 安全说明

- 用户密码使用 scrypt 哈希 + timing-safe 比较
- 敏感数据（用户 API Key）使用 AES-256-GCM 加密存储
- Session Token 为 32 字节随机值，HttpOnly Cookie，30 天过期
- 邮箱验证码 6 位数字，5 分钟有效，5 次尝试限制
- API 速率限制：登录 10 次/分钟，验证码 3 次/分钟
- CSP 安全头已配置，限制外部资源加载
- **永远不要将密钥提交到代码仓库** — 使用环境变量管理所有敏感配置

---

## 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m 'Add your feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 提交 Pull Request

---

## 技术支持

- [Railway 部署指南](./DEPLOY.md)
- [Next.js 文档](https://nextjs.org/docs)
- [shadcn/ui 文档](https://ui.shadcn.com)
- [TailwindCSS 文档](https://tailwindcss.com/docs)

---

## License

[MIT](./LICENSE)
