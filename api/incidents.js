import { json, methodNotAllowed, requireActor, userDatabaseRequest } from "./_lib/auth.js";

const STAFF = new Set(["staff", "admin", "security", "medical"]);
const TYPES = new Set(["medical", "fire", "security", "hazard", "infrastructure", "wellbeing", "other"]);
const PRIORITIES = new Set(["P1", "P2", "P3", "P4"]);
const STATUSES = new Set(["NEW", "ACKNOWLEDGED", "TEAM_DISPATCHED", "ON_SCENE", "RESOLVED", "CLOSED"]);
const COLUMNS = "id,reference,reported_by,incident_type,priority,building,description,status,responder,latitude,longitude,accuracy_meters,location_captured_at,location_source,campus_verified,reporter_name,created_at,updated_at,dispatched_at,resolved_at";

function present(row) {
  return {
    id: row.id, reference: row.reference, reportedBy: row.reported_by,
    type: row.incident_type, priority: row.priority, building: row.building,
    loc: `Building ${row.building}`, desc: row.description, status: row.status,
    responder: row.responder || "Pending assignment", lat: row.latitude, lng: row.longitude,
    accuracy: row.accuracy_meters, locationCapturedAt: row.location_captured_at,
    locationSource: row.location_source, campusVerified: row.campus_verified,
    reporter: row.reporter_name, createdAt: row.created_at, updatedAt: row.updated_at,
    dispatchedAt: row.dispatched_at, resolvedAt: row.resolved_at,
    time: new Date(row.created_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default async function handler(req, res) {
  if (!["GET", "POST", "PATCH"].includes(req.method)) return methodNotAllowed(req, res, "GET, POST, PATCH");
  try {
    const actor = await requireActor(req);
    if (!actor) return json(res, 401, { error: "Sign in to access incident reports." });

    if (req.method === "GET") {
      const query = new URLSearchParams({ select: COLUMNS, order: "created_at.desc", limit: "500" });
      if (req.query?.mine === "true") query.set("reported_by", `eq.${actor.id}`);
      const { response, data } = await userDatabaseRequest(actor.token, `incidents?${query}`);
      if (!response.ok) return json(res, 502, { error: "Could not load incident reports." });
      return json(res, 200, (data || []).map(present));
    }

    const body = req.body || {};
    if (req.method === "POST") {
      if (!TYPES.has(body.type) || !PRIORITIES.has(body.priority) || !/^\d{1,3}$/.test(String(body.building || "")) || typeof body.desc !== "string" || body.desc.trim().length < 3 || body.desc.length > 4000) {
        return json(res, 400, { error: "Provide a valid incident type, priority, building, and description." });
      }
      const row = {
        reported_by: actor.id, incident_type: body.type, priority: body.priority,
        building: String(body.building), description: body.desc.trim(),
        latitude: body.lat ?? null, longitude: body.lng ?? null,
        accuracy_meters: body.accuracy ?? null, location_captured_at: body.locationCapturedAt ?? null,
        location_source: body.locationSource ?? null, campus_verified: body.campusVerified ?? null,
        reporter_name: typeof body.reporter === "string" ? body.reporter.trim().slice(0, 100) : null,
      };
      if ((row.latitude === null) !== (row.longitude === null)) return json(res, 400, { error: "Location must include both coordinates." });
      const { response, data } = await userDatabaseRequest(actor.token, "incidents", { method: "POST", body: row, prefer: "return=representation" });
      if (!response.ok || !data?.[0]) return json(res, response.status === 401 ? 401 : 400, { error: "Incident report could not be saved." });
      return json(res, 201, present(data[0]));
    }

    if (!STAFF.has(actor.role)) return json(res, 403, { error: "Staff access is required to update incidents." });
    if (typeof body.id !== "string" || !STATUSES.has(body.status)) return json(res, 400, { error: "Provide a valid incident and status." });
    const update = { status: body.status, updated_at: new Date().toISOString() };
    if (body.responder !== undefined) {
      if (typeof body.responder !== "string" || body.responder.length > 120) return json(res, 400, { error: "Responder name is invalid." });
      update.responder = body.responder;
    }
    if (body.status === "TEAM_DISPATCHED") update.dispatched_at = new Date().toISOString();
    if (["RESOLVED", "CLOSED"].includes(body.status)) update.resolved_at = new Date().toISOString();
    const { response, data } = await userDatabaseRequest(actor.token, `incidents?id=eq.${encodeURIComponent(body.id)}&select=${COLUMNS}`, { method: "PATCH", body: update, prefer: "return=representation" });
    if (!response.ok) return json(res, 400, { error: "Incident update could not be saved." });
    if (!data?.[0]) return json(res, 404, { error: "Incident not found or access denied." });
    return json(res, 200, present(data[0]));
  } catch (error) {
    console.error("Incident request failed", error.message);
    return json(res, 503, { error: "Incident service is unavailable." });
  }
}
