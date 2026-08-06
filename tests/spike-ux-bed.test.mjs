import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("spike UX bed page exists and reuses optimize-resume", async () => {
  await access(new URL("../app/spike/page.tsx", import.meta.url));
  await access(new URL("../app/spike/extract-resume-text.ts", import.meta.url));

  const page = await readFile(new URL("../app/spike/page.tsx", import.meta.url), "utf8");
  assert.match(page, /\/api\/optimize-resume/u);
  assert.match(page, /extractResumeTextFromFile/u);
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
