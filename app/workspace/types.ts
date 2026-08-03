export type TabId = "overview" | "resume" | "letter" | "progress" | "interview";
export type JobStatus = "待投递" | "已投递" | "面试中" | "Offer" | "已结束";
export type CaptureMethod = "岗位链接" | "JD 文本" | "岗位截图" | "插件保存";
export type ExtractionFieldKey = "company" | "title" | "location" | "employment" | "category" | "email" | "ccEmail";
export type ExtractionFieldMeta = {
  basis: "explicit" | "inferred" | "unknown";
  confidence: "high" | "medium" | "low";
  evidence: string;
  reason: string;
  source: "llm" | "rule";
};

export const emptyFieldMeta = (): Record<ExtractionFieldKey, ExtractionFieldMeta> => Object.fromEntries(
  ["company", "title", "location", "employment", "category", "email", "ccEmail"].map((key) => [key, {
    basis: "unknown",
    confidence: "low",
    evidence: "",
    reason: "",
    source: "rule",
  }]),
) as Record<ExtractionFieldKey, ExtractionFieldMeta>;

export type JobRecord = {
  id: string;
  mark: string;
  tone: "blue" | "orange" | "green" | "violet";
  company: string;
  title: string;
  location: string;
  employment: string;
  category: string;
  discoverySource: string;
  captureMethod: CaptureMethod;
  sourceHost: string;
  status: JobStatus;
  savedLabel: string;
  ageHours: number;
  materials: string;
  applicationMethod?: string;
  jdSummary?: string;
  rawJd?: string;
  contactEmail?: string;
  ccEmail?: string;
  business?: string;
};

export type ResumeAnalysis = {
  summary: string;
  jdPriorities: {
    title: string;
    priority: "核心" | "重要" | "加分";
    jdEvidence: string;
    interpretation: string;
  }[];
  highlights: {
    title: string;
    sourceEvidence: string[];
    value: string;
    transferableSkills: string[];
  }[];
  matches: {
    title: string;
    resumeEvidence: string[];
    jdEvidence: string;
    explanation: string;
  }[];
  gaps: {
    title: string;
    jdEvidence: string;
    reason: string;
    question: string;
  }[];
  questions: {
    question: string;
    why: string;
    jdEvidence: string;
  }[];
  suggestions: {
    title: string;
    rewriteType: "整条重写" | "重点前置" | "结构优化" | "精简表达";
    priority: "核心" | "重要" | "加分";
    original: string;
    sourceEvidence: string[];
    revised: string;
    jdEvidence: string;
    reason: string;
    qualityCheck: string;
  }[];
  accepted: number[];
};

export type ResumeVersion = {
  id: string;
  jobId: string;
  sourceResumeId: string;
  sourceResumeName: string;
  company: string;
  jobTitle: string;
  name: string;
  content: string;
  acceptedCount: number;
  createdAt: string;
};

export type ResumeSource = {
  id: string;
  name: string;
  content: string;
  createdAt: string;
};

export type SessionState = {
  authenticated: boolean;
  email: string | null;
  signInPath: string;
  signOutPath: string;
};
