/**
 * Spike-only validation for experience-block suggestions.
 * Resume-shape mode: suggestions = keep list; omit = leave out of this application version.
 */

const clean = (value) => String(value ?? "").trim();

const foldWs = (value) => clean(value).replace(/[\s\u00a0\u3000]+/gu, " ");

/**
 * Exact quote with NBSP / whitespace tolerance; returns a real substring of source when possible.
 */
const exactQuote = (source, value) => {
  const quote = clean(value);
  if (!quote) return "";
  if (source.includes(quote)) return quote;

  const foldedSource = foldWs(source);
  const foldedQuote = foldWs(quote);
  if (!foldedQuote || !foldedSource.includes(foldedQuote)) return "";

  // Recover a source slice by scanning with folded comparison (resume is small).
  const normChar = (ch) => (/[\s\u00a0\u3000]/u.test(ch) ? " " : ch);
  let start = -1;
  for (let i = 0; i < source.length; i += 1) {
    let si = i;
    let qi = 0;
    let matched = true;
    while (qi < quote.length && si < source.length) {
      const sCh = normChar(source[si]);
      const qCh = normChar(quote[qi]);
      if (/\s/u.test(sCh) && /\s/u.test(qCh)) {
        while (si < source.length && /\s/u.test(normChar(source[si]))) si += 1;
        while (qi < quote.length && /\s/u.test(normChar(quote[qi]))) qi += 1;
        continue;
      }
      if (sCh !== qCh) {
        matched = false;
        break;
      }
      si += 1;
      qi += 1;
    }
    if (matched && qi >= quote.length) {
      start = i;
      return source.slice(start, si);
    }
  }
  return "";
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

const PLACEMENTS = ["前置", "中位", "后置"];
const REWRITE_TYPES = ["原文保留", "整段重写", "要点重排", "取舍压缩", "重点前置"];

export const placementSortRank = {
  前置: 0,
  中位: 1,
  后置: 2,
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

/** Split 实习/项目经历 into header→next-header blocks. */
export function splitExperienceBlocks(resume) {
  let body = String(resume ?? "");
  const start = body.search(/实习与项目经历|工作经历|项目经历/u);
  if (start >= 0) body = body.slice(start);
  const end = body.search(/\n专业技能|\n教育背景|\n自我评价/u);
  if (end >= 0) body = body.slice(0, end);

  const lines = body.split(/\n/u);
  const headerIdx = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line || line.length > 140) continue;
    if (/^技术栈/u.test(line)) continue;
    if (/实习与项目经历|工作经历|项目经历/u.test(line) && !line.includes("|")) continue;
    const isHeader = (
      (line.includes("|") && /实习|项目|独立开发|研究员|成员/u.test(line))
      || /独立开发者|量化研究员|项目成员|实习生集训营成员/u.test(line)
    );
    if (isHeader) headerIdx.push(i);
  }

  const blocks = [];
  for (let h = 0; h < headerIdx.length; h += 1) {
    const from = headerIdx[h];
    const to = h + 1 < headerIdx.length ? headerIdx[h + 1] : lines.length;
    const block = lines.slice(from, to).join("\n").trim();
    if (block.length >= 30) blocks.push(block);
  }
  return blocks;
}

const findBlockForEvidence = (blocks, evidence) => {
  const needle = foldWs(evidence);
  if (!needle) return "";
  return blocks.find((block) => foldWs(block).includes(needle)) || "";
};

const pickJdEvidence = (jd, blueprint) => {
  for (const item of blueprint?.jdPriorities || []) {
    const hit = exactQuote(jd, item?.jdEvidence);
    if (hit) return hit;
  }
  for (const candidate of [
    "固定收益方向-投资交易",
    "具备良好的数据处理和编程能力，具备策略研发能力优先。",
    "具备良好的市场分析能力，以及债券和衍生品定价能力，熟悉金融市场。",
  ]) {
    const hit = exactQuote(jd, candidate);
    if (hit) return hit;
  }
  const line = clean(jd).split(/\n/u).map((part) => part.trim()).find((part) => part.length >= 12);
  return line && jd.includes(line) ? line : "";
};

