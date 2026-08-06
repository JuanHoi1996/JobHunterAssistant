/**
 * Spike-only validation for experience-block suggestions.
 * Differs from main resume-analysis: placement sort key, no paragraph conservation.
 */

const clean = (value) => String(value ?? "").trim();

const exactQuote = (source, value) => {
  const quote = clean(value);
  return quote && source.includes(quote) ? quote : "";
};

const exactQuotes = (source, values, limit = 8) => (
  Array.isArray(values)
    ? [...new Set(values.map((value) => exactQuote(source, value)).filter(Boolean))].slice(0, limit)
    : []
);

const numericTokens = (value) => clean(value).match(/\d+(?:\.\d+)?%?/g) ?? [];

const doesNotInventNumbers = (evidence, revised) => {
  const allowed = new Set(evidence.flatMap(numericTokens));
  return numericTokens(revised).every((token) => allowed.has(token));
};

const CLAIM_UPGRADE_TERMS = [
  "主导", "牵头", "独立负责", "精通", "熟练", "实时", "显著", "大幅",
  "成功推动", "全面", "深度参与", "端到端", "从0到1", "从 0 到 1",
];

const doesNotUpgradeClaims = (evidence, revised) => (
  CLAIM_UPGRADE_TERMS.every((term) => (
    !revised.includes(term) || evidence.some((quote) => quote.includes(term))
  ))
);

const PLACEMENTS = ["前置", "中位", "后置", "建议拿下"];
const REWRITE_TYPES = ["整段重写", "要点重排", "取舍压缩", "重点前置"];

export const placementSortRank = {
  前置: 0,
  中位: 1,
  后置: 2,
  建议拿下: 3,
};

const normalizePlacement = (value) => (
  PLACEMENTS.includes(clean(value)) ? clean(value) : "中位"
);

const normalizeRewriteType = (value) => (
  REWRITE_TYPES.includes(clean(value)) ? clean(value) : "整段重写"
);

const normalizeJdFit = (value) => (
  ["核心", "重要", "加分"].includes(clean(value)) ? clean(value) : "重要"
);

/**
 * Validate spike experience-unit rewrite output.
 * original must be one continuous experience block from the resume.
 */
export function validateExperienceUnitAnalysis(resume, jd, raw, blueprint) {
  const safeBlueprint = blueprint && typeof blueprint === "object"
    ? blueprint
    : { jdPriorities: [], highlights: [], gaps: [] };

  const matches = Array.isArray(raw?.matches) ? raw.matches.flatMap((item) => {
    const resumeEvidence = exactQuotes(resume, item?.resumeEvidence);
    const jdEvidence = exactQuote(jd, item?.jdEvidence);
    if (!resumeEvidence.length || !jdEvidence) return [];
    return [{
      title: clean(item?.title) || "已匹配能力",
      resumeEvidence,
      jdEvidence,
      explanation: clean(item?.explanation),
    }];
  }).slice(0, 8) : [];

  const gaps = Array.isArray(raw?.gaps) && raw.gaps.length
    ? raw.gaps.flatMap((item) => {
      const jdEvidence = exactQuote(jd, item?.jdEvidence);
      if (!jdEvidence) return [];
      return [{
        title: clean(item?.title) || "暂未提供证据",
        jdEvidence,
        reason: clean(item?.reason) || "当前简历中没有找到可靠证据。",
        question: clean(item?.question),
      }];
    }).slice(0, 6)
    : safeBlueprint.gaps;

  const questions = Array.isArray(raw?.questions) ? raw.questions.flatMap((item) => {
    const jdEvidence = exactQuote(jd, item?.jdEvidence);
    const question = clean(item?.question);
    if (!jdEvidence || !question) return [];
    return [{ question, why: clean(item?.why), jdEvidence }];
  }).slice(0, 6) : [];

  const suggestions = Array.isArray(raw?.suggestions) ? raw.suggestions.flatMap((item) => {
    const original = exactQuote(resume, item?.original);
    const sourceEvidence = exactQuotes(resume, item?.sourceEvidence);
    const jdEvidence = exactQuote(jd, item?.jdEvidence);
    const revised = clean(item?.revised);
    const groundedEvidence = [...new Set([original, ...sourceEvidence].filter(Boolean))];
    if (
      !original
      || !jdEvidence
      || !revised
      || revised === original
      || !doesNotInventNumbers(groundedEvidence, revised)
      || !doesNotUpgradeClaims(groundedEvidence, revised)
    ) return [];
    return [{
      title: clean(item?.title) || "优化任职经历",
      rewriteType: normalizeRewriteType(item?.rewriteType),
      placement: normalizePlacement(item?.placement),
      jdFit: normalizeJdFit(item?.jdFit ?? item?.priority),
      original,
      sourceEvidence: groundedEvidence,
      revised,
      jdEvidence,
      reason: clean(item?.reason),
      qualityCheck: clean(item?.qualityCheck),
    }];
  }).slice(0, 8) : [];

  return {
    summary: clean(raw?.summary) || "已完成以任职经历为单位的测床分析。",
    jdPriorities: safeBlueprint.jdPriorities,
    highlights: safeBlueprint.highlights,
    matches,
    gaps,
    questions,
    suggestions,
  };
}
