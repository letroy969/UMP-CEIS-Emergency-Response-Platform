import { createHash, randomBytes } from "node:crypto";
import { enforceRateLimit, getConfig, json, methodNotAllowed, normalizeEmail, safeText, supabaseRequest, validEmail, validName, validPassword } from "./_lib/auth.js";

export default async function handler(req, res) {
  if (methodNotAllowed(req, res)) return;
  const { fullName, email, password } = req.body || {};
  if (!validName(fullName) || !validEmail(email) || !validPassword(password)) {
    return json(res, 400, { error: "Enter your name, a valid @ump.ac.za address, and a password of 12–128 characters." });
  }

  const normalizedEmail = normalizeEmail(email);
  let userId;
  try {
    const allowed = await enforceRateLimit(req, "signup", normalizedEmail);
    if (!allowed) return json(res, 429, { error: "Too many attempts. Please wait 15 minutes and try again." });
    const { resendKey, from, appUrl } = getConfig();
    if (!resendKey || !appUrl) return json(res, 503, { error: "Email verification is not configured yet." });
    const baseUrl = new URL(appUrl);
    if (baseUrl.protocol !== "https:" && baseUrl.hostname !== "localhost") throw new Error("APP_URL must use HTTPS.");

    const { response: createResponse, data: created } = await supabaseRequest("/auth/v1/admin/users", {
      method: "POST",
      body: { email: normalizedEmail, password, email_confirm: false, user_metadata: { full_name: fullName.trim() } },
    });
    if (!createResponse.ok || !created?.id) {
      console.error("Auth account creation failed", createResponse.status);
      return json(res, 400, { error: "Registration could not be completed. Check the details or try signing in." });
    }
    userId = created.id;

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const { response: tokenResponse } = await supabaseRequest("/rest/v1/email_verification_tokens", {
      method: "POST",
      prefer: "return=minimal",
      body: { user_id: userId, token_hash: tokenHash, expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() },
    });
    if (!tokenResponse.ok) throw new Error("Unable to create verification request.");

    const verifyUrl = new URL("/verify-email", baseUrl);
    verifyUrl.searchParams.set("token", token);
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [normalizedEmail],
        subject: "Verify your UMP CEIS account",
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Verify your email address</h2><p>Hello ${safeText(fullName.trim())},</p><p>Confirm that you control this UMP email address to activate your CEIS account.</p><p><a href="${safeText(verifyUrl.toString())}" style="display:inline-block;padding:12px 20px;background:#173b73;color:white;text-decoration:none">Verify email</a></p><p>This link expires in 30 minutes and can be used once.</p><p>If you did not register, ignore this email.</p></div>`,
      }),
    });
    if (!emailResponse.ok) {
      console.error("Resend delivery failed", emailResponse.status);
      throw new Error("Email delivery failed.");
    }
    return json(res, 200, { message: "If registration can be completed, a verification email will be sent." });
  } catch (error) {
    console.error("Signup processing failed", error.message);
    if (userId) {
      await supabaseRequest(`/rest/v1/email_verification_tokens?user_id=eq.${encodeURIComponent(userId)}`, { method: "DELETE" }).catch(() => {});
      await supabaseRequest(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE" }).catch(() => {});
    }
    return json(res, 500, { error: "Registration could not be completed. Please try again." });
  }
}
