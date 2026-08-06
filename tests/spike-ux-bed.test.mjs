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
  assert.match(route, /不要求保持段落数量不变|不要求：覆盖简历里每一段经历|不要求段落数量守恒/u);
  assert.match(route, /placement/u);
  assert.match(route, /建议拿下/u);
  assert.match(route, /自由裁量权|运用之妙存乎一心/u);
  assert.match(route, /writeSpikeRunLog/u);
  assert.doesNotMatch(route, /保持简历段落数量不变/u);
  assert.doesNotMatch(route, /2—5 段经历/u);
});
