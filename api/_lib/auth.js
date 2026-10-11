/* global process */
import { createHash } from "node:crypto";

export function json(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(body);
}

export function methodNotAllowed(req, res, method = "POST") {
  if (req.method === method) return false;
  res.setHeader("Allow", method);
  json(res, 405, { error: "Method not allowed." });
  return true;
}

export function getConfig() {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY, RESEND_API_KEY, RESEND_FROM, APP_URL, SUPABASE_ANON_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("Auth service configuration is missing.");
  return { url: SUPABASE_URL.replace(/\/$/, ""), key: SUPABASE_SECRET_KEY, resendKey: RESEND_API_KEY, from: RESEND_FROM || "onboarding@resend.dev", appUrl: APP_URL, anonKey: SUPABASE_ANON_KEY };
}

export function validEmail(value) {
  return typeof value === "string" && /^[^\s@]+@ump\.ac\.za$/i.test(value.trim());
}

export function validPassword(value) {
  return typeof value === "string" && value.length >= 12 && value.length <= 128;
}

export function validName(value) {
  return typeof value === "string" && value.trim().length >= 2 && value.trim().length <= 100;
}

export function safeText(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

export async function supabaseRequest(path, { method = "GET", body, prefer } = {}) {
  const { url, key } = getConfig();
  const response = await fetch(`${url}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

export async function enforceRateLimit(req, scope, identifier = "") {
  const { url, key } = getConfig();
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded || req.headers["x-real-ip"] || "unknown").split(",")[0].trim();
  const keys = [ip, identifier].filter(Boolean).map(value => createHash("sha256").update(`${scope}:${value.toLowerCase()}`).digest("hex"));
  const response = await fetch(`${url}/rest/v1/rpc/claim_auth_rate_limit`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_keys: keys, p_max_attempts: 5, p_window_seconds: 900 }),
  });
  if (!response.ok) throw new Error("Rate limiter unavailable.");
  return response.json();
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export async function requireActor(req) {
  const authorization = req.headers.authorization || "";
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(authorization);
  if (!match) return null;
  const { url, anonKey } = getConfig();
  if (!anonKey) throw new Error("Authentication service configuration is missing.");
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${match[1]}` },
  });
  if (!response.ok) return null;
  const user = await response.json();
  const roles = ["student", "staff", "admin", "security", "medical"];
  const claimedRole = user.app_metadata?.ceis_role;
  return { id: user.id, role: roles.includes(claimedRole) ? claimedRole : "student", token: match[1] };
}

export async function userDatabaseRequest(token, path, { method = "GET", body, prefer } = {}) {
  const { url, anonKey } = getConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}
