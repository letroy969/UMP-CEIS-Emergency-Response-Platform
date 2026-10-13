export const INCIDENT_TYPES = new Set(["medical", "fire", "security", "hazard", "infrastructure", "wellbeing", "other"]);
export const PRIORITIES = new Set(["P1", "P2", "P3", "P4"]);
export const STATUSES = new Set(["NEW", "ACKNOWLEDGED", "TEAM_DISPATCHED", "ON_SCENE", "RESOLVED", "CLOSED"]);

export function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

export function text(value, name, { min = 1, max = 4000 } = {}) {
  if (typeof value !== "string") fail(`${name} must be text.`);
  const result = value.trim();
  if (result.length < min || result.length > max) fail(`${name} must be ${min}–${max} characters.`);
  return result;
}

export function coordinates(latitude, longitude) {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    fail("Valid latitude and longitude are required.");
  }
  return { latitude, longitude };
}

export function incidentInput(body, { sos = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) fail("Provide an incident object.");
  const type = sos ? "security" : body.type;
  const priority = sos ? "P1" : body.priority;
  if (!INCIDENT_TYPES.has(type)) fail("Choose a supported incident type.");
  if (!PRIORITIES.has(priority)) fail("Choose a supported priority.");
  const description = sos
    ? (typeof body.description === "string" ? body.description.trim().slice(0, 1000) || "SOS assistance requested." : "SOS assistance requested.")
    : text(body.description ?? body.desc, "Description", { min: 3, max: 4000 });

  const latitude = body.latitude ?? body.lat;
  const longitude = body.longitude ?? body.lng;
  const coords = latitude == null && longitude == null ? {} : coordinates(latitude, longitude);
  if (sos && !coords.latitude) fail("SOS requires location permission so responders can find you.");

  const building = typeof body.building === "string" && /^\d{1,3}$/.test(body.building.trim())
    ? body.building.trim()
    : (sos ? "0" : null);
  if (!building) fail("Choose a valid campus building.");

  const accuracy = body.accuracyMeters ?? body.accuracy;
  if (accuracy != null && (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 10000)) fail("Location accuracy is invalid.");
  return {
    type,
    priority,
    description,
    building,
    ...coords,
    accuracyMeters: accuracy ?? null,
    locationCapturedAt: coords.latitude ? new Date() : null,
    locationSource: coords.latitude ? "browser" : null,
    campusVerified: typeof body.campusVerified === "boolean" ? body.campusVerified : null,
  };
}
