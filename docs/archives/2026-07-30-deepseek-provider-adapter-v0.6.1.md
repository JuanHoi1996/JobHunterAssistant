---
title: DeepSeek 模型适配层 V0.6.1
date: 2026-07-30
status: implemented-awaiting-secret
tags:
  - 向前
  - MVP
  - DeepSeek
  - AI
  - 安全
---

# DeepSeek 模型适配层 V0.6.1

## 本模块解决的问题

此前岗位提取与简历分析直接依赖 OpenAI Responses API。产品切换到 DeepSeek 时，不能只替换 URL：两家的请求和结构化输出格式不同，且不能让业务校验逻辑随供应商重复实现。

## 已确认的方案

- 默认模型服务切换为 DeepSeek。
- 岗位字段提取默认使用 `deepseek-v4-flash`；简历匹配分析默认使用 `deepseek-v4-pro`。
- 两项能力共用服务端模型适配层；业务路由继续负责输入长度、登录白名单、原文证据与真实性校验。
- DeepSeek 调用使用 Chat Completions API、JSON Object 输出、低随机性和关闭思考模式。
- 模型只在用户主动触发岗位提取或简历分析时接收 JD 与简历正文；产品服务端与生产日志不保存正文。
- 不做隐式跨供应商降级。某家模型失败时，不会把同一份 JD 或简历悄悄发送给另一家服务。
- `AI_PROVIDER=openai` 作为显式迁移或调试选项保留；默认值为 `deepseek`。

## 运行时配置

生产环境通过 Sites 私密变量配置，不能写入代码、Git 或 `.openai/hosting.json`：

```bash
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=<secret>
DEEPSEEK_JOB_MODEL=deepseek-v4-flash
DEEPSEEK_RESUME_MODEL=deepseek-v4-pro
```

项目新增 `.env.example`，其中不包含任何真实凭证，仅用于本地变量名参考。

## 错误与可用性

- API Key 无效、余额/限流、模型不可用、请求配置不兼容、网络/超时和输出校验失败会返回不同的安全错误码。
- 客户端不接触 Key；错误诊断不包含 JD、简历正文或上游错误原文。
- DeepSeek 的 JSON 输出只保证 JSON 形式；字段是否有原文依据、简历改写是否虚构仍由应用层校验。

## 已完成

- 新增统一 AI provider adapter，支持 DeepSeek 与显式 OpenAI 选择。
- 将 `/api/extract-job` 与 `/api/optimize-resume` 迁移至 adapter。
- 新增 DeepSeek 配置与无隐式双供应商回退的回归测试。
- 构建通过，15 项回归测试通过。

## 尚未完成

- 尚未将真实 `DEEPSEEK_API_KEY` 写入 Sites 私密环境变量。
- 在真实 Key 配置完成前，线上会如实显示 AI 尚未配置或回退至规则解析。
- 配置后需用真实 JD 与主简历各完成一次人工验收，重点检查字段证据与逐条简历建议。

## 下一步

将 DeepSeek Key 写入 Sites 私密变量并重新发布，随后进行一次最小真实调用验证。