/**
 * Blueprint highlights that map to an experience block must appear in suggestions.
 * Covers the failure mode: summary says「保留中金」but no keep card was emitted.
 */
export function ensureHighlightKeepSuggestions(resume, jd, suggestions, omit, blueprint) {
  const blocks = splitExperienceBlocks(resume);
  if (!blocks.length) return suggestions;

  const covered = new Set([
    ...suggestions.map((item) => foldWs(item.original)),
    ...omit.map((item) => foldWs(item.original)),
  ]);

  const jdEvidence = pickJdEvidence(jd, blueprint);
  if (!jdEvidence) return suggestions;

  const injected = [];
  for (const highlight of blueprint?.highlights || []) {
    for (const evidence of highlight?.sourceEvidence || []) {
      const block = findBlockForEvidence(blocks, evidence);
      if (!block || covered.has(foldWs(block))) continue;
      covered.add(foldWs(block));
      const titleLine = block.split(/\n/u)[0]?.trim() || clean(highlight?.title) || "保留经历";
      injected.push({
        title: titleLine.slice(0, 80),
        rewriteType: "原文保留",
        placement: "前置",
        jdFit: "核心",
        original: block,
        sourceEvidence: [block, ...exactQuotes(resume, highlight.sourceEvidence, 4)],
        revised: block,
        jdEvidence,
        reason: `蓝图亮点「${clean(highlight?.title) || "强相关经历"}」对应本段，投递版必须保留；模型未出卡，已自动补为原文保留。`,
        qualityCheck: "server-ensured keep from blueprint highlight",
      });
      break;
    }
  }

  return [...injected, ...suggestions].slice(0, 8);
}

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

  let suggestions = Array.isArray(raw?.suggestions) ? raw.suggestions.flatMap((item) => {
    const original = exactQuote(resume, item?.original);
    const sourceEvidence = exactQuotes(resume, item?.sourceEvidence);
    const jdEvidence = exactQuote(jd, item?.jdEvidence);
    const revisedRaw = clean(item?.revised);
    const rewriteType = normalizeRewriteType(item?.rewriteType);
    const groundedEvidence = [...new Set([original, ...sourceEvidence].filter(Boolean))];
    // Prefer resume-canonical original; allow revised whitespace-equal to original.
    const revised = revisedRaw && original && foldWs(revisedRaw) === foldWs(original)
      ? original
      : revisedRaw;
    if (
      !original
      || !jdEvidence
      || !revised
      || !doesNotInventNumbers(groundedEvidence, revised)
      || !doesNotUpgradeClaims(groundedEvidence, revised)
    ) return [];
    if (clean(item?.placement) === "建议拿下") return [];
    return [{
      title: clean(item?.title) || "优化任职经历",
      rewriteType: foldWs(revised) === foldWs(original) && rewriteType !== "原文保留"
        ? "原文保留"
        : rewriteType,
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

  const experienceBlocks = splitExperienceBlocks(resume);
  const omit = Array.isArray(raw?.omit) ? raw.omit.flatMap((item) => {
    const title = clean(item?.title);
    const reason = clean(item?.reason);
    if (!title || !reason) return [];
    let original = exactQuote(resume, item?.original);
    if (!original) {
      const byTitle = experienceBlocks.find((block) => (
        foldWs(block).includes(foldWs(title))
        || foldWs(title).includes(foldWs(block.split(/\n/u)[0] || ""))
      ));
      original = byTitle || title;
    }
    return [{ title, original, reason }];
  }).slice(0, 12) : [];

  suggestions = ensureHighlightKeepSuggestions(
    resume,
    jd,
    suggestions,
    omit,
    safeBlueprint,
  );

  return {
    summary: clean(raw?.summary) || "已完成以任职经历为单位的投递版编排。",
    jdPriorities: safeBlueprint.jdPriorities,
    highlights: safeBlueprint.highlights,
    matches,
    gaps,
    questions,
    suggestions,
    omit,
  };
}
