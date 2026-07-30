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
};

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

const getDeepSeekOutputText = (response: Record<string, unknown>) => {
  const choices = Array.isArray(response.choices) ? response.choices : [];
  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") return "";
  const message = (firstChoice as { message?: unknown }).message;
  if (!message || typeof message !== "object") return "";
  return typeof (message as { content?: unknown }).content === "string"
    ? (message as { content: string }).content
    : "";
};

const deepSeekJsonSystemPrompt = (systemPrompt: string, schema: JsonSchema) => `${systemPrompt}

输出要求：只输出一个合法 JSON 对象，不要输出 Markdown、解释或代码块。该 JSON 必须完全符合以下 JSON Schema；无法确定的字段按 Schema 的空值约定填写，不得省略必填字段：
${JSON.stringify(schema)}`;

export async function completeJson(input: JsonCompletionInput): Promise<JsonCompletionResult> {
  const provider = providerFromEnvironment();
  const apiKey = provider === "deepseek" ? process.env.DEEPSEEK_API_KEY : process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AiConfigurationError(`${provider} API key is not configured.`);

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
      signal: AbortSignal.timeout(30_000),
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
      thinking: { type: "disabled" },
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: input.maxOutputTokens,
      stream: false,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new AiUpstreamError(response.status, await readErrorPayload(response), response.headers.get("x-request-id") || undefined);
  }
  const payload = await response.json() as Record<string, unknown>;
  return { outputText: getDeepSeekOutputText(payload), provider, model: input.model, requestId: response.headers.get("x-request-id") || undefined };
}
