const clean = (value) => String(value ?? "").trim();

const exactQuote = (source, value) => {
  const quote = clean(value);
  return quote && source.includes(quote) ? quote : "";
};

const exactQuotes = (source, values, limit = 6) => (
  Array.isArray(values)
    ? [...new Set(values.map((value) => exactQuote(source, value)).filter(Boolean))].slice(0, limit)
    : []
);

const numericTokens = (value) => (
  clean(value).match(/\d+(?:\.\d+)?%?/g) ?? []
);

const doesNotInventNumbers = (evidence, revised) => {
  const allowed = new Set(evidence.flatMap(numericTokens));
  return numericTokens(revised).every((token) => allowed.has(token));
};

const CLAIM_UPGRADE_TERMS = [
  "主导",
  "牵头",
  "独立负责",
  "精通",
  "熟练",
  "实时",
  "显著",
  "大幅",
  "成功推动",
  "全面",
  "深度参与",
  "端到端",
  "从0到1",
  "从 0 到 1",
];

const doesNotUpgradeClaims = (evidence, revised) => (
  CLAIM_UPGRADE_TERMS.every((term) => (
    !revised.includes(term) || evidence.some((quote) => quote.includes(term))
  ))
);

const normalizePriority = (value) => (
  ["核心", "重要", "加分"].includes(clean(value)) ? clean(value) : "重要"
);

const normalizeRewriteType = (value) => (
  ["整条重写", "重点前置", "结构优化", "精简表达"].includes(clean(value))
    ? clean(value)
    : "整条重写"
);

const stringList = (value, fallback = []) => {
  const values = Array.isArray(value) ? value : clean(value) ? [value] : fallback;
  return [...new Set(values.map(clean).filter(Boolean))];
};

const objectList = (value) => (
  Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : []
);

/**
 * Browser-local analyses can outlive the UI schema that created them. This
 * migration keeps a partial V0.8/V0.9 result renderable without treating
 * missing fields as model evidence.
 */
export function normalizeStoredResumeAnalysis(payload) {
  if (!payload || typeof payload !== "object") return undefined;

  const matches = objectList(payload.matches).map((item) => ({
    title: clean(item.title) || "已匹配能力",
    resumeEvidence: stringList(item.resumeEvidence),
    jdEvidence: clean(item.jdEvidence),
    explanation: clean(item.explanation),
  }));

  const gaps = objectList(payload.gaps).map((item) => ({
    title: clean(item.title) || "暂未提供证据",
    jdEvidence: clean(item.jdEvidence),
    reason: clean(item.reason),
    question: clean(item.question),
  }));

  const suggestions = objectList(payload.suggestions).map((item) => {
    const original = clean(item.original);
    return {
      title: clean(item.title) || "优化经历表述",
      rewriteType: normalizeRewriteType(item.rewriteType),
      priority: normalizePriority(item.priority),
      original,
      sourceEvidence: stringList(item.sourceEvidence, original ? [original] : []),
      revised: clean(item.revised),
      jdEvidence: clean(item.jdEvidence),
      reason: clean(item.reason),
      qualityCheck: clean(item.qualityCheck),
    };
  });

  const accepted = Array.isArray(payload.accepted)
    ? [...new Set(payload.accepted.filter((index) => (
      Number.isInteger(index) && index >= 0 && index < suggestions.length
    )))]
    : [];

  return {
    summary: clean(payload.summary) || "已完成基于原始 JD 和所选简历的分析。",
    jdPriorities: objectList(payload.jdPriorities).map((item) => ({
      title: clean(item.title) || "岗位核心要求",
      priority: normalizePriority(item.priority),
      jdEvidence: clean(item.jdEvidence),
      interpretation: clean(item.interpretation),
    })),
    highlights: objectList(payload.highlights).map((item) => ({
      title: clean(item.title) || "候选人亮点",
      sourceEvidence: stringList(item.sourceEvidence),
      value: clean(item.value),
      transferableSkills: stringList(item.transferableSkills),
    })),
    matches,
    gaps,
    questions: objectList(payload.questions).map((item) => ({
      question: clean(item.question),
      why: clean(item.why),
      jdEvidence: clean(item.jdEvidence),
    })),
    suggestions,
    accepted,
  };
}

