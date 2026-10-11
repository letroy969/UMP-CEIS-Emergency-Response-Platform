import { json, methodNotAllowed, requireActor, userDatabaseRequest } from "./_lib/auth.js";

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) return methodNotAllowed(req, res, "GET, POST");
  try {
    const actor = await requireActor(req);
    if (!actor) return json(res, 401, { error: "Sign in to access safety check-ins." });
    if (req.method === "GET") {
      const { response, data } = await userDatabaseRequest(actor.token, `safety_checkins?select=id,status,note,latitude,longitude,created_at&user_id=eq.${actor.id}&order=created_at.desc&limit=1`);
      if (!response.ok) return json(res, 502, { error: "Could not load your safety status." });
      return json(res, 200, data?.[0] || null);
    }
    const { status, note, lat, lng } = req.body || {};
    if (!["safe", "help"].includes(status) || (note !== undefined && (typeof note !== "string" || note.length > 500))) {
      return json(res, 400, { error: "Choose safe or needs help and keep notes under 500 characters." });
    }
    if ((lat == null) !== (lng == null) || (lat != null && (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180))) {
      return json(res, 400, { error: "Location coordinates are invalid." });
    }
    const { response, data } = await userDatabaseRequest(actor.token, "safety_checkins", {
      method: "POST", prefer: "return=representation",
      body: { user_id: actor.id, status, note: note?.trim() || null, latitude: lat ?? null, longitude: lng ?? null },
    });
    if (!response.ok || !data?.[0]) return json(res, 400, { error: "Safety check-in could not be saved." });
    return json(res, 201, data[0]);
  } catch (error) {
    console.error("Safety check-in request failed", error.message);
    return json(res, 503, { error: "Safety check-in service is unavailable." });
  }
}
