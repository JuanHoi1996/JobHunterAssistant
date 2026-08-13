/**
 * Parse JSON from model output that may include fences or leading chatter.
 * Still throws SyntaxError when the payload is truncated or malformed.
 */
export function parseModelJson(outputText) {
  let text = String(outputText ?? "").trim();
  if (!text) throw new SyntaxError("Empty model JSON");

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/iu);
  if (fence?.[1]) text = fence[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new SyntaxError("No JSON object in model output");
  }

  return JSON.parse(text.slice(start, end + 1));
}

export function describeModelJsonFailure(outputText) {
  const text = String(outputText ?? "");
  return {
    outputLength: text.length,
    startsWith: text.slice(0, 80).replace(/\s+/gu, " "),
    endsWith: text.slice(-80).replace(/\s+/gu, " "),
    looksTruncated: text.length > 0 && !/\}\s*$/u.test(text.trim()),
  };
}
