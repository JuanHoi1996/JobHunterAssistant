---
title: 导航架构提案 — URL 可寻址优先，而非古典 MPA 重写
date: 2026-08-03
status: proposal-awaiting-confirmation
author: co-developer (JuanHoi1996)
tags:
  - 向前
  - 架构
  - 导航
  - SPA
  - MPA
  - 技术债
---

# 导航架构提案：要不要改成 MPA？

> 本文是**提案**，不是已确认决策。请产品负责人 / Agent 审阅后，再写入 `docs/DECISIONS.md` 或归档为 confirmed。
>
> 目标读者：Freya 与其协作 Agent。请先读完「结论」再决定是否进入「推荐落地路径」。

## 结论（先读这段）

1. **当前痛点判断正确**：工作台几乎是「无 URL 的纯客户端状态机」，不是健康的 SPA。证据见下文「现状诊断」。
2. **不建议重写成古典 MPA**（每次导航整页刷新、服务端渲染整棵业务树）。对本产品的数据形态（浏览器 localStorage / IndexedDB、双栏简历编辑、频繁本地状态）是错配，会制造更多债，而不是还债。
3. **建议尽早做的是：URL 可寻址导航（addressable client routes）**——在保留客户端工作台交互的前提下，让主要屏幕有真实路径、真实链接、浏览器前进/后退、新标签页打开。
4. 这不是「SPA vs MPA 二选一」的审美之争，而是：**要不要尊重 Web 平台的导航契约**。欠债的是「无路由」，不是「用了 React」。

一句话给 Agent：

> Prefer **URL-addressable screens** (Next App Router routes or equivalent client router) with `<Link>` / `<a href>`. Do **not** rewrite the product into classical multi-page full reloads. Do **not** keep `setScreen(...)` as the only navigation model beyond MVP prototype stage.

## 本提案要解决的问题

贡献者在试用中观察到：

- 任意主导航 / 岗位卡片都无法「在新标签页打开」；
- URL 后缀从不变化（始终停在应用根路径）；
- 刷新或复制地址无法回到「某个岗位详情 / 简历中心」。

这些行为会在后续功能放大后变成真实成本：对比两个岗位、插件回跳、分享调试链接、浏览器历史、无障碍与可预期性。

问题不是「SPA 太潮」，而是 **导航没有进入 URL**。

## 现状诊断（代码事实）

堆栈名义上是 Next.js App Router + vinext，但产品 UI 实际集中在：

- `app/page.tsx`：`"use client"` 单体页面（约 1700+ 行）
- 屏幕切换：`useState<ScreenId>("list" | "detail" | "resume-center")`
- 岗位详情：`selectedJobId` 等内存状态
- 主导航与岗位入口：大量 `<button onClick={() => setScreen(...)}>`，**不是** `<Link href=...>`
- 持久化：`localStorage`（岗位、简历库、分析结果、岗位版本等）
- 服务端：少量 API（`/api/extract-job`、`/api/optimize-resume`、`/api/session`），不承载页面导航状态

因此更准确的标签是：

| 标签 | 是否符合现状 |
|------|----------------|
| 使用了 React / Next | 是 |
| 健康 SPA（有客户端路由与深链） | **否** |
| 古典 MPA | 否 |
| 原型期状态机壳子 | **是** |

`layout.tsx` 已具备 App Router 外壳，但**路由分层尚未用于产品导航**。技术债主要在导航模型，不在「选错了 React」。

## 三种选项（请 Agent 按表评估，不要只站队名词）

### 选项 A — 维持现状（无 URL 状态机）

**做法**：继续 `setScreen` / `selectedJobId`。

**优点**：改动为零；原型迭代快。

**缺点**：

- 无深链、无新标签对比、无可靠后退栈；
- `page.tsx` 继续膨胀，模块边界靠组件函数而不是 URL / 文件边界；
- 插件「保存岗位后打开工作台某岗」只能靠 localStorage 旁路（已有 `returnJob` 一类权宜），难扩展。

