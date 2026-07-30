import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("connects resume center, local storage and grounded job-specific versions", async () => {
  const [page, route, template] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/optimize-resume/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/resume-template.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /type ScreenId = "list" \| "detail" \| "resume-center"/u);
  assert.match(page, /xiangqian\.resumes\.v2/u);
  assert.match(page, /xiangqian\.resume-selections\.v1/u);
  assert.match(page, /xiangqian\.resume-analyses\.v2/u);
  assert.match(page, /function ResumeCenter/u);
  assert.match(page, /用于本岗位分析的简历/u);
  assert.match(page, /resumes\.map/u);
  assert.match(page, /resumeAnalysisKey/u);
  assert.match(page, /开始两阶段 AI 分析/u);
  assert.match(page, /JD 能力优先级/u);
  assert.match(page, /原简历可放大的亮点/u);
  assert.match(page, /值得向你追问的信息/u);
  assert.match(page, /完成修改并保存版本/u);
  assert.match(page, /extractRawText/u);
  assert.match(page, /saveResumeTemplate/u);
  assert.match(page, /当前岗位缺少真实 JD/u);
  assert.match(page, /简历中心已读取 \$\{resumes\.length\} 份简历/u);
  assert.match(page, /岗位专属简历完整编辑框/u);
  assert.match(page, /下载原模板 Word/u);
  assert.match(page, /纯文本 PDF/u);
  assert.match(page, /退出并切换 ChatGPT 账号/u);
  assert.match(page, /建议 \$\{index \+ 1\} 的修改后表述/u);
  assert.match(page, /已绑定原文·待确认/u);
  assert.doesNotMatch(page, /归类 300\+ 条用户反馈/u);
  assert.doesNotMatch(page, /高于同类候选人/u);
  assert.doesNotMatch(page, /约 68%/u);
  assert.match(route, /completeJson/u);
  assert.match(route, /oai-authenticated-user-email/u);
  assert.match(route, /isLocalDevelopmentRequest/u);
  assert.match(route, /validateResumeAnalysis/u);
  assert.match(route, /validateResumeBlueprint/u);
  assert.match(route, /RESUME_SKILL_EXTENSION/u);
  assert.match(route, /pipelineVersion: "0\.9"/u);
  assert.match(template, /window\.indexedDB/u);
  assert.match(template, /word\/document\.xml/u);
  assert.match(template, /getResumeTemplate\(resumeId\)/u);
  assert.match(template, /exportTailoredResumeWord/u);
});
