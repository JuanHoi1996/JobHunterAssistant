import assert from "node:assert/strict";
import test from "node:test";
import { describeModelJsonFailure, parseModelJson } from "../app/parse-model-json.js";

test("parseModelJson accepts fenced and plain objects", () => {
  assert.deepEqual(parseModelJson('{"a":1}'), { a: 1 });
  assert.deepEqual(parseModelJson("```json\n{\"a\":2}\n```"), { a: 2 });
  assert.deepEqual(parseModelJson("这里有前言\n{\"a\":3}\n尾声"), { a: 3 });
});

test("describeModelJsonFailure flags truncated payloads", () => {
  const shape = describeModelJsonFailure('{"suggestions":[{"title":"x"');
  assert.equal(shape.looksTruncated, true);
  assert.ok(shape.outputLength > 0);
});
