const QUOTA_CODES = new Set([
  "billing_hard_limit_reached",
  "insufficient_quota",
  "rate_limit_exceeded",
  "insufficient_balance",
]);

const AUTH_CODES = new Set([
  "invalid_api_key",
  "invalid_authentication",
  "authentication_error",
]);

const MODEL_CODES = new Set([
  "model_not_found",
  "unsupported_model",
]);

const errorDetails = (payload) => {
  const upstreamError =
    payload && typeof payload === "object" && payload.error && typeof payload.error === "object"
      ? payload.error
      : {};
  return {
    code: typeof upstreamError.code === "string" ? upstreamError.code : "",
    type: typeof upstreamError.type === "string" ? upstreamError.type : "",
  };
};

/** Returns safe product errors without retaining upstream text or user inputs. */
export function classifyAiError(provider, status, payload = {}) {
  const { code, type } = errorDetails(payload);
  const prefix = provider === "deepseek" ? "deepseek" : "openai";
  const diagnostic = { provider, upstreamStatus: status, upstreamCode: code, upstreamType: type };

  if (status === 401 || status === 403 || AUTH_CODES.has(code)) {
    return { errorCode: `${prefix}_auth`, message: "AI 服务密钥无效或无权使用当前模型，请检查应用的密钥配置后重试。", status: 503, diagnostic };
  }
  if (status === 402 || status === 429 || QUOTA_CODES.has(code)) {
    return { errorCode: `${prefix}_quota`, message: "当前产品的 AI API 额度不足或请求过多，请检查应用 API Key 的余额与用量限制。", status: 503, diagnostic };
  }
  if (status === 404 || MODEL_CODES.has(code)) {
    return { errorCode: `${prefix}_model`, message: "当前 AI 模型不可用，请检查模型配置后重试。", status: 503, diagnostic };
  }
  if (status === 400) {
    return { errorCode: `${prefix}_request`, message: "AI 请求配置不兼容，请稍后重试。", status: 502, diagnostic };
  }
  return { errorCode: `${prefix}_upstream`, message: "AI 简历分析暂时不可用，请稍后重试。", status: 502, diagnostic };
}

export function classifyAiException(provider, error) {
  const prefix = provider === "deepseek" ? "deepseek" : "openai";
  const isTimeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
  return isTimeout
    ? { errorCode: `${prefix}_timeout`, message: "AI 分析超时，请重试一次。", status: 504, diagnostic: { provider, exceptionName: error.name } }
    : { errorCode: `${prefix}_network`, message: "暂时无法连接 AI 服务，请稍后重试。", status: 502, diagnostic: { provider, exceptionName: error instanceof Error ? error.name : "UnknownError" } };
}