**适用**：仅极早期单人点击原型。当前已有多屏与岗位级工作流，**建议结束该选项**。

### 选项 B — 古典 MPA（整页导航 / 服务端页面为主）

**做法**：每个主要屏幕独立服务端页面；导航靠真正的文档请求；尽量少客户端状态。

**优点**：

- 新标签、分享链接、后退「天然正确」；
- 心智模型对「老炮」友好。

**缺点（对本产品尤其致命）**：

- 简历与分析结果以**浏览器本地**为事实来源（见 `docs/DECISIONS.md`）；MPA 每次整页加载都要重新灌入本地状态，双栏编辑的瞬时状态更难保留；
- 岗位工作区是强交互编辑器，不是内容站；整页刷新会打断「左侧采纳 / 右侧同步」心流；
- 现有 vinext + Cloudflare Sites + ChatGPT header 身份模型，并不要求用 MPA 才能工作；
- **重写面极大**：拆数据加载、表单态、分析态、导出态，收益主要是导航，却付出整仓重构。

**结论**：古典 MPA **不是**还债最短路径；是换一种更贵的债。

### 选项 C — URL 可寻址的客户端工作台（推荐）

**做法**：保留 SPA/客户端交互与 localStorage 模型，但引入真实路由，例如：

| 路径 | 含义 |
|------|------|
| `/` 或 `/jobs` | 岗位列表 |
| `/jobs/[jobId]` | 岗位工作区（可用 `?tab=resume` 等） |
| `/resumes` | 简历中心 |
| 后续 | `/jobs/[jobId]/letter` 等按模块加 |

导航控件改为 `<Link>` / `<a href>`（可中键、可复制、可新标签）；左键仍可客户端过渡，不必整页闪白。

**优点**：

- 修掉当前全部可观察痛点（新标签、深链、后退、插件回跳 URL）；
- 与现有隐私模型兼容（数据仍可本地）；
- 可**增量**迁移：先路由外壳，再拆 `page.tsx`；
- 文件/路由边界天然逼迫模块化，减少巨石文件。

**缺点**：

- 需要一次性设计路由表与「刷新后从 localStorage 恢复选中岗位」的约定；
- vinext/Sites 部署需保证深链回退到应用（SPA fallback）；通常可配置，但要测；
- 若误把所有页面做成无意义的 Server Component 套壳，会增加 App Router 心智负担——对本应用，**页面主体继续 client 是预期内的**。

**结论**：这是「MPA 痛快」里真正值钱的那部分（URL 与浏览器契约），去掉整页刷新的错配成本。

## 外部论据摘要（调研）

对「local-first 工作台要不要 URL」的公开讨论，共识接近：

- URL 是 Web 核心能力；用户期望多标签打开不同页；无路由 SPA 在刷新后回到初始态。
- 用 `<button onClick>` 冒充导航是反模式：无法新标签、无法复制链接。
- 客户端路由的 `<Link>` 可以同时满足：左键无刷新、中键新标签。
- 若应用几乎全是 `"use client"` 且数据在浏览器，App Router 的 SSR 优势有限；**不等于**该放弃路由，只是「路由 ≠ 必须 SSR」。

来源示例（供 Agent 深读，非排版依赖）：

