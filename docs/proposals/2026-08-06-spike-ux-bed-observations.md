---
title: Spike 测床观察 — 超时、意见粒度与「手下 vs 幕僚」
date: 2026-08-06
status: spike-notes
author: co-developer (JuanHoi1996)
tags:
  - 向前
  - spike
  - UX
  - 简历分析
  - 超时
---

# Spike 测床观察（2026-08-06）

> 私人 `/spike` 测床跑通后的记录。默认不强制合入主产品；避免遗忘。  
> 相关分支：`spike/ux-opinion-bed`。

## 1. 默认 AI 请求超时过短（明确 issue）

### 现象

本地调用 `/api/optimize-resume` 时，日志出现：

- `stage: 'blueprint'`
- `exceptionName: 'TimeoutError'`
- `POST ... 504` 且耗时约 `30.1s`

Key 与网络已通（否则会是鉴权/配置错误），是**客户端硬超时**掐断上游。

### 根因

`app/ai-provider.ts` 中 `completeJson` 曾写死 `AbortSignal.timeout(30_000)`。  
简历分析是**两阶段串行**（蓝图 → 改写），`deepseek-v4-pro` 单阶段常超过 30 秒。

### 已做缓解（spike 分支）

- 默认超时改为 **120s / 次请求**；
- 可用环境变量 `AI_REQUEST_TIMEOUT_MS` 覆盖（见 `.env.example`）；
- 测床文案提示两阶段可能超过一分钟。

### 建议写入主线时

- 将「简历两阶段分析不得使用过短硬编码超时」记为工程约束；
- 超时文案区分「上游慢」与「配置/鉴权失败」，避免用户以为 Key 坏了。

## 2. 意见粒度：按 bullet 拆开 vs 按整段经历（待产品对齐）

### 现象

模型常把**同一实习/项目下的多条 bullet**拆成多条独立修改意见，而不是把该经历当作一个叙事单元给出取舍与结构建议。

从 docx 抽文本看，公司行夹住多段项目描述，结构对人/对模型都可读；**更可疑的是提示词与工作流在塑造「一条可替换原文 = 一条建议」**，而不是模型「看不懂同一段实习」。

### 代码与提示词核查（2026-08-06）

| 位置 | 作用 | 对粒度的影响 |
|------|------|----------------|
| `TRUST_RULES`：`original` 必须是简历中**连续原文** | 可核对、可 `replace` | 允许跨多行连续块，但鼓励选一段好引用的短原文 |
| `RESUME_REWRITE_METHODOLOGY`：「优先重写完整的**一条经历表述**」 | 语义含糊 | 「一条」常被理解成一条 bullet，而非整段任职 |
| `REWRITE_SYSTEM_PROMPT`：覆盖 **3—6 条**经历表述 | 凑条数 | 同一实习下多条 bullet 易被拆成多张卡 |
| 同上：`revised` 替换 `original`，**保持段落数量不变** | 对接 Word 段内回写 | 强烈偏好「一段改一段」，抑制合并/删段/整段重排 |
| 蓝图阶段：`sourceEvidence` **可多处** | 幕僚式盘点 | 分析阶段其实允许跨 bullet 证据；碎裂主要出在**改写建议** |
| `validateResumeAnalysis`：`original` 须 `resume.includes` | 落地校验 | 整段任职连续文本技术上可通过；未被提示词优先要求 |
| `docx-template` / 导出 | 段数守恒 | 产品主路径是手下式补丁，不是经历级编排 |

**结论：** 不太像「LLM 看不出夹在两个公司名之间的几段是同一实习」；更像系统把模型训练成/约束成 **bullet（或单段）级可替换补丁生成器**。蓝图可以跨证据，建议卡却以单 `original` 为原子。

### 算不算 bug？

两可：

| 视角 | 判断 |
|------|------|
| **AI 是否「看懂」简历结构** | 模型多半看得懂；碎是**输出契约**问题 |
| **「挨个改字」工作流** | 可接受：用户本来就准备一条条改 bullet |
| **幕僚式取舍/排序** | 卡片 `priority`（核心/重要/加分）与展示排序已是轻量排序；但若原子是 bullet，排的是「先改哪句」，不是「这段实习留哪些、砍哪些、整体叙事怎么摆」。治粒度应优先于加复杂排序 UI |

### 真正的产品分歧：手下 vs 幕僚

核心不是技术细节，而是对「修改意见」的预期：

1. **润色文字的手下**  
   输出可替换句子 / bullet 级 diff；用户少思考、多粘贴。Freya 主路径（original→revised、段内回写 Word）更接近这一头。

2. **好言相劝的幕僚**  
   输出优先级、取舍、叙事与证据策略；用户自己改材料（含秋招填表 / ResumeFiller）。贡献者测床验收偏这一头。

补充张力：若产品是「手下」路线，用户仍抱怨「改了跟没改一样」，说明要的不是更碎的近义替换，而是**有实质信息增益的改写或策略**——那又在向「幕僚」靠拢，或至少是「更敢的手下」。

