import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeStoredResumeAnalysis,
  validateResumeAnalysis,
  validateResumeBlueprint,
} from "../app/resume-analysis.js";

const resume = [
  "用户运营实习：整理300条用户反馈，输出每周问题报告。",
  "根据反馈建立三级问题标签，并推动产品团队调整问题处理流程。",
  "调整后工单平均响应时间下降50%。",
].join("\n");
const jd = "岗位职责：分析用户反馈，设计分析框架，并提出产品优化建议。";

const blueprintPayload = {
  jdPriorities: [{
    title: "用户问题分析",
    priority: "核心",
    jdEvidence: "分析用户反馈",
    interpretation: "需要从反馈中形成结构化洞察。",
  }],
  highlights: [{
    title: "从反馈到流程优化的完整闭环",
    sourceEvidence: [
      "整理300条用户反馈，输出每周问题报告",
      "根据反馈建立三级问题标签，并推动产品团队调整问题处理流程",
      "调整后工单平均响应时间下降50%",
    ],
    value: "同时具备分析框架、跨团队推动和结果验证。",
    transferableSkills: ["结构化分析", "跨团队协作"],
  }],
  gaps: [],
};

test("validates a grounded JD blueprint and cross-resume highlights", () => {
  const blueprint = validateResumeBlueprint(resume, jd, blueprintPayload);
  assert.equal(blueprint.jdPriorities.length, 1);
  assert.equal(blueprint.highlights.length, 1);
  assert.equal(blueprint.highlights[0].sourceEvidence.length, 3);
});

test("accepts a substantive rewrite grounded in multiple resume excerpts", () => {
  const blueprint = validateResumeBlueprint(resume, jd, blueprintPayload);
  const result = validateResumeAnalysis(resume, jd, {
    summary: "具备从用户反馈到产品流程优化的闭环经验。",
    matches: [{
      title: "用户反馈分析",
      resumeEvidence: [
        "整理300条用户反馈，输出每周问题报告",
        "根据反馈建立三级问题标签，并推动产品团队调整问题处理流程",
      ],
      jdEvidence: "分析用户反馈",
      explanation: "经历覆盖信息整理、框架建立和推动改进。",
    }],
    gaps: [],
    questions: [],
    suggestions: [{
      title: "把反馈整理升级为完整问题解决闭环",
      rewriteType: "整条重写",
      priority: "核心",
      original: "用户运营实习：整理300条用户反馈，输出每周问题报告。",
      sourceEvidence: [
        "整理300条用户反馈，输出每周问题报告",
        "根据反馈建立三级问题标签，并推动产品团队调整问题处理流程",
        "调整后工单平均响应时间下降50%",
      ],
      revised: "围绕300条用户反馈建立三级问题标签与周报机制，推动产品团队优化问题处理流程，使工单平均响应时间下降50%。",
      jdEvidence: "分析用户反馈",
      reason: "完整呈现分析、推动和结果。",
      qualityCheck: "角色未升级，数字均来自简历原文。",
    }],
  }, blueprint);

  assert.equal(result.matches.length, 1);
  assert.equal(result.suggestions.length, 1);
  assert.equal(result.suggestions[0].sourceEvidence.length, 4);
  assert.equal(result.suggestions[0].rewriteType, "整条重写");
});

test("rejects missing evidence and numbers absent from all cited evidence", () => {
  const blueprint = validateResumeBlueprint(resume, jd, blueprintPayload);
  const result = validateResumeAnalysis(resume, jd, {
    summary: "测试",
    matches: [{
      title: "不存在",
      resumeEvidence: ["主导产品迭代"],
      jdEvidence: "分析用户反馈",
      explanation: "没有依据",
    }],
    gaps: [{
      title: "产品建议",
      jdEvidence: "提出产品优化建议",
      reason: "简历未提供证据",
      question: "最终落地了多少项建议？",
    }],
    questions: [{
      question: "最终落地了多少项建议？",
      why: "用于补充产品影响。",
      jdEvidence: "提出产品优化建议",
    }],
    suggestions: [{
      title: "虚构数据",
      rewriteType: "整条重写",
      priority: "核心",
      original: "用户运营实习：整理300条用户反馈，输出每周问题报告。",
      sourceEvidence: ["整理300条用户反馈，输出每周问题报告"],
      revised: "整理300条用户反馈并推动5项产品优化。",
      jdEvidence: "提出产品优化建议",
      reason: "错误增加数字",
      qualityCheck: "未通过",
    }],
  }, blueprint);

  assert.equal(result.matches.length, 0);
  assert.equal(result.gaps.length, 1);
  assert.equal(result.questions.length, 1);
  assert.equal(result.suggestions.length, 0);
});

test("rejects unsupported role and proficiency upgrades", () => {
  const blueprint = validateResumeBlueprint(resume, jd, blueprintPayload);
  const result = validateResumeAnalysis(resume, jd, {
    summary: "测试",
    matches: [],
    gaps: [],
    questions: [],
    suggestions: [{
      title: "夸大熟练度",
      rewriteType: "精简表达",
      priority: "重要",
      original: "技能：Excel、SQL，能够完成基础数据清洗与分析。",
      sourceEvidence: ["技能：Excel、SQL，能够完成基础数据清洗与分析"],
      revised: "熟练使用Excel、SQL完成数据清洗与分析。",
      jdEvidence: "具备数据分析和跨团队协作能力",
      reason: "错误升级",
      qualityCheck: "未通过",
    }],
  }, blueprint);

  assert.equal(result.suggestions.length, 0);
});

test("migrates a partial cached analysis without crashing the V0.9 UI", () => {
  const migrated = normalizeStoredResumeAnalysis({
    summary: "旧版分析结果",
    matches: [{
      title: "用户分析",
      resumeEvidence: "整理300条用户反馈",
      jdEvidence: "分析用户反馈",
      explanation: "具备直接证据",
    }],
    gaps: [{ title: "实验设计", jdEvidence: "实验验证", reason: "暂未体现" }],
    suggestions: [{
      title: "旧版建议",
      original: "用户运营实习：整理300条用户反馈，输出每周问题报告。",
      revised: "整理300条用户反馈并输出周报。",
      jdEvidence: "分析用户反馈",
      reason: "突出分析工作",
    }],
    accepted: [0, 9, "0"],
  });

  assert.deepEqual(migrated.jdPriorities, []);
  assert.deepEqual(migrated.highlights, []);
  assert.deepEqual(migrated.questions, []);
  assert.deepEqual(migrated.matches[0].resumeEvidence, ["整理300条用户反馈"]);
  assert.deepEqual(migrated.suggestions[0].sourceEvidence, [
    "用户运营实习：整理300条用户反馈，输出每周问题报告。",
  ]);
  assert.equal(migrated.suggestions[0].priority, "重要");
  assert.equal(migrated.suggestions[0].rewriteType, "整条重写");
  assert.deepEqual(migrated.accepted, [0]);
});
