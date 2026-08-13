/**
 * Validate and sort preference-based multi-job ranking output.
 */

const clean = (value) => String(value ?? "").trim();

const RECOMMENDATIONS = ["冲", "可接", "保底", "放弃"];

const normalizeGate = (value) => (clean(value) === "淘汰" ? "淘汰" : "pass");

const normalizeRecommendation = (value, gate) => {
  if (gate === "淘汰") return "放弃";
  const next = clean(value);
  return RECOMMENDATIONS.includes(next) ? next : "可接";
};

const toScore = (value, gate) => {
  if (gate === "淘汰") return null;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, Math.round(number * 10) / 10));
};

/**
 * @param {string[]} allowedJobIds
 * @param {unknown} raw
 */
export function validateJobRankAnalysis(allowedJobIds, raw) {
  const allowed = new Set(allowedJobIds.map(String));
  const ranked = Array.isArray(raw?.ranked) ? raw.ranked.flatMap((item) => {
    const jobId = clean(item?.jobId);
    if (!jobId || !allowed.has(jobId)) return [];
    const gate = normalizeGate(item?.gate);
    const score = toScore(item?.score, gate);
    const topContributions = Array.isArray(item?.topContributions)
      ? item.topContributions.map(clean).filter(Boolean).slice(0, 4)
      : [];
    const topGaps = Array.isArray(item?.topGaps)
      ? item.topGaps.map(clean).filter(Boolean).slice(0, 4)
      : [];
    return [{
      jobId,
      gate,
      gateReason: clean(item?.gateReason),
      score,
      recommendation: normalizeRecommendation(item?.recommendation, gate),
      topContributions,
      topGaps,
      note: clean(item?.note),
    }];
  }) : [];

  // Dedupe by jobId (first wins before sort).
  const seen = new Set();
  const unique = ranked.filter((item) => {
    if (seen.has(item.jobId)) return false;
    seen.add(item.jobId);
    return true;
  });

  unique.sort((left, right) => {
    if (left.gate === "淘汰" && right.gate !== "淘汰") return 1;
    if (left.gate !== "淘汰" && right.gate === "淘汰") return -1;
    const leftScore = left.score ?? -1;
    const rightScore = right.score ?? -1;
    return rightScore - leftScore;
  });

  const dimensions = Array.isArray(raw?.dimensions) ? raw.dimensions.flatMap((item) => {
    const jobId = clean(item?.jobId);
    const code = clean(item?.code);
    if (!jobId || !allowed.has(jobId) || !code) return [];
    const supply = Number(item?.supply0to10);
    const weight = Number(item?.weight);
    const contribution = Number(item?.contribution);
    return [{
      jobId,
      code,
      supply0to10: Number.isFinite(supply) ? Math.max(0, Math.min(10, supply)) : 0,
      weight: Number.isFinite(weight) ? weight : 0,
      contribution: Number.isFinite(contribution) ? contribution : 0,
    }];
  }).slice(0, 80) : [];

  return {
    summary: clean(raw?.summary) || "已完成本次多岗择业排序。",
    ranked: unique,
    dimensions,
  };
}
