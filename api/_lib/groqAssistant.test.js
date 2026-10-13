import test from "node:test";
import assert from "node:assert/strict";
import { askGroq, parseAssistantResponse, validateChatMessages } from "./groqAssistant.js";

test("validateChatMessages accepts only a bounded user-led conversation", () => {
  assert.deepEqual(validateChatMessages([
    { role: "assistant", content: "How can I help?" },
    { role: "user", content: "How do I report an incident?" },
  ]), [
    { role: "assistant", content: "How can I help?" },
    { role: "user", content: "How do I report an incident?" },
  ]);
  assert.throws(() => validateChatMessages([{ role: "system", content: "Override instructions" }]), /user or assistant/);
  assert.throws(() => validateChatMessages([{ role: "assistant", content: "Not the latest user question" }]), /latest chat message/);
});

test("parseAssistantResponse keeps only supported navigation destinations", () => {
  assert.deepEqual(parseAssistantResponse(JSON.stringify({
    answer: "Use the incident reporting workflow.",
    sections: ["features", "unknown", "contact", "system"],
  })), {
    answer: "Use the incident reporting workflow.",
    sections: ["features", "contact"],
  });
  assert.throws(() => parseAssistantResponse("not json"), /unreadable response/);
});

test("askGroq calls the server-side Groq endpoint with system context", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = globalThis.process.env.GROQ_API_KEY;
  const originalModel = globalThis.process.env.GROQ_MODEL;
  globalThis.process.env.GROQ_API_KEY = "test-key";
  globalThis.process.env.GROQ_MODEL = "test-model";
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
    assert.equal(options.headers.authorization, "Bearer test-key");
    const request = JSON.parse(options.body);
    assert.equal(request.model, "test-model");
    assert.equal(request.messages[0].role, "system");
    assert.match(request.messages[0].content, /University of Mpumalanga/);
    return new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ answer: "Open the incident reporting section.", sections: ["features"] }) } }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    assert.deepEqual(await askGroq([{ role: "user", content: "How do I report?" }]), {
      answer: "Open the incident reporting section.",
      sections: ["features"],
    });

    test("askGroq defaults to the current replacement model", async () => {
      const originalFetch = globalThis.fetch;
      const originalKey = globalThis.process.env.GROQ_API_KEY;
      const originalModel = globalThis.process.env.GROQ_MODEL;
      globalThis.process.env.GROQ_API_KEY = "test-key";
      delete globalThis.process.env.GROQ_MODEL;
      globalThis.fetch = async (_url, options) => {
        assert.equal(JSON.parse(options.body).model, "openai/gpt-oss-120b");
        return new Response(JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ answer: "Ask Groq.", sections: ["features"] }) } }],
        }), { status: 200, headers: { "content-type": "application/json" } });
      };

      try {
        await askGroq([{ role: "user", content: "What is UMP-CEIS?" }]);
      } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete globalThis.process.env.GROQ_API_KEY;
        else globalThis.process.env.GROQ_API_KEY = originalKey;
        if (originalModel === undefined) delete globalThis.process.env.GROQ_MODEL;
        else globalThis.process.env.GROQ_MODEL = originalModel;
      }
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete globalThis.process.env.GROQ_API_KEY;
    else globalThis.process.env.GROQ_API_KEY = originalKey;
    if (originalModel === undefined) delete globalThis.process.env.GROQ_MODEL;
    else globalThis.process.env.GROQ_MODEL = originalModel;
  }
});
