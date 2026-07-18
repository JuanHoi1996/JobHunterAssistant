const CATEGORIES = new Set(["产品 / 运营", "运营", "产品", "法务", "市场", "销售", "职能", "技术", "其他"]);
const EMPLOYMENT_TYPES = new Set(["实习", "全职", "兼职", "其他", ""]);
const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/iu;

const stripOuterQuotes = (value) => String(value ?? "")
  .trim()
  .replace(/^[“”‘’"']+|[“”‘’"']+$/gu, "")
  .trim();

const fieldBasis = (rawText, value, fieldName) => {
  if (!value) return "unknown";
  if (fieldName === "employment" || fieldName === "category") return "inferred";
  return rawText.includes(value) ? "explicit" : "inferred";
};

export function buildRuleFieldMeta(rawText, fallback) {
  const make = (fieldName, value, evidence) => ({
    basis: fieldBasis(rawText, value, fieldName),
    confidence: value && evidence ? "medium" : "low",
    evidence: evidence ?? "",
    reason: value ? "由本地规则从原文中识别，仍需用户确认。" : "未识别到可靠结果。",
    source: "rule",
  });

  return {
    company: make("company", fallback.company, fallback.evidence?.company),
    title: make("title", fallback.title, fallback.evidence?.title),
    location: make("location", fallback.location, fallback.evidence?.location),
    employment: make("employment", fallback.employment, fallback.evidence?.employment),
    category: make("category", fallback.category, fallback.evidence?.category),
    email: make("email", fallback.email, fallback.evidence?.email),
    ccEmail: make("ccEmail", fallback.ccEmail, fallback.evidence?.ccEmail),
  };
}

const isAcceptableValue = (fieldName, value) => {
  if (fieldName === "employment") return EMPLOYMENT_TYPES.has(value);
  if (fieldName === "category") return CATEGORIES.has(value);
  if (fieldName === "email" || fieldName === "ccEmail") return !value || EMAIL_PATTERN.test(value);
  return value.length <= 120;
};

const validateModelField = (rawText, fieldName, field) => {
  const value = stripOuterQuotes(field?.value);
  const evidence = stripOuterQuotes(field?.evidence);
  const confidence = ["high", "medium", "low"].includes(field?.confidence) ? field.confidence : "low";
  const basis = ["explicit", "inferred", "unknown"].includes(field?.basis) ? field.basis : "unknown";
  const evidenceExists = Boolean(evidence && rawText.includes(evidence));
  const accepted = Boolean(
    value
    && evidenceExists
    && confidence !== "low"
    && basis !== "unknown"
    && isAcceptableValue(fieldName, value),
  );

  return {
    accepted,
    value: accepted ? value : "",
    meta: {
      basis,
      confidence: accepted ? confidence : "low",
      evidence: evidenceExists ? evidence : "",
      reason: accepted ? String(field?.reason ?? "").trim() : "模型结果未通过原文证据或格式校验，已拒绝自动写入。",
      source: "llm",
    },
  };
};

const formatSummary = ({ company, title, location, business, email, ccEmail }) => {
  const parts = [];
  const subject = [company, title && `招聘${title}`].filter(Boolean).join("");
  if (subject || location || business) {
    parts.push(`${[
      subject,
      location && `工作地点为${location}`,
      business && `业务方向为${business}`,
    ].filter(Boolean).join("，")}。`);
  }
  if (email) parts.push(`投递邮箱：${email}。`);
  if (ccEmail) parts.push(`抄送邮箱：${ccEmail}。`);
  return parts.join("") || "暂未提取到可靠岗位摘要，请对照原文补充。";
};

export function mergeModelExtraction(rawText, fallback, modelExtraction) {
  const fallbackMeta = buildRuleFieldMeta(rawText, fallback);
  const modelFields = modelExtraction?.fields ?? {};
  const mapping = {
    company: "company",
    title: "title",
    location: "location",
    employment: "employment",
    category: "category",
    email: "primaryEmail",
    ccEmail: "ccEmail",
  };
  const output = { ...fallback };
  const fieldMeta = { ...fallbackMeta };

  for (const [fieldName, modelName] of Object.entries(mapping)) {
    const candidate = validateModelField(rawText, fieldName, modelFields[modelName]);
    if (candidate.accepted) {
      output[fieldName] = candidate.value;
      fieldMeta[fieldName] = candidate.meta;
    }
  }

  output.evidence = Object.fromEntries(Object.entries(fieldMeta).map(([key, value]) => [key, value.evidence]));
  output.fieldMeta = fieldMeta;
  output.emails = [...new Set([output.email, output.ccEmail].filter(Boolean))];
  output.summary = formatSummary(output);
  return output;
}
