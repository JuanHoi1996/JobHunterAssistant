import assert from "node:assert/strict";
import test from "node:test";

import { validateResumeAnalysis } from "../app/resume-analysis.js";

const resume = "用户运营实习：整理300条用户反馈，输出每周问题报告。";
const jd = "岗位职责：分析用户反馈并提出产品优化建议。";

test("accepts grounded resume matches and rewrites", () => {
  const result = validateResumeAnalysis(resume, jd, {
    summary: "具备用户反馈分析经验。",
    matches: [{
      title: "用户反馈分析",
      resumeEvidence: "整理300条用户反馈",
      jdEvidence: "分析用户反馈",
      explanation: "经历与岗位要求直接对应。",
    }],
    gaps: [],
    suggestions: [{
      title: "突出分析对象",
      original: "整理300条用户反馈，输出每周问题报告",
      revised: "整理300条用户反馈并输出每周问题报告",
      jdEvidence: "分析用户反馈",
      reason: "让动作更紧凑。",
    }],
  });

  assert.equal(result.matches.length, 1);
  assert.equal(result.suggestions.length, 1);
});

test("rejects missing evidence and invented numbers", () => {
  const result = validateResumeAnalysis(resume, jd, {
    summary: "测试",
    matches: [{
      title: "不存在",
      resumeEvidence: "主导产品迭代",
      jdEvidence: "分析用户反馈",
      explanation: "没有依据",
    }],
    gaps: [{
      title: "产品建议",
      jdEvidence: "提出产品优化建议",
      reason: "简历未提供证据",
    }],
    suggestions: [{
      title: "虚构数据",
      original: "整理300条用户反馈",
      revised: "整理300条用户反馈并推动5项产品优化",
      jdEvidence: "提出产品优化建议",
      reason: "错误增加数字",
    }],
  });

  assert.equal(result.matches.length, 0);
  assert.equal(result.gaps.length, 1);
  assert.equal(result.suggestions.length, 0);
});
