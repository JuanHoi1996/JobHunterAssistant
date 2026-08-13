---
title: Spike 择业偏好多岗打分
date: 2026-08-07
status: spike-implemented
author: co-developer (JuanHoi1996)
tags:
  - 向前
  - spike
  - 择业偏好
  - 岗位排序
---

# Spike 择业偏好多岗打分（2026-08-07）

## 动机

主站 Step 1 回答「这份 JD，简历证据够不够」；测床新增能力回答「这些岗，按我的战略该不该想要 / 谁优先」。

同司多条线（投行 vs 自营、ECM vs DCM vs ABS）标题都像好岗，权力结构不同——适合用专属择业 SKILL 做门控 + 加权排序。

## 范围与边界

| 做 | 不做 |
|----|------|
| `/spike/rank` 多选主站岗位 + 临时 JD | 站内多轮 elicitation 聊天 |
| 上传/粘贴专属择业 SKILL | 与简历匹配合成一个分 |
| 访谈协议复制/下载 | 合入主站主导航 / Step 1 |

## 入口

- 简历编排：`/spike`
- 岗位排序：`/spike/rank`
- 访谈协议：`docs/skills/career-preference-elicitation.md`（运行时从 `app/spike/skills/` 读取）

## 验收

1. 至少 2 个带 `rawJd` 的主站岗位可勾选。
2. 粘贴合格择业 SKILL 后可跑通排序表（门控 / 效用分 / 建议）。
3. 淘汰岗置底；点击行可看 note。
4. thinking-max 下接受数分钟等待；日志写入 `outputs/spike-runs/*-rank-*.json`。
