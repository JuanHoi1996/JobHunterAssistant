import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("spike UX bed page exists and uses experience-unit API", async () => {
  await access(new URL("../app/spike/page.tsx", import.meta.url));
  await access(new URL("../app/spike/extract-resume-text.ts", import.meta.url));
  await access(new URL("../app/api/spike/optimize-resume/route.ts", import.meta.url));
  await access(new URL("../app/spike/experience-unit-analysis.js", import.meta.url));

  const page = await readFile(new URL("../app/spike/page.tsx", import.meta.url), "utf8");
  assert.match(page, /\/api\/spike\/optimize-resume/u);
  assert.match(page, /extractResumeTextFromFile/u);
  assert.match(page, /placementSortRank/u);
  assert.match(page, /\.docx/u);
  assert.match(page, /\.pdf/u);
  assert.match(page, /本次建议不放|omit/u);
  assert.doesNotMatch(page, /exportTailoredResumeWord/u);
  assert.doesNotMatch(page, /WorkspaceShell/u);
});

test("spike extractor covers docx and pdf entry points", async () => {
  const source = await readFile(
    new URL("../app/spike/extract-resume-text.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /mammoth/u);
  assert.match(source, /pdfjs-dist/u);
  assert.match(source, /\.docx/u);
  assert.match(source, /\.pdf/u);
});

test("spike experience-unit prompts forbid paragraph conservation and require experience blocks", async () => {
  const route = await readFile(
    new URL("../app/api/spike/optimize-resume/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(route, /一段经历一张卡/u);
  assert.match(route, /不要求保持段落数量不变|不要求：覆盖简历里每一段经历|不要求段落数量守恒|不要求：机械覆盖繁历每一段/u);
  assert.match(route, /placement/u);
  assert.match(route, /投递版简历，经历区应该长什么样|投递版经历/u);
  assert.match(route, /omit/u);
  assert.match(route, /原文保留/u);
  assert.match(route, /禁止做成 suggestions 卡片|禁止 placement=建议拿下/u);
  assert.match(route, /spike-experience-0\.4/u);
  assert.match(route, /口头保留不算数|生成顺序/u);
  assert.match(route, /maxOutputTokens: 128_000/u);
  assert.match(route, /AiTruncatedOutputError/u);
  assert.doesNotMatch(route, /writeSpikeRunLog|persistRunLog/u);
  assert.doesNotMatch(route, /保持简历段落数量不变/u);
  assert.doesNotMatch(route, /2—5 段经历/u);
});

test("spike experience-unit validation uses resume-shape keep and omit lists", async () => {
  const source = await readFile(
    new URL("../app/spike/experience-unit-analysis.js", import.meta.url),
    "utf8",
  );
  assert.match(source, /omit/u);
  assert.match(source, /原文保留/u);
  assert.doesNotMatch(source, /建议拿下: 3/u);
  assert.match(source, /placementSortRank/u);
});

test("spike persists run logs via Vite Node middleware", async () => {
  const page = await readFile(new URL("../app/spike/page.tsx", import.meta.url), "utf8");
  const runLog = await readFile(new URL("../app/spike/run-log.ts", import.meta.url), "utf8");
  const viteConfig = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");
  const plugin = await readFile(new URL("../build/spike-run-log-vite-plugin.ts", import.meta.url), "utf8");
  assert.match(page, /persistSpikeRunLogFromBrowser/u);
  assert.match(runLog, /\/__dev\/spike-run-log/u);
  assert.match(viteConfig, /spikeRunLogDev/u);
  assert.match(plugin, /outputs.*spike-runs/u);
});

test("spike merges evidence gaps and follow-up questions into one list", async () => {
  const page = await readFile(new URL("../app/spike/page.tsx", import.meta.url), "utf8");
  const helper = await readFile(new URL("../app/merge-gap-asks.js", import.meta.url), "utf8");
  assert.match(page, /mergeGapAsks/u);
  assert.match(page, /证据缺口与追问/u);
  assert.doesNotMatch(page, /<h3>证据缺口<\/h3>/u);
  assert.doesNotMatch(page, /<h3>追问<\/h3>/u);
  assert.match(helper, /question-only/u);
});

test("spike rank page ranks library jobs with preference skill", async () => {
  await access(new URL("../app/spike/rank/page.tsx", import.meta.url));
  await access(new URL("../app/api/spike/rank-jobs/route.ts", import.meta.url));
  await access(new URL("../app/spike/skills/career-preference-elicitation.md", import.meta.url));
  await access(new URL("../docs/skills/career-preference-elicitation.md", import.meta.url));

  const page = await readFile(new URL("../app/spike/rank/page.tsx", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/spike/rank-jobs/route.ts", import.meta.url), "utf8");
  const nav = await readFile(new URL("../app/spike/spike-nav.tsx", import.meta.url), "utf8");
  assert.match(page, /\/api\/spike\/rank-jobs/u);
  assert.match(page, /xiangqian\.jobs\.v1|LOCAL_KEYS\.jobs/u);
  assert.match(page, /PREFERENCE_SKILL_STORAGE_KEY|preference-skill/u);
  assert.match(page, /ELICITATION_SKILL_MARKDOWN/u);
  assert.match(route, /gate/u);
  assert.match(route, /spike-rank-0\.1/u);
  assert.match(route, /validateJobRankAnalysis/u);
  assert.match(nav, /\/spike\/rank/u);
});
