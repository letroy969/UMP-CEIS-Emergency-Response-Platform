import { getConfig, json, methodNotAllowed } from "./_lib/auth.js";

export default async function handler(req, res) {
  if (methodNotAllowed(req, res)) return;
  const { accessToken } = req.body || {};
  if (typeof accessToken !== "string" || accessToken.length > 8192) return json(res, 400, { error: "Invalid session." });
  try {
    const { url, anonKey } = getConfig();
    if (!anonKey) return json(res, 503, { error: "Sign-out service is not configured." });
    const response = await fetch(`${url}/auth/v1/logout`, {
      method:"POST",
      headers:{ apikey:anonKey, Authorization:`Bearer ${accessToken}` },
    });
    if (!response.ok) return json(res, 401, { error: "Session has expired." });
    return json(res, 200, { message:"Signed out." });
  } catch (error) {
    console.error("Logout failed", error.message);
    return json(res, 503, { error: "Sign-out service is unavailable." });
  }
}
