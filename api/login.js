import { enforceRateLimit, getConfig, json, methodNotAllowed, normalizeEmail, validEmail } from "./_lib/auth.js";

export default async function handler(req, res) {
  if (methodNotAllowed(req, res)) return;
  const { action = "login", email, password, refreshToken } = req.body || {};
  try {
    const config = getConfig();
    if (!config.anonKey) return json(res, 503, { error: "Sign-in is not configured yet." });
    let response;
    if (action === "refresh") {
      if (typeof refreshToken !== "string" || refreshToken.length > 4096) return json(res, 400, { error: "Your session has expired. Sign in again." });
      response = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: { apikey: config.anonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } else {
      if (action !== "login" || !validEmail(email) || typeof password !== "string" || password.length < 1 || password.length > 128) return json(res, 400, { error: "Enter your UMP email address and password." });
      if (!await enforceRateLimit(req, "login", normalizeEmail(email))) return json(res, 429, { error: "Too many sign-in attempts. Wait 15 minutes and try again." });
      response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: config.anonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizeEmail(email), password }),
      });
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.access_token || !result.user) {
      if (action === "refresh") return json(res, 401, { error: "Your session has expired. Sign in again." });
      return json(res, 401, { error: "We could not sign you in. Check your details and verify your email address." });
    }

    const metadata = result.user.app_metadata || {};
    const role = typeof metadata.ceis_role === "string" ? metadata.ceis_role : "student";
    const allowedRoles = ["student", "staff", "admin", "security", "medical"];
    const sessionUser = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.user_metadata?.full_name || result.user.email,
      faculty: result.user.user_metadata?.faculty || "Faculty not listed",
      year: result.user.user_metadata?.year || 1,
      dept: result.user.user_metadata?.department || "",
      role: allowedRoles.includes(role) ? role : "student",
      access: ({ admin: "full", staff: "staff", security: "security", medical: "medical", student: "student" })[allowedRoles.includes(role) ? role : "student"],
      portal: role === "student" || !allowedRoles.includes(role) ? "student" : "staff",
    };
    return json(res, 200, {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      expiresIn: result.expires_in,
      user: sessionUser,
    });
  } catch (error) {
    console.error("Authentication request failed", error.message);
    return json(res, 503, { error: "Authentication service is unavailable. Please try again later." });
  }
}
