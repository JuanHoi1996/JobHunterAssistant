import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps JD text as the only available MVP intake method", async () => {
  const [panels, css] = await Promise.all([
    readFile(new URL("../app/workspace/panels.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(panels, /useState<CaptureMethod>\("JD 文本"\)/u);
  assert.match(panels, /粘贴岗位链接[\s\S]*available: false/u);
  assert.match(panels, /粘贴 JD 文本[\s\S]*available: true/u);
  assert.match(panels, /上传岗位截图[\s\S]*available: false/u);
  assert.match(panels, /插件一键保存[\s\S]*available: false/u);
  assert.match(panels, /功能尚未开放，请先粘贴 JD 文本/u);
  assert.match(panels, /aria-disabled=\{!item\.available\}/u);
  assert.match(css, /\.capture-method\.unavailable/u);
  assert.match(css, /\.coming-soon-notice/u);
});

test("permits AI testing only on a non-production localhost request without weakening published access control", async () => {
  const route = await readFile(new URL("../app/api/extract-job/route.ts", import.meta.url), "utf8");

  assert.match(route, /process\.env\.NODE_ENV !== "production"/u);
  assert.match(route, /hostname === "localhost"/u);
  assert.match(route, /oai-authenticated-user-email/u);
});
