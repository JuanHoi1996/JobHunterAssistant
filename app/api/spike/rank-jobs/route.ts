import {
  classifyAiError,
  classifyAiException,
} from "../../../ai-error.js";
import {
  AiConfigurationError,
  AiTruncatedOutputError,
  AiUpstreamError,
  completeJson,
  getConfiguredModel,
  getConfiguredProvider,
  hasConfiguredApiKey,
} from "../../../ai-provider";
import { validateJobRankAnalysis } from "../../../spike/rank-jobs-analysis.js";
import { buildSpikeRunLog } from "../../../spike/run-log";
import { describeModelJsonFailure, parseModelJson } from "../../../parse-model-json.js";

const SIGN_IN_PATH = "/signin-with-chatgpt?return_to=%2Fspike%2Frank";
const MAX_JOBS = 6;
const MAX_JD_CHARS = 8_000;
const MAX_SKILL_CHARS = 80_000;

const rankedItemSchema = {
  type: "object",
  properties: {
    jobId: { type: "string" },
    gate: { type: "string", enum: ["pass", "淘汰"] },
    gateReason: { type: "string" },
    score: { type: ["number", "null"] },
    recommendation: { type: "string", enum: ["冲", "可接", "保底", "放弃"] },
    topContributions: { type: "array", items: { type: "string" } },
    topGaps: { type: "array", items: { type: "string" } },
    note: { type: "string" },
  },
  required: [
    "jobId",
    "gate",
    "gateReason",
    "score",
    "recommendation",
    "topContributions",
    "topGaps",
    "note",
  ],
  additionalProperties: false,
} as const;

const dimensionSchema = {
  type: "object",
  properties: {
    jobId: { type: "string" },
    code: { type: "string" },
    supply0to10: { type: "number" },
    weight: { type: "number" },
    contribution: { type: "number" },
  },
  required: ["jobId", "code", "supply0to10", "weight", "contribution"],
  additionalProperties: false,
} as const;

const rankSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    ranked: { type: "array", items: rankedItemSchema },
    dimensions: { type: "array", items: dimensionSchema },
  },
  required: ["summary", "ranked", "dimensions"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `你是择业幕僚，不是简历润色助手。你将收到：
1) 用户专属择业 SKILL（门控、权重、0/5/10 锚点、公式、软性扣分、并列打破、多岗工作流）
2) 若干岗位的公司、标题与 JD 原文

# 硬纪律
1. 严格按用户 SKILL 执行门控与打分；不得用你自己的审美替换其权重与否决。
2. 触碰任一硬性否决 → gate=淘汰，recommendation=放弃，score 可为 null；门控原因写清机制。
3. 通过门控者：按 SKILL 公式估计各维供给分（0–10），再算效用分；信息不足时供给分取保守值，并在 note 标明低置信。
4. topContributions / topGaps 用用户 SKILL 的维名或代码，写短句，不要空泛形容词。
5. recommendation ∈ 冲 / 可接 / 保底 / 放弃，须与分数和门控一致。
6. ranked 必须覆盖请求中的每一个 jobId，不得编造未提供的岗位。
7. dimensions 可精简：优先覆盖权重≥10 的维；每岗若干条即可。
8. 只输出一个 JSON 对象；不要输出思维链，不要把 SKILL 原文再嵌进结果。

# 对比目标
用户常拿同司不同条线（如 ECM vs DCM vs 自营）对比。请突出权力结构 / 供给差异，而不是只比较「听起来更高级」。`;

const allowedToUseModel = (request: Request) => {
  const hostname = new URL(request.url).hostname;
  const isLocalDevelopmentRequest =
    process.env.NODE_ENV !== "production"
    && (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1");
  if (isLocalDevelopmentRequest) return true;

  const allowed = (process.env.JOB_AI_ALLOWED_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase() || "";
  return Boolean(email && allowed.includes(email));
};

type RankJobInput = {
  id?: unknown;
  company?: unknown;
  title?: unknown;
  rawJd?: unknown;
};

export async function POST(request: Request) {
  let preferenceSkill = "";
  let jobs: { id: string; company: string; title: string; rawJd: string }[] = [];

  try {
    const body = await request.json() as {
      preferenceSkill?: unknown;
      jobs?: unknown;
    };
    preferenceSkill = typeof body.preferenceSkill === "string" ? body.preferenceSkill.trim() : "";
    const rawJobs = Array.isArray(body.jobs) ? body.jobs as RankJobInput[] : [];
    jobs = rawJobs.flatMap((job, index) => {
      const id = typeof job.id === "string" ? job.id.trim() : "";
      const company = typeof job.company === "string" ? job.company.trim() : "";
      const title = typeof job.title === "string" ? job.title.trim() : "";
      const rawJd = typeof job.rawJd === "string" ? job.rawJd.trim().replace(/\u00a0/gu, " ") : "";
      if (!id || !title || rawJd.length < 40) return [];
      return [{
        id,
        company: company || "未命名公司",
        title,
        rawJd: rawJd.slice(0, MAX_JD_CHARS),
      }];
    }).slice(0, MAX_JOBS);

    // Ensure unique ids
    const seen = new Set<string>();
    jobs = jobs.filter((job) => {
      if (seen.has(job.id)) return false;
      seen.add(job.id);
      return true;
    });
  } catch {
    return Response.json({ error: "请求格式无效。" }, { status: 400 });
  }

  if (preferenceSkill.length < 200 || preferenceSkill.length > MAX_SKILL_CHARS) {
    return Response.json({ error: "择业 SKILL 长度需在 200—80,000 字之间。" }, { status: 400 });
  }
  if (jobs.length < 2) {
    return Response.json({ error: "请至少选择或粘贴 2 个含 JD 的岗位进行对比。" }, { status: 400 });
  }

  if (!allowedToUseModel(request)) {
    return Response.json({
      error: "请先使用已获授权的 ChatGPT 账号登录，再开始岗位排序。",
      signInPath: SIGN_IN_PATH,
    }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  if (!hasConfiguredApiKey()) {
    return Response.json({ error: "AI 岗位排序尚未配置。" }, { status: 503 });
  }

  const provider = getConfiguredProvider();
  const model = getConfiguredModel("resume");
  const startedAt = Date.now();
  let lastModelOutput = "";

  const buildRunLog = (input: {
    ok: boolean;
    error?: string;
    analysis?: unknown;
    includeModelPreview?: boolean;
  }) => buildSpikeRunLog({
    kind: "rank",
    pipelineVersion: "spike-rank-0.1",
    provider,
    model,
    ok: input.ok,
    error: input.error,
    durationMs: Date.now() - startedAt,
    preferenceSkill,
    jobs,
    analysis: input.analysis,
    modelOutputPreview: input.includeModelPreview && lastModelOutput
      ? lastModelOutput.slice(0, 4_000)
      : undefined,
  });

  const jobsBlock = jobs.map((job, index) => (
    `### 岗位 ${index + 1}\njobId: ${job.id}\n公司: ${job.company}\n标题: ${job.title}\n\n【JD 原文】\n${job.rawJd}`
  )).join("\n\n---\n\n");

  try {
    const completion = await completeJson({
      model,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: `【用户专属择业 SKILL】\n${preferenceSkill}\n\n【待排序岗位】\n${jobsBlock}`,
      schema: rankSchema,
      maxOutputTokens: 64_000,
    });
    if (!completion.outputText) throw new Error("AI returned no rank output");
    lastModelOutput = completion.outputText;
    const analysis = validateJobRankAnalysis(
      jobs.map((job) => job.id),
      parseModelJson(completion.outputText),
    );
    if (analysis.ranked.length < 1) {
      throw new Error("AI returned no usable ranked rows");
    }

    return Response.json(
      {
        analysis,
        jobs,
        model: completion.model,
        provider: completion.provider,
        pipelineVersion: "spike-rank-0.1",
        runLog: buildRunLog({ ok: true, analysis }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AiTruncatedOutputError) {
      const message = "AI 输出因 max_tokens/思考预算被截断。请减少岗位数或略缩短 SKILL 后重试。";
      return Response.json(
        {
          error: message,
          errorCode: `${provider}_truncated_output`,
          runLog: buildRunLog({ ok: false, error: message, includeModelPreview: true }),
        },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (error instanceof SyntaxError) {
      const shape = describeModelJsonFailure(lastModelOutput);
      const message = shape.looksTruncated
        ? "AI 返回的 JSON 不完整。请减少对比岗位数后重试。"
        : "AI 返回的内容不是合法 JSON。请重试一次。";
      return Response.json(
        {
          error: message,
          errorCode: `${provider}_invalid_json`,
          runLog: buildRunLog({ ok: false, error: message, includeModelPreview: true }),
        },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (error instanceof Error && error.message.startsWith("AI returned no")) {
      const message = "AI 未给出可用的排序结果。请重试。";
      return Response.json(
        {
          error: message,
          errorCode: `${provider}_invalid_output`,
          runLog: buildRunLog({ ok: false, error: message }),
        },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const classified = error instanceof AiUpstreamError
      ? classifyAiError(provider, error.status, error.payload)
      : error instanceof AiConfigurationError
        ? { errorCode: `${provider}_configuration`, message: "AI 服务尚未正确配置。", status: 503, diagnostic: { provider } }
        : classifyAiException(provider, error);
    console.error("Spike rank-jobs AI failure", {
      model,
      requestId: error instanceof AiUpstreamError ? error.requestId : undefined,
      ...classified.diagnostic,
    });
    return Response.json(
      {
        error: classified.message,
        errorCode: classified.errorCode,
        runLog: buildRunLog({ ok: false, error: classified.message }),
      },
      { status: classified.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
