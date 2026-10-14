import { createHash } from "node:crypto";
import { askGroq, validateChatMessages } from "./_lib/groqAssistant.js";

const chatRateLimits = new Map();

function enforceChatRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60000;
  const entry = chatRateLimits.get(ip);
  if (entry && now - entry.startedAt < windowMs && entry.count >= 12) {
    const error = new Error("Too many assistant requests. Wait a minute and try again.");
    error.status = 429;
    throw error;
  }
  if (!entry || now - entry.startedAt >= windowMs) {
    chatRateLimits.set(ip, { startedAt: now, count: 1 });
  } else {
    entry.count += 1;
  }
  for (const [key, value] of chatRateLimits) {
    if (now - value.startedAt >= windowMs) chatRateLimits.delete(key);
  }
}

export async function handleChat(req, res) {
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "no-referrer");
  const configuredOrigin = process.env.APP_URL;
  const origin = req.headers?.origin;
  if (origin && configuredOrigin && origin === configuredOrigin) {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "Origin");
    res.setHeader("access-control-allow-headers", "authorization, content-type");
    res.setHeader("access-control-allow-methods", "POST, OPTIONS");
  }
  if (req.method === "OPTIONS") {
    return res.status(origin && origin === configuredOrigin ? 204 : 403).end();
  }
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    return res.status(405).json({ error: "Only POST requests are allowed." });
  }

  try {
    const messages = validateChatMessages(req.body?.messages);
    const forwardedFor = req.headers?.["x-forwarded-for"];
    const forwardedIp = typeof forwardedFor === "string" ? forwardedFor.split(",")[0].trim() : undefined;
    const clientId = createHash("sha256").update(req.ip || forwardedIp || "unknown").digest("hex");
    enforceChatRateLimit(clientId);
    res.setHeader("cache-control", "no-store");
    return res.status(200).json(await askGroq(messages));
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error("CEIS chat request failed", error);
    return res.status(status).json({
      error: status >= 500
        ? error.publicMessage || "The assistant could not respond. Please try again."
        : error.message,
    });
  }
}

export default handleChat;
