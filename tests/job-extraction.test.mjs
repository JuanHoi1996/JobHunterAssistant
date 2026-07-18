import assert from "node:assert/strict";
import test from "node:test";

import { mergeModelExtraction } from "../app/job-extraction.js";
import { parseJobText } from "../app/job-parser.js";

const jd = `邮箱有更正：
急急急招继任🔥TikTok AI 产品经理 日常实习base 北京
简历欢迎投递邮箱📮：1371906748@qq.com`;

const field = (value, evidence, basis = "explicit", confidence = "high", reason = "原文明确") => ({
  value,
  evidence,
  basis,
  confidence,
  reason,
});

test("accepts a grounded semantic company inference", () => {
  const fallback = parseJobText(jd);
  const merged = mergeModelExtraction(jd, fallback, {
    fields: {
      company: field("字节跳动", "TikTok", "inferred", "medium", "TikTok 为字节跳动旗下产品"),
      title: field("TikTok AI 产品经理", "TikTok AI 产品经理"),
      location: field("北京", "base 北京"),
      employment: field("实习", "日常实习", "inferred", "medium"),
      category: field("产品", "产品经理", "inferred", "medium"),
      primaryEmail: field("1371906748@qq.com", "1371906748@qq.com"),
      ccEmail: field("", "", "unknown", "low"),
    },
  });

  assert.equal(merged.company, "字节跳动");
  assert.equal(merged.fieldMeta.company.source, "llm");
  assert.equal(merged.fieldMeta.company.basis, "inferred");
  assert.equal(merged.fieldMeta.company.evidence, "TikTok");
});

test("rejects a model field whose evidence does not exist in the JD", () => {
  const fallback = parseJobText(jd);
  const merged = mergeModelExtraction(jd, fallback, {
    fields: {
      company: field("腾讯", "腾讯招聘", "inferred", "medium", "模型猜测"),
    },
  });

  assert.equal(merged.company, fallback.company);
  assert.equal(merged.fieldMeta.company.source, "rule");
  assert.doesNotMatch(merged.company, /腾讯/u);
});