- [Respecting Browser Navigation in SPAs](https://rakhman.info/blog/respecting-browser-navigation-spa)
- [r/webdev: Is routing really necessary in SPA?](https://www.reddit.com/r/webdev/comments/18t0aht/is_routing_really_necessary_in_spa_web)
- [r/nextjs: If all pages are use client…](https://www.reddit.com/r/nextjs/comments/1c70xyd/if_the_main_content_of_all_pages_are_use_client)
- [Next.js discussion: App vs Pages opinions](https://github.com/vercel/next.js/discussions/59373)

调研意图：证明「要 URL」，而不是证明「必须换成古典 MPA」或「必须死磕 RSC」。

## 与已确认产品决策的兼容性

下列决策**不要求**古典 MPA，也**不禁止** URL 路由：

- 简历与敏感材料优先本地；AI 仅在用户点击分析时上传正文；
- 双栏逐条确认；
- 示例岗无真实 JD 不可分析；
- 不自动提交网申。

URL 可寻址反而有利于：

- 插件保存岗位后打开 `/jobs/{id}`；
- 登录回调后回到 `returnTo` 深链（现有 ChatGPT auth helper 已强调 same-origin relative `returnTo`）；
- 多岗位对照（两标签各开一个 job）。

若未来做「偏好打分 / 排序」，列表与详情的可分享状态也依赖稳定路径。

## 推荐落地路径（增量，避免大爆炸重写）

### 阶段 0 — 决策（本文）

确认采用选项 C；明确不把古典 MPA 列入近季重构。

### 阶段 1 — 最小路由切开（高杠杆 / 低风险）

1. 增加 App Router 路由文件，例如 `app/jobs/page.tsx`、`app/jobs/[jobId]/page.tsx`、`app/resumes/page.tsx`（或等价结构）。
2. 抽出共享壳：侧栏、顶栏、localStorage hydrate/persist（可先共享同一 client provider）。
3. 将 `setScreen("list"|"detail"|"resume-center")` 替换为 `router.push` / `<Link>`。
4. 岗位 ID 进入 path；tab 可用 search param。
5. 验收：中键打开岗位、复制 URL 刷新仍在同一岗位、浏览器后退回到列表。

**刻意不做**：顺便重写分析引擎、换状态库、上服务端岗位库。

### 阶段 2 — 拆巨石

- 按路由拆 UI 与 hooks；`page.tsx` 不再作为唯一入口。
- 统一「未找到 jobId」空态。

### 阶段 3 — 与插件契约

- 约定插件深链格式；淘汰仅靠 `localStorage.returnJob` 的隐式跳转（可暂时双写）。

## 明确非目标

- 不为 SEO 重做 SSR 内容站（登录后的个人工作台不是营销页）。
- 不把 localStorage 事实源强行迁到服务端，只为「更像 MPA」。
- 不在同一 PR 混入偏好打分、AI 改版、Windows 脚本等无关主题。

## 风险与反对意见预演

| 反对 | 回应 |
|------|------|
| 「现在能用，别碰架构」 | 无路由债随岗位数与插件接入指数变贵；阶段 1 可小 PR。 |
| 「要痛快就上 MPA」 | 痛快的是 URL/新标签；整页刷新与本地编辑器冲突。 |
| 「Next App Router 太重」 | 可只用其文件路由 + client pages；不必为每页追求 RSC。若未来证明 vinext 深链成本过高，再评估纯客户端 router，但**仍要有 URL**。 |
| 「双标签会双写 localStorage」 | 本就存在的多标签一致性问题；可用 `storage` 事件或日后单 writer。不是维持无 URL 的理由。 |

## 建议写入 DECISIONS 的草案文案（确认后粘贴）

> 工作台导航采用 URL 可寻址的客户端路由（岗位列表、岗位详情、简历中心等）。主导航与岗位入口使用可打开新标签的链接语义。不将产品重写为古典多页整页刷新应用。无 URL 的纯 `setScreen` 状态机仅视为原型期过渡，不再作为目标架构。

## 下一步请求

请 Freya / Agent：

1. 选择：**选项 C 确认** / **暂缓** / **另案**（请写明）；
2. 若确认，是否允许贡献者按「阶段 1」单独开 PR（不混其他功能）；
3. 路由表是否有命名偏好（`/jobs` vs `/positions` 等）。

---

## 附录：贡献者立场（可忽略，不影响决策表）

贡献者个人更习惯 MPA 心智，但在本仓约束下，认为「URL 可寻址的客户端工作台」才是同时满足浏览器契约与本地隐私/编辑器形态的最小正确架构。若确认阶段 1，愿意在独立 PR 中实施。
