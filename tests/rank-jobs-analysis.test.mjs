import assert from "node:assert/strict";
import test from "node:test";
import { validateJobRankAnalysis } from "../app/spike/rank-jobs-analysis.js";

test("validateJobRankAnalysis sorts by score and sinks rejected gates", () => {
  const result = validateJobRankAnalysis(["a", "b", "c"], {
    summary: "对比三岗",
    ranked: [
      {
        jobId: "b",
        gate: "pass",
        gateReason: "",
        score: 55,
        recommendation: "可接",
        topContributions: ["自主权"],
        topGaps: ["名"],
        note: "中位",
      },
      {
        jobId: "a",
        gate: "pass",
        gateReason: "",
        score: 82,
        recommendation: "冲",
        topContributions: ["支配权"],
        topGaps: [],
        note: "最贴",
      },
      {
        jobId: "c",
        gate: "淘汰",
        gateReason: "纯执行传送带",
        score: 90,
        recommendation: "冲",
        topContributions: [],
        topGaps: [],
        note: "应放弃",
      },
      {
        jobId: "ghost",
        gate: "pass",
        gateReason: "",
        score: 99,
        recommendation: "冲",
        topContributions: [],
        topGaps: [],
        note: "未知 id 应丢弃",
      },
    ],
    dimensions: [],
  });

  assert.equal(result.ranked.length, 3);
  assert.deepEqual(result.ranked.map((item) => item.jobId), ["a", "b", "c"]);
  assert.equal(result.ranked[2].recommendation, "放弃");
  assert.equal(result.ranked[2].score, null);
});
