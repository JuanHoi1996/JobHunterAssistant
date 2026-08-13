type JsonSchema = Record<string, unknown>;

export type AiProviderName = "deepseek" | "openai";

export type JsonCompletionInput = {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  schema: JsonSchema;
  maxOutputTokens: number;
};

export type JsonCompletionResult = {
  outputText: string;
  provider: AiProviderName;
  model: string;
  requestId?: string;
  /** DeepSeek/OpenAI-style finish reason when available (e.g. stop | length). */
  finishReason?: string;
};

/** Thrown when the model hit max_tokens and returned incomplete JSON. */
export class AiTruncatedOutputError extends Error {
  finishReason: string;
  outputLength: number;

  constructor(finishReason: string, outputLength: number) {
    super(
      `AI output truncated (finish_reason=${finishReason}, length=${outputLength}). Increase max_tokens or shorten the response.`,
    );
    this.name = "AiTruncatedOutputError";
    this.finishReason = finishReason;
    this.outputLength = outputLength;
  }
}

export class AiUpstreamError extends Error {
  status: number;
  payload: Record<string, unknown>;
  requestId?: string;

  constructor(
    status: number,
    payload: Record<string, unknown> = {},
    requestId?: string,
  ) {
    super(`AI upstream request failed with ${status}`);
    this.name = "AiUpstreamError";
    this.status = status;
    this.payload = payload;
    this.requestId = requestId;
  }
}

export class AiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigurationError";
  }
}

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEEPSEEK_CHAT_URL = "https://api.deepseek.com/chat/completions";
/** Thinking-max resume calls are two sequential rounds; 10 minutes per call is a safer floor. */
const DEFAULT_AI_REQUEST_TIMEOUT_MS = 600_000;

/** Per-request timeout. Resume analysis is two sequential calls; thinking-max needs a long budget. */
export const getAiRequestTimeoutMs = () => {
  const configured = Number(process.env.AI_REQUEST_TIMEOUT_MS);
  if (Number.isFinite(configured) && configured >= 10_000) return Math.floor(configured);
  return DEFAULT_AI_REQUEST_TIMEOUT_MS;
};

const getDeepSeekReasoningEffort = (): "low" | "high" | "max" => {
  const configured = (process.env.DEEPSEEK_REASONING_EFFORT || "max").trim().toLowerCase();
  if (configured === "low" || configured === "high" || configured === "max") return configured;
  return "max";
};

const providerFromEnvironment = (): AiProviderName => {
  const configured = (process.env.AI_PROVIDER || "deepseek").trim().toLowerCase();
  if (configured === "deepseek" || configured === "openai") return configured;
  throw new AiConfigurationError("AI_PROVIDER must be deepseek or openai.");
};

export const getConfiguredProvider = () => providerFromEnvironment();

export const getConfiguredModel = (task: "job" | "resume") => {
  const provider = providerFromEnvironment();
  if (provider === "deepseek") {
    return task === "job"
      ? process.env.DEEPSEEK_JOB_MODEL || "deepseek-v4-flash"
      : process.env.DEEPSEEK_RESUME_MODEL || "deepseek-v4-pro";
  }
  return task === "job"
    ? process.env.OPENAI_JOB_EXTRACTION_MODEL || "gpt-5.6-terra"
    : process.env.OPENAI_RESUME_MODEL || "gpt-5.6-terra";
};

export const hasConfiguredApiKey = () => {
  const provider = providerFromEnvironment();
  return Boolean(provider === "deepseek" ? process.env.DEEPSEEK_API_KEY : process.env.OPENAI_API_KEY);
};

const readErrorPayload = async (response: Response) => {
  try {
    const value = await response.json();
    return value && typeof value === "object" ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
};

const getOpenAiOutputText = (response: Record<string, unknown>) => {
  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown }).content)
      ? (item as { content: unknown[] }).content
      : [];
    for (const part of content) {
      if (part && typeof part === "object" && (part as { type?: string }).type === "output_text") {
        return String((part as { text?: unknown }).text ?? "");
      }
    }
  }
  return "";
};

const getDeepSeekChoice = (response: Record<string, unknown>) => {
  const choices = Array.isArray(response.choices) ? response.choices : [];
  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") return null;
  return firstChoice as { message?: unknown; finish_reason?: unknown };
};

const getDeepSeekOutputText = (response: Record<string, unknown>) => {
  const firstChoice = getDeepSeekChoice(response);
  if (!firstChoice) return "";
  const message = firstChoice.message;
  if (!message || typeof message !== "object") return "";
  return typeof (message as { content?: unknown }).content === "string"
    ? (message as { content: string }).content
    : "";
};

const getDeepSeekFinishReason = (response: Record<string, unknown>) => {
  const reason = getDeepSeekChoice(response)?.finish_reason;
  return typeof reason === "string" ? reason : undefined;
};

const deepSeekJsonSystemPrompt = (systemPrompt: string, schema: JsonSchema) => `${systemPrompt}

输出要求：只输出一个合法 JSON 对象，不要输出 Markdown、解释或代码块。该 JSON 必须完全符合以下 JSON Schema；无法确定的字段按 Schema 的空值约定填写，不得省略必填字段：
${JSON.stringify(schema)}`;

export async function completeJson(input: JsonCompletionInput): Promise<JsonCompletionResult> {
  const provider = providerFromEnvironment();
  const apiKey = provider === "deepseek" ? process.env.DEEPSEEK_API_KEY : process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AiConfigurationError(`${provider} API key is not configured.`);
  const timeoutMs = getAiRequestTimeoutMs();

  if (provider === "openai") {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: input.model,
        store: false,
        reasoning: { effort: "low" },
        input: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userPrompt },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "grounded_job_workspace_output",
            strict: true,
            schema: input.schema,
          },
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      throw new AiUpstreamError(response.status, await readErrorPayload(response), response.headers.get("x-request-id") || undefined);
    }
    const payload = await response.json() as Record<string, unknown>;
    return { outputText: getOpenAiOutputText(payload), provider, model: input.model, requestId: response.headers.get("x-request-id") || undefined };
  }

  const response = await fetch(DEEPSEEK_CHAT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: input.model,
      messages: [
        { role: "system", content: deepSeekJsonSystemPrompt(input.systemPrompt, input.schema) },
        { role: "user", content: input.userPrompt },
      ],
      // Thinking stays private in reasoning_content; final answer must still be JSON in content.
      thinking: { type: "enabled" },
      reasoning_effort: getDeepSeekReasoningEffort(),
      response_format: { type: "json_object" },
      // Reasoning tokens count against max_tokens — keep this high enough for think + JSON.
      max_tokens: input.maxOutputTokens,
      stream: false,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new AiUpstreamError(response.status, await readErrorPayload(response), response.headers.get("x-request-id") || undefined);
  }
  const payload = await response.json() as Record<string, unknown>;
  const outputText = getDeepSeekOutputText(payload);
  const finishReason = getDeepSeekFinishReason(payload);
  // DeepSeek JSON mode still truncates mid-object when max_tokens is hit (official docs warn about this).
  // Thinking-max often burns the budget on reasoning_content and leaves content empty/partial.
  if (finishReason === "length" || !outputText) {
    throw new AiTruncatedOutputError(finishReason || "empty_content", outputText.length);
  }
  return {
    outputText,
    provider,
    model: input.model,
    requestId: response.headers.get("x-request-id") || undefined,
    finishReason,
  };
}
