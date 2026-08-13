import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("uses a server-side DeepSeek JSON adapter without an implicit second-provider fallback", async () => {
  const provider = await readFile(new URL("../app/ai-provider.ts", import.meta.url), "utf8");

  assert.match(provider, /https:\/\/api\.deepseek\.com\/chat\/completions/u);
  assert.match(provider, /process\.env\.DEEPSEEK_API_KEY/u);
  assert.match(provider, /response_format: \{ type: "json_object" \}/u);
  assert.match(provider, /AiTruncatedOutputError/u);
  assert.match(provider, /finishReason === "length" \|\| !outputText/u);
  assert.match(provider, /thinking: \{ type: "enabled" \}/u);
  assert.match(provider, /reasoning_effort: getDeepSeekReasoningEffort\(\)/u);
  assert.match(provider, /DEEPSEEK_REASONING_EFFORT/u);
  assert.match(provider, /AbortSignal\.timeout\(timeoutMs\)/u);
  assert.match(provider, /AI_REQUEST_TIMEOUT_MS/u);
  assert.match(provider, /DEFAULT_AI_REQUEST_TIMEOUT_MS = 600_000/u);
  assert.doesNotMatch(provider, /thinking: \{ type: "disabled" \}/u);
  assert.doesNotMatch(provider, /AbortSignal\.timeout\(30_000\)/u);
  assert.doesNotMatch(provider, /catch[\s\S]{0,300}OPENAI_API_KEY/u);
});
