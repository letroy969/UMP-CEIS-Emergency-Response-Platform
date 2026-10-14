import test from "node:test";
import assert from "node:assert/strict";
import { handleChat } from "./chat.js";

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("chat endpoint rejects methods other than POST", async () => {
  const response = createResponse();
  await handleChat({ method: "GET" }, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.allow, "POST");
  assert.deepEqual(response.body, { error: "Only POST requests are allowed." });
});

test("chat endpoint validates messages before calling the provider", async () => {
  const response = createResponse();
  await handleChat({ method: "POST", body: { messages: [] } }, response);

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /between 1 and 10/);
});
