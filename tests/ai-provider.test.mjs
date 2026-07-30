import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("uses a server-side DeepSeek JSON adapter without an implicit second-provider fallback", async () => {
  const provider = await readFile(new URL("../app/ai-provider.ts", import.meta.url), "utf8");

  assert.match(provider, /https:\/\/api\.deepseek\.com\/chat\/completions/u);
  assert.match(provider, /process\.env\.DEEPSEEK_API_KEY/u);
  assert.match(provider, /response_format: \{ type: "json_object" \}/u);
  assert.match(provider, /thinking: \{ type: "disabled" \}/u);
  assert.match(provider, /store: false/u);
  assert.doesNotMatch(provider, /catch[\s\S]{0,300}OPENAI_API_KEY/u);
});
