export type SpikeRunLogPayload = {
  pipelineVersion: string;
  provider: string;
  model: string;
  stage?: string;
  ok: boolean;
  error?: string;
  durationMs?: number;
  /** "resume" (default) or "rank" */
  kind?: "resume" | "rank";
  jdText?: string;
  resumeText?: string;
  preferenceSkill?: string;
  jobs?: { id: string; company: string; title: string; rawJd: string }[];
  analysis?: unknown;
  /** Truncated model text on parse failures — useful when JSON was cut mid-stream. */
  modelOutputPreview?: string;
};

export type SpikeRunLogBody = SpikeRunLogPayload & {
  savedAt?: string;
  jdChars: number;
  resumeChars: number;
  preferenceSkillChars?: number;
  jobCount?: number;
};

/** Build the offline review payload (no disk I/O). */
export function buildSpikeRunLog(payload: SpikeRunLogPayload): SpikeRunLogBody {
  return {
    ...payload,
    kind: payload.kind ?? "resume",
    jdText: payload.jdText ?? "",
    resumeText: payload.resumeText ?? "",
    jdChars: (payload.jdText ?? "").length,
    resumeChars: (payload.resumeText ?? "").length,
    preferenceSkillChars: payload.preferenceSkill?.length,
    jobCount: payload.jobs?.length,
  };
}

/**
 * Persist via Vite Node middleware — Workers VFS cannot write the project tree.
 * Call from the browser after spike API returns.
 */
export async function persistSpikeRunLogFromBrowser(runLog: SpikeRunLogBody) {
  const response = await fetch("/__dev/spike-run-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(runLog),
  });
  const payload = await response.json() as { relativePath?: string; error?: string };
  if (!response.ok || !payload.relativePath) {
    throw new Error(payload.error || "Spike run log persist failed");
  }
  return { relativePath: payload.relativePath };
}
