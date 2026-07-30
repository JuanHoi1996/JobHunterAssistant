import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveParagraphUpdates,
  normalizeComparableText,
  splitResumeParagraphs,
} from "../app/docx-template.js";

test("splits resume text into stable non-empty paragraphs", () => {
  assert.deepEqual(
    splitResumeParagraphs(" 姓名 \r\n\r\n 项目经历\n负责交付 \n"),
    ["姓名", "项目经历", "负责交付"],
  );
});

test("derives one safe fragment replacement inside a paragraph", () => {
  const updates = deriveParagraphUpdates(
    "教育背景\n负责项目并交付结果\n技能",
    "教育背景\n负责项目、协调资源并交付结果\n技能",
  );

  assert.equal(updates.length, 1);
  assert.equal(updates[0].index, 1);
  assert.equal(updates[0].oldFragment, "");
  assert.equal(updates[0].newFragment, "、协调资源");
  assert.equal(updates[0].sourceOffset, 4);
});

test("derives a replacement without rewriting unchanged prefix and suffix", () => {
  const [update] = deriveParagraphUpdates(
    "负责分析用户反馈并输出周报。",
    "负责分析业务数据并输出周报。",
  );

  assert.equal(update.oldFragment, "用户反馈");
  assert.equal(update.newFragment, "业务数据");
});

test("rejects adding or deleting whole paragraphs", () => {
  assert.throws(
    () => deriveParagraphUpdates("第一段\n第二段", "第一段\n新增段\n第二段"),
    /新增或删除了整段内容/u,
  );
});

test("normalizes Word tabs and visual whitespace for matching", () => {
  assert.equal(
    normalizeComparableText("同济大学\t知识产权法学 硕士"),
    normalizeComparableText("同济大学  知识产权法学\n硕士"),
  );
});
