import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyOpenAIError,
  classifyOpenAIException,
} from "../app/openai-error.js";

test("turns quota failures into an actionable message without exposing upstream text", () => {
  const result = classifyOpenAIError(429, {
    error: {
      code: "insufficient_quota",
      type: "insufficient_quota",
      message: "sensitive upstream details",
    },
  });

  assert.equal(result.errorCode, "openai_quota");
  assert.match(result.message, /切换 ChatGPT 登录账号不会增加 API 额度/u);
  assert.doesNotMatch(JSON.stringify(result), /sensitive upstream details/u);
});

test("distinguishes invalid model and request configuration failures", () => {
  assert.equal(
    classifyOpenAIError(404, { error: { code: "model_not_found" } }).errorCode,
    "openai_model",
  );
  assert.equal(
    classifyOpenAIError(400, { error: { type: "invalid_request_error" } }).errorCode,
    "openai_request",
  );
});

test("distinguishes timeouts from other transport failures", () => {
  const timeout = new Error("timed out");
  timeout.name = "TimeoutError";

  assert.equal(classifyOpenAIException(timeout).errorCode, "openai_timeout");
  assert.equal(classifyOpenAIException(new TypeError("fetch failed")).errorCode, "openai_network");
});
