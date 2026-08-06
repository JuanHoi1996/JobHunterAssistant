import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type SpikeRunLogPayload = {
  pipelineVersion: string;
  provider: string;
  model: string;
  stage?: string;
  ok: boolean;
  error?: string;
  durationMs?: number;
  jdText: string;
  resumeText: string;
  analysis?: unknown;
};

/**
 * Persist one spike analyze run under outputs/spike-runs/ for offline review.
 * Local-only; directory is gitignored except README.
 */
export async function writeSpikeRunLog(payload: SpikeRunLogPayload) {
  const dir = path.join(process.cwd(), "outputs", "spike-runs");
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/gu, "-");
  const fileName = `${stamp}-${payload.ok ? "ok" : "fail"}.json`;
  const filePath = path.join(dir, fileName);
  const body = {
    savedAt: new Date().toISOString(),
    ...payload,
    jdChars: payload.jdText.length,
    resumeChars: payload.resumeText.length,
  };
  await writeFile(filePath, `${JSON.stringify(body, null, 2)}\n`, "utf8");
  return {
    fileName,
    relativePath: path.join("outputs", "spike-runs", fileName).replace(/\\/gu, "/"),
  };
}