### 记录结论（未决策）

- Spike 测床：**不把「按 bullet 拆开」当阻塞 bug**；升级为「提示词/契约塑造」的明确观察。  
- 若要改：需显式定义建议原子 = **任职经历块**（公司头到下一公司头）还是 **单条 bullet**；并相应调整「3—6 条」、段落守恒与 Word 回写假设。  
- 主产品若坚持 Word 段内补丁，bullet 级意见与导出约束更合拍。  
- 若主验收改为 Gap / 方向 / 追问（Step 1），意见应更偏幕僚，不宜以碎润色充数。  
- 取舍/排序：现有 `priority` + 卡片序已够用雏形；**宜在粒度定义清楚后再加码**，否则只是给错的原子排序。  
- 需要产品负责人明确：当前模块交付的是手下、幕僚，还是分阶段各一种。

## 3. 测床 UX 备忘

- 验收重点是路径丝滑（步数、等待、扫读、复制回流），不是意见是否「够高明」。  
- 等待态需要可见反馈（按钮文案不够）；宜用轻量 loading，不必上复杂动画。  
- JD 纯文本；简历 `.docx`/`.pdf` 抽文本；不写回文件。

## 4. 经历级约束实验（spike-experience-0.4 · 投递版形状）

测床走独立接口 `/api/spike/optimize-resume`（**不改**主站 `/api/optimize-resume`）：

- 建议原子 = 任职经历块（公司头 → 下一公司头）；
- **输出目标 =「这次投递版简历经历区应该长什么样」**，不是「最值得说的建议列表」；
- `suggestions` = **建议保留**进投递版的经历（`placement` ∈ 前置/中位/后置；可 `原文保留`）；
- `omit` = **本次别放**的经历（「拿下」只进这里，**禁止**做成经历卡）；omit 勿贴整段长原文；
- 蓝图强相关 highlights：**服务端强制补卡**（`ensureHighlightKeepSuggestions`），防止「summary 口头保留、suggestions 失踪」；
- `original` 校验对 NBSP/空白容错；
- 块内 bullet 重排 / 压缩 = `revised`；卡片主排序 = `placement`。

验收：强相关经历不得因「没什么好改」或 token 花在 omit 上而失踪；弱相关不得以「建议拿下」卡占位。

（0.2 把拿下做成卡；0.3 改 omit 但仍可能口头保留；0.4 加服务端补卡 + omit 瘦身。）

## 5. Prompt 设计分歧备忘（golden case vs philosophy）

贡献者倾向 philosophy + methodology，警惕 golden case 的领域污染；产品负责人倾向 methodology + golden cases。

外部检索（2024–2026 实践口径，非硬科学定论）：

- 厂商标配仍**强烈推荐 few-shot** 来钉格式与决策边界（Anthropic 常建议 3–5 个多样规范例；「一例有时不如零例」）。
- 污染/过拟合有从业者报告（OpenAI 论坛等）：样例会把风格与内容细节带进无关题；坏样例会放大坏行为。
- 主流表述是**互补**：原则定「海拔与禁区」，样例定「输出模样」；不是二选一消灭对方。
- 与本仓相关的折中：原则进 system；若要样例，用**格式骨架/负例**（展示 JSON 形状或「不要近义替换」），避免把「电力交易」等业务隐喻当正例全文塞进 skill。

## 6. DeepSeek JSON 截断（已修工程侧）

### 现象

flash / pro 均出现 `SyntaxError` + `looksTruncated: true`；rewrite ~16k 字符、blueprint ~7k 字符处腰斩。

### 根因（不是「没用 JSON 模式」）

- DeepSeek 路径**已启用** `response_format: { type: "json_object" }`（官方 JSON Output）。
- **没有** OpenAI 式 `json_schema` strict：官方最终回复不支持，强开会 400。
- Schema 仍靠提示词 + 本地校验；JSON mode **不保证写完**。
- 官方文档明确：`max_tokens` 过小会截断 JSON。经历级输出含整段 `original`+`revised`，旧上限 blueprint `3200` / rewrite `8000` 极易顶满。

### 已做

- spike：blueprint `16000`、rewrite `48000`；
- `finish_reason === "length"` → `AiTruncatedOutputError`（与「乱写非 JSON」区分）。

## 7. 证据缺口与追问二合一（展示层）

Step 1 设想里「缺口 = 诊断、追问 = 可填事实入口」；交互未接上时并排两栏高度重复。

- 共用 `mergeGapAsks`：优先缺口卡，重复追问去重，孤立追问才追加。
- spike / 主站简历分析 UI 合并为「证据缺口与追问」；API 仍保留 `gaps`/`questions` 字段。
- 等真有「回答 → `user_confirmed`」再拆答题面。

## 8. spike-runs 落盘（Workers 不能写项目盘）

### 现象

`Spike run log write failed`：`cwd: '/bundle'`，`operation not permitted`；目录长期只有 README。

### 根因

