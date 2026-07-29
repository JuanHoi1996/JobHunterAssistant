const clean = (value) => String(value ?? "").trim();

const exactQuote = (source, value) => {
  const quote = clean(value);
  return quote && source.includes(quote) ? quote : "";
};

const numericTokens = (value) => (
  clean(value).match(/\d+(?:\.\d+)?%?/g) ?? []
);

const doesNotInventNumbers = (original, revised) => {
  const allowed = new Set(numericTokens(original));
  return numericTokens(revised).every((token) => allowed.has(token));
};

export function validateResumeAnalysis(resumeText, jdText, payload) {
  const resume = clean(resumeText);
  const jd = clean(jdText);
  const raw = payload && typeof payload === "object" ? payload : {};

  const matches = Array.isArray(raw.matches) ? raw.matches.flatMap((item) => {
    const resumeEvidence = exactQuote(resume, item?.resumeEvidence);
    const jdEvidence = exactQuote(jd, item?.jdEvidence);
    if (!resumeEvidence || !jdEvidence) return [];
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
    }];
  }).slice(0, 6) : [];

  const suggestions = Array.isArray(raw.suggestions) ? raw.suggestions.flatMap((item) => {
    const original = exactQuote(resume, item?.original);
    const jdEvidence = exactQuote(jd, item?.jdEvidence);
    const revised = clean(item?.revised);
    if (!original || !jdEvidence || !revised || !doesNotInventNumbers(original, revised)) return [];
    return [{
      title: clean(item?.title) || "优化经历表述",
      original,
      revised,
      jdEvidence,
      reason: clean(item?.reason),
    }];
  }).slice(0, 8) : [];

  return {
    summary: clean(raw.summary) || "已完成基于原始 JD 和主简历的事实校验。",
    matches,
    gaps,
    suggestions,
  };
}