export function validateResumeBlueprint(resumeText, jdText, payload) {
  const resume = clean(resumeText);
  const jd = clean(jdText);
  const raw = payload && typeof payload === "object" ? payload : {};

  const jdPriorities = Array.isArray(raw.jdPriorities) ? raw.jdPriorities.flatMap((item) => {
    const jdEvidence = exactQuote(jd, item?.jdEvidence);
    if (!jdEvidence) return [];
    return [{
      title: clean(item?.title) || "岗位核心要求",
      priority: normalizePriority(item?.priority),
      jdEvidence,
      interpretation: clean(item?.interpretation),
    }];
  }).slice(0, 6) : [];

  const highlights = Array.isArray(raw.highlights) ? raw.highlights.flatMap((item) => {
    const sourceEvidence = exactQuotes(resume, item?.sourceEvidence);
    if (!sourceEvidence.length) return [];
    return [{
      title: clean(item?.title) || "候选人亮点",
      sourceEvidence,
      value: clean(item?.value),
      transferableSkills: Array.isArray(item?.transferableSkills)
        ? item.transferableSkills.map(clean).filter(Boolean).slice(0, 5)
        : [],
    }];
  }).slice(0, 8) : [];

  const gaps = Array.isArray(raw.gaps) ? raw.gaps.flatMap((item) => {
    const jdEvidence = exactQuote(jd, item?.jdEvidence);
    if (!jdEvidence) return [];
    return [{
      title: clean(item?.title) || "暂未提供证据",
      jdEvidence,
      reason: clean(item?.reason) || "当前简历中没有找到可靠证据。",
      question: clean(item?.question),
    }];
  }).slice(0, 6) : [];

  return { jdPriorities, highlights, gaps };
}

export function validateResumeAnalysis(resumeText, jdText, payload, blueprint = {}) {
  const resume = clean(resumeText);
  const jd = clean(jdText);
  const raw = payload && typeof payload === "object" ? payload : {};
  const safeBlueprint = validateResumeBlueprint(resume, jd, blueprint);

  const matches = Array.isArray(raw.matches) ? raw.matches.flatMap((item) => {
    const resumeEvidence = exactQuotes(resume, item?.resumeEvidence);
    const jdEvidence = exactQuote(jd, item?.jdEvidence);
    if (!resumeEvidence.length || !jdEvidence) return [];
    return [{
      title: clean(item?.title) || "已匹配能力",
      resumeEvidence,
      jdEvidence,
      explanation: clean(item?.explanation),
    }];
  }).slice(0, 6) : [];

  const gaps = Array.isArray(raw.gaps) ? raw.gaps.flatMap((item) => {
    const jdEvidence = exactQuote(jd, item?.jdEvidence);
    if (!jdEvidence) return [];
    return [{
      title: clean(item?.title) || "暂未提供证据",
      jdEvidence,
      reason: clean(item?.reason) || "当前简历中没有找到可靠证据。",
      question: clean(item?.question),
    }];
  }).slice(0, 6) : safeBlueprint.gaps;

  const questions = Array.isArray(raw.questions) ? raw.questions.flatMap((item) => {
    const jdEvidence = exactQuote(jd, item?.jdEvidence);
    const question = clean(item?.question);
    if (!jdEvidence || !question) return [];
    return [{
      question,
      why: clean(item?.why),
      jdEvidence,
    }];
  }).slice(0, 6) : [];

  const suggestions = Array.isArray(raw.suggestions) ? raw.suggestions.flatMap((item) => {
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
      title: clean(item?.title) || "优化经历表述",
      rewriteType: normalizeRewriteType(item?.rewriteType),
      priority: normalizePriority(item?.priority),
      original,
      sourceEvidence: groundedEvidence,
      revised,
      jdEvidence,
      reason: clean(item?.reason),
      qualityCheck: clean(item?.qualityCheck),
    }];
  }).slice(0, 8) : [];

  return {
    summary: clean(raw.summary) || "已完成基于原始 JD 和所选简历的两阶段分析。",
    jdPriorities: safeBlueprint.jdPriorities,
    highlights: safeBlueprint.highlights,
    matches,
    gaps,
    questions,
    suggestions,
  };
}