`vinext` + Cloudflare 插件下 API 跑在 Workers 虚拟 FS；`node:fs` 只能碰 `/bundle`（只读）与 `/tmp`（请求级），**写不进**仓库 `outputs/`。

### 已做

- API 只组 `runLog` 放进响应；
- 浏览器 `POST /__dev/spike-run-log`；
- Vite 插件 `spikeRunLogDev`（Node 侧）写入 `outputs/spike-runs/*.json`。
- 改 `vite.config.ts` 后需**重启** `pnpm dev`。

## 9. 样本复盘：固收交易员 JD 却漏掉中金固收卡（2026-08-06）

样本：`outputs/spike-runs/2026-08-06T15-55-28-444Z-ok.json`  
模型：`deepseek-v4-flash` · pipeline `spike-experience-0.2` · 约 91s · ok

### JD / 简历要点

- JD：山东证券自营「交易员」，固定收益投资交易 / 做市 / 资金交易 + 衍生方向；强调债、定价、策略研发、编程。
- 简历里**最贴**的块：`中金财富证券 | 固定收益部`（REITs 现金流、Repo 杠杆、信用数据、上市复盘）。

### 模型实际产出

| 阶段 | 对「中金固收」的态度 |
|------|----------------------|
| `highlights` | **明确写成核心亮点**「固定收益领域实战经验」，证据全是中金四条 bullet |
| `summary` | 口头承诺「突出…固定收益实战经验」 |
| `jdPriorities` | 几乎废了：只抽到「学历」和「证券从业优先」，**没抽**投资/做市/资金交易主责 |
| `matches` | **没有**单独匹配「固收实战」；量化/编程/美股因子反而上了 |
| `suggestions` 五张卡 | 美股因子（中位）、中行投行（后置）、中信飞鹰（后置）、金域（建议拿下）、媒体（建议拿下） |
| 缺口追问 | 还在问「有没有债券定价经验」——蓝图刚承认过中金 Repo/REITs |

**结论：不是「没看见中金」，是两阶段脱节 + 裁量权用反了。**

### 怎么想歪的（机制判断）

1. **蓝图认对了，改写没强制消费蓝图**  
   highlights 已钉死中金；rewrite 提示词给了「可不覆盖、可裁量」，但**没有**「强相关亮点必须出卡 / 不得只在 summary 口头表彰」的硬约束。模型把「提到过」当成「处理过」。

2. **弱经历反而更可能出卡**  
   「建议拿下」仍各做一张卡（金域、媒体）；最强固收匹配却**整段沉默**。裁量权变成：弱的用卡明示拿下，强的省略——对人眼是最差组合（扫卡片看不到中金）。

3. **`jdPriorities` 过瘦，改写锚点漂到「量化/编程」**  
   JD 正文很长且分多岗；flash 只抽出学历+资格。后续更容易用粤电/美股/系统建设叙事去凑「策略研发+编程」，把「部门名就叫固定收益」的实习挤出卡位。

4. **校验不是元凶**  
   中金原文在 `resumeText` 里连续可引用；本次 ok 且无丢卡日志痕迹。是**未生成**，不是 `includes` 校验砍掉。

### 对提示词 / 管线的含义

**已在 spike-experience-0.3 落地：**

- 输出目标改为投递版形状；`omit` 承载拿下；suggestions 仅保留项；
- 允许 `原文保留`（revised 可等于 original）；
- 蓝图要求 jdPriorities 覆盖主责条线；强相关 highlights 必须进 suggestions。

仍待样本验收：用同一固收 JD 重跑，确认中金出现在保留卡、金域/媒体只在 omit。

## 10. Thinking-max 延迟（预期）

DeepSeek 路径已改为 `thinking: enabled` + `reasoning_effort: max`（可用 `DEEPSEEK_REASONING_EFFORT` 覆盖）。

- 思考内容在 API 的 `reasoning_content`，用户侧仍只解析最终 `content` JSON。
- 单次 `/spike` 分析 = 蓝图 + 改写两轮，本地实测大约 **数分钟**（常见约 5 分钟量级）；超时默认 `AI_REQUEST_TIMEOUT_MS=600000`。
- 测床文案已提示「勿重复点击」；验收时按「质量优先、接受长等待」计，不以秒级响应为成功标准。

## 11. 择业偏好多岗打分（`/spike/rank`）

见 `docs/proposals/2026-08-07-spike-preference-job-rank.md`。与简历编排并列的测床能力：专属 SKILL + 主站岗位多选排序。

## 尚未完成

- [ ] 超时策略是否合入 `main` / `DECISIONS`（或工程归档）  
- [ ] 「手下 vs 幕僚」是否由产品负责人书面选边，并约束 Step 1 / Step 2 输出形态  
- [ ] 主站等待态是否与测床对齐  
- [ ] 经历级实验：用同一固收 JD 验收 0.4（中金应在 suggestions；弱经历只在 omit）— 已有正向样本，可继续攒 run  
- [ ] 主站是否跟进缺口·追问合并与 JSON `max_tokens`/`finish_reason` 策略  
