# 向前 · 求职工作台

面向校招及毕业 0—3 年求职者的求职 Agent。MVP 聚焦岗位收录、JD 分析、
简历定制、求职文案、投递跟进和面试准备。

## 当前阶段

- 已完成岗位工作区基础原型并发布公开预览。
- 已完成“新增岗位—信息确认—岗位列表—24 小时提醒”的可点击原型。
- 已修复 JD 文本收录链路，可从用户粘贴的原文提取字段并保留原文。
- JD 关键字段开始附带原文依据，并用真实失败样例持续做回归检查。
- 带定位图标的明确地点标签可保留详细地点并自动填入确认页。
- 当前岗位收录仅开放 JD 文本粘贴；链接、截图和插件入口明确标记为暂未开放。
- 已安全配置生产模型密钥；公开预览仍需完成登录身份方案后才启用 LLM 调用。
- 正在按模块逐步完成产品定义、交互验证和技术实现。

## 项目资料

- MVP PRD：`outputs/MVP_PRD_V0.1.md`
- 已确认决策：`docs/DECISIONS.md`
- 归档与 Git 工作流：`docs/WORKFLOW.md`
- Obsidian 归档：`docs/archives/`
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
npm install
npm run dev
npm run build
```

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

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
