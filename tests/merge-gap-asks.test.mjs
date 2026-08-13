import assert from "node:assert/strict";
import test from "node:test";
import { mergeGapAsks } from "../app/merge-gap-asks.js";

test("mergeGapAsks prefers gap rows and drops duplicate questions", () => {
  const merged = mergeGapAsks(
    [
      {
        title: "供应链经验",
        reason: "简历未写供应链项目",
        jdEvidence: "供应链预测",
        question: "有没有相关课设或实习？",
      },
    ],
    [
      {
        question: "有没有相关课设或实习？",
        why: "JD 核心是供应链",
        jdEvidence: "供应链预测",
      },
      {
        question: "SQL 在哪个项目里用过？",
        why: "技能写了 SQL 但无证据",
        jdEvidence: "熟练使用 SQL",
      },
    ],
  );

  assert.equal(merged.length, 2);
  assert.equal(merged[0].from, "gap");
  assert.equal(merged[0].title, "供应链经验");
  assert.equal(merged[1].from, "question-only");
  assert.equal(merged[1].question, "SQL 在哪个项目里用过？");
});
