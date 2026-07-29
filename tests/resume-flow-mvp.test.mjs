import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("connects resume center, local storage and grounded job-specific versions", async () => {
  const [page, route] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/optimize-resume/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /type ScreenId = "list" \| "detail" \| "resume-center"/u);
  assert.match(page, /xiangqian\.master-resume\.v1/u);
  assert.match(page, /function ResumeCenter/u);
  assert.match(page, /开始 AI 匹配分析/u);
  assert.match(page, /保存为岗位专属版本/u);
  assert.match(page, /建议 \$\{index \+ 1\} 的修改后表述/u);
  assert.match(page, /已绑定原文·待确认/u);
  assert.doesNotMatch(page, /归类 300\+ 条用户反馈/u);
  assert.match(route, /store: false/u);
  assert.match(route, /oai-authenticated-user-email/u);
  assert.match(route, /validateResumeAnalysis/u);
});
