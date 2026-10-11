import { createHash } from "node:crypto";
import { enforceRateLimit, json, methodNotAllowed, supabaseRequest } from "./_lib/auth.js";

export default async function handler(req, res) {
  if (methodNotAllowed(req, res)) return;
  const { token } = req.body || {};
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    return json(res, 400, { error: "Invalid or expired verification link." });
  }
  try {
    if (!await enforceRateLimit(req, "verify")) return json(res, 429, { error: "Too many attempts. Please wait and try again." });
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const { response: tokenResponse, data: rows } = await supabaseRequest(
      `/rest/v1/email_verification_tokens?token_hash=eq.${tokenHash}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=user_id`,
      { method: "DELETE", prefer: "return=representation" },
    );
    const record = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
    if (!tokenResponse.ok || !record) return json(res, 400, { error: "Invalid or expired verification link." });

    const { response: confirmResponse } = await supabaseRequest(`/auth/v1/admin/users/${encodeURIComponent(record.user_id)}`, {
      method: "PUT",
      body: { email_confirm: true },
    });
    if (!confirmResponse.ok) {
      console.error("Supabase email confirmation failed", confirmResponse.status);
      return json(res, 500, { error: "Verification could not be completed. Please contact support." });
    }
    return json(res, 200, { message: "Email verified successfully. You can now sign in." });
  } catch (error) {
    console.error("Email verification failed", error.message);
    return json(res, 503, { error: "Verification service is unavailable. Please try again later." });
  }
}
