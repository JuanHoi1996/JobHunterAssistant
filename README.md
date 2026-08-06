# 向前 · 求职工作台

面向校招及毕业 0—3 年求职者的求职 Agent。MVP 聚焦岗位收录、JD 分析、
简历定制、求职文案、投递跟进和面试准备。

## 当前阶段

- 已确认“先核后壳”的核心 MVP 收缩路线：当前只验证 JD—简历差距分析，不再把未来 SaaS 功能同时暴露给测试者。
- 下一实施模块是收缩导航与岗位工作区可见范围，只保留岗位列表、JD 文本收录、简历中心、岗位选择简历和 Step 1 分析。
- Step 1 将独立展示 JD 要求、简历证据、弱证据、缺口和追问；用户回答须作为 `user_confirmed` 事实单独记录，不能伪装成简历原文。
- 当前继续采用本地优先 Web MVP；产品验证后再建设邀请制账号、每日额度和岗位云存储，简历文本与原始 Word 默认仍保存在本地。
- 已完成岗位工作区基础原型并发布公开预览。
- 已完成“新增岗位—信息确认—岗位列表—24 小时提醒”的可点击原型。
- 已修复 JD 文本收录链路，可从用户粘贴的原文提取字段并保留原文。
- JD 关键字段开始附带原文依据，并用真实失败样例持续做回归检查。
- 带定位图标的明确地点标签可保留详细地点并自动填入确认页。
- 当前岗位收录仅开放 JD 文本粘贴；链接、截图和插件入口明确标记为暂未开放。
- 已接入“简历库—岗位选择简历—JD 匹配—逐条确认—岗位专属版本”的最小闭环。
- 简历中心支持在浏览器本地添加多份 `.docx`，例如产品、运营和法务简历；每个真实岗位可从简历库选择一份作为分析底稿，并记住该岗位的选择。
- 岗位工作区提供“左侧逐条采纳—右侧完整简历同步编辑—保存版本”的双栏流程；分析和岗位版本均绑定来源简历。
- 简历分析引擎 V0.9 采用两阶段流程：先拆解 JD 并盘点全简历亮点，再基于已校验的多处证据重写完整经历表述。
- 分析结果展示 JD 能力优先级、原简历可放大的亮点、证据匹配、待追问信息、重写类型及质量自检，不再以近义词替换作为主要优化方式。
- 真实性校验除数字外，还拦截无原文依据的“主导、熟练、实时、显著”等角色和程度升级词。
- 示例岗位明确标记为没有真实 JD，不能用于 AI 匹配；用户上传简历成功与岗位是否具备 JD 是两个独立条件。
- 原始 `.docx` 模板仅保存在当前浏览器；岗位版本可回写原 Word 的正文结构并下载，字体、表格、分栏、页眉页脚和页面设置沿用原文件。
- 第一阶段推荐下载岗位专属 Word 后在 Word 中另存为 PDF；浏览器打印仅保留为明确标注的“纯文本 PDF”备用入口。
- 匹配概览只展示有原文依据的匹配、修改建议和证据缺口，不提供无法验证的候选人百分位排名。
- 工作台已提供 ChatGPT 登录、退出和切换入口；登录身份与产品后台 API 额度相互独立。
- 简历数据当前保存在浏览器本地；AI 分析需使用获授权的 ChatGPT 账号登录，产品服务端不保存 JD 与简历请求正文。
- AI 服务默认使用 DeepSeek；服务端通过统一适配层调用，JD 提取与简历分析不会在失败后静默转发给另一家模型。
- V0.9 预留简历方法论 Skill 扩展位；未来加入蒸馏后的规则与案例时，不改变事实可追溯和用户逐条确认边界。
- V0.9.1 为浏览器中已有的旧版分析结果增加结构迁移与渲染兜底，新增字段不会再因旧缓存缺失而导致简历建议页面崩溃。
- 正在按模块逐步完成产品定义、交互验证和技术实现。

## 项目资料

- MVP PRD：`outputs/MVP_PRD_V0.1.md`
- 已确认决策：`docs/DECISIONS.md`
- 归档与 Git 工作流：`docs/WORKFLOW.md`
- Obsidian 归档：`docs/archives/`
- 架构提案：`docs/proposals/`（导航 URL 可寻址方案已确认，见 `docs/DECISIONS.md`）
- 当前 MVP 范围与交付路线：`docs/proposals/2026-08-05-core-mvp-scope-and-delivery-roadmap.md`
- ResumeFiller 插件：`work/ResumeFiller/`

## 产品原则

- 关键产品结论必须沉淀为 Markdown，不能只存在聊天记录中。
- 每完成一个相对独立的模块，建立一份可复制到 Obsidian 的归档。
- 每次归档后建立对应 Git 检查点。
- 不要求用户向 Agent 提供招聘网站账号、密码、验证码或 Cookie。
- MVP 优先验证用户价值，不依赖招聘平台批量岗位同步。

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
pnpm install
pnpm dev
pnpm build
```

本地开发默认地址：`http://localhost:3000`（vinext 默认端口）。若需换端口：

```bash
pnpm exec vinext dev -p 4000
```

### 私人 UX 测床（`/spike`）

贡献者个人验收路径丝滑度的极简页，**不进入主导航**，默认不当作主产品功能合并标准：

- 打开：`http://localhost:3000/spike`
- 输入：JD 纯文本 + 简历 `.docx` / `.pdf`（抽文本后可核对）
- 输出：经历级意见卡片（`/api/spike/optimize-resume`）；按「前置→建议拿下」排序；可复制 Markdown
- 实验约束：一张卡一段任职；块内取舍/bullet 重排；不要求段落守恒；不写回 Word
- 运行日志：`outputs/spike-runs/*.json`（本地，gitignore；页面会显示路径）
- 观察笔记：`docs/proposals/2026-08-06-spike-ux-bed-observations.md`（超时、意见粒度等）

意见**质量**仍由产品负责人在主工作台验收；测床只关心步数、等待、扫读与复制回流。

Windows 说明：`package.json` 的脚本已避免 Unix 风格的 `VAR=value cmd`（该写法在 CMD/PowerShell 下会失败）。Wrangler 日志路径改在 `vite.config.ts` 中设置。请使用项目约定的 **pnpm** 工作流。

## AI runtime configuration

生产环境密钥只能配置在 Sites 的私密环境变量中，不能写入代码、Git 或
`.openai/hosting.json`。本地开发可在未提交的 `.env.local` 中配置：

```bash
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=your_key_here
DEEPSEEK_JOB_MODEL=deepseek-v4-flash
DEEPSEEK_RESUME_MODEL=deepseek-v4-pro
```

可选值 `AI_PROVIDER=openai` 仅用于显式迁移或调试；产品不会在一次请求中自动
切换提供商，避免将同一份 JD 或简历转发给第二家服务。无论选择哪家服务，原文仅在
用户点击分析时发送，且服务端不记录正文。

本地开发地址（`localhost`）可在非生产环境中使用已配置的模型，而不要求 ChatGPT
身份请求头；公开部署继续执行登录与 `JOB_AI_ALLOWED_EMAILS` 白名单限制。

This starter does not use `wrangler.jsonc`.

## 工程结构

- `app/`：岗位工作区网站
- `db/`：数据结构
- `work/ResumeFiller/`：浏览器自动填表插件
- `docs/`：跨 AI 可读的项目决策与模块归档
- `outputs/`：阶段性产品文档
- `.openai/hosting.json`：Sites 项目绑定

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `pnpm dev`: start local development
- `pnpm build`: verify the vinext build output
- `pnpm test`: build the starter and verify its rendered loading skeleton
- `pnpm db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
