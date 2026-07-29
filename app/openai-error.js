const QUOTA_CODES = new Set([
  "billing_hard_limit_reached",
  "insufficient_quota",
  "rate_limit_exceeded",
]);

const AUTH_CODES = new Set([
  "invalid_api_key",
  "invalid_authentication",
]);

const MODEL_CODES = new Set([
  "model_not_found",
  "unsupported_model",
]);

/**
 * Convert an OpenAI API failure into a safe, actionable product error.
 * The returned diagnostic never includes request inputs or the upstream message.
 */
export function classifyOpenAIError(status, payload = {}) {
  const upstreamError =
    payload && typeof payload === "object" && payload.error && typeof payload.error === "object"
      ? payload.error
      : {};
  const code = typeof upstreamError.code === "string" ? upstreamError.code : "";
  const type = typeof upstreamError.type === "string" ? upstreamError.type : "";

  if (status === 401 || status === 403 || AUTH_CODES.has(code)) {
    return {
      errorCode: "openai_auth",
      message: "AI 服务密钥无效或无权使用当前模型，请在设置中更新后重试。",
      status: 503,
      diagnostic: { upstreamStatus: status, upstreamCode: code, upstreamType: type },
    };
  }

  if (status === 429 || QUOTA_CODES.has(code)) {
    return {
      errorCode: "openai_quota",
      message: "当前产品的 AI API 额度不足或请求过多。切换 ChatGPT 登录账号不会增加 API 额度，请检查应用 API Key 的余额与用量限制。",
      status: 503,
      diagnostic: { upstreamStatus: status, upstreamCode: code, upstreamType: type },
    };
  }

  if (status === 404 || MODEL_CODES.has(code)) {
    return {
      errorCode: "openai_model",
      message: "当前 AI 模型不可用，请检查模型配置后重试。",
      status: 503,
      diagnostic: { upstreamStatus: status, upstreamCode: code, upstreamType: type },
    };
  }

  if (status === 400) {
    return {
      errorCode: "openai_request",
      message: "AI 请求配置不兼容，请稍后重试。",
      status: 502,
      diagnostic: { upstreamStatus: status, upstreamCode: code, upstreamType: type },
    };
  }

  return {
    errorCode: "openai_upstream",
    message: "AI 简历分析暂时不可用，请稍后重试。",
    status: 502,
    diagnostic: { upstreamStatus: status, upstreamCode: code, upstreamType: type },
  };
}

export function classifyOpenAIException(error) {
  const isTimeout =
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError");

  return isTimeout
    ? {
        errorCode: "openai_timeout",
        message: "AI 分析超时，请重试一次。",
        status: 504,
        diagnostic: { exceptionName: error.name },
      }
    : {
        errorCode: "openai_network",
        message: "暂时无法连接 AI 服务，请稍后重试。",
        status: 502,
        diagnostic: {
          exceptionName: error instanceof Error ? error.name : "UnknownError",
        },
      };
}
