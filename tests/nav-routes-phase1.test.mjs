import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

/** Mirrors app/workspace/navigation.ts for unit coverage without a TS loader. */
function shouldInterceptClientNavigation(event) {
  return event.button === 0
    && !event.metaKey
    && !event.ctrlKey
    && !event.shiftKey
    && !event.altKey;
}

test("phase-1 route files exist for jobs, job detail, and resumes", async () => {
  await Promise.all([
    access(new URL("../app/jobs/page.tsx", import.meta.url)),
    access(new URL("../app/jobs/[jobId]/page.tsx", import.meta.url)),
    access(new URL("../app/resumes/page.tsx", import.meta.url)),
  ]);

  const rootPage = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(rootPage, /redirect\(["']\/jobs["']\)/u);
});

test("invalid job id shows an empty state that links back to /jobs", async () => {
  const detail = await readFile(
    new URL("../app/workspace/job-detail-view.tsx", import.meta.url),
    "utf8",
  );

  assert.match(detail, /未找到该岗位/u);
  assert.match(detail, /href=["']\/jobs["']/u);
  assert.match(detail, /storageReady/u);
});

test("job workspace tabs keep native new-tab semantics for modified clicks", async () => {
  const [navigation, detail] = await Promise.all([
    readFile(new URL("../app/workspace/navigation.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/workspace/job-detail-view.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(navigation, /export function shouldInterceptClientNavigation/u);
  assert.match(detail, /shouldInterceptClientNavigation\(event\)/u);
  assert.match(detail, /if \(!shouldInterceptClientNavigation\(event\)\) return/u);

  assert.equal(
    shouldInterceptClientNavigation({ button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false }),
    true,
  );
  assert.equal(
    shouldInterceptClientNavigation({ button: 0, metaKey: true, ctrlKey: false, shiftKey: false, altKey: false }),
    false,
  );
  assert.equal(
    shouldInterceptClientNavigation({ button: 0, metaKey: false, ctrlKey: true, shiftKey: false, altKey: false }),
    false,
  );
  assert.equal(
    shouldInterceptClientNavigation({ button: 1, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false }),
    false,
  );
});

test("workspace shell uses Link for primary navigation targets", async () => {
  const shell = await readFile(
    new URL("../app/workspace/workspace-shell.tsx", import.meta.url),
    "utf8",
  );

  assert.match(shell, /href=["']\/jobs["']/u);
  assert.match(shell, /href=["']\/resumes["']/u);
  assert.match(shell, /href=\{`\/jobs\/\$\{job\.id\}`\}/u);
});

test("overview CTAs to resume tab are real links for new-tab open", async () => {
  const [panels, jobTabLink] = await Promise.all([
    readFile(new URL("../app/workspace/panels.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/workspace/job-tab-link.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(jobTabLink, /export function JobTabLink/u);
  assert.match(jobTabLink, /shouldInterceptClientNavigation\(event\)/u);
  assert.match(jobTabLink, /tab=\$\{tab\}/u);

  assert.match(panels, /JobTabLink jobId=\{job\.id\} tab="resume"/u);
  assert.match(panels, /去简历定制/u);
  assert.match(panels, /开始优化简历/u);
  assert.doesNotMatch(panels, /onClick=\{\(\) => onOpenTab\("resume"\)\}/u);
});
