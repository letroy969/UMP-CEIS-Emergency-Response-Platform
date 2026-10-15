import { createHash, createHmac } from "node:crypto";
import { createRequire } from "node:module";
import { booleanPointInPolygon, point } from "@turf/turf";
import { fail, incidentInput } from "./validation.js";

const MAX_LOCATION_AGE_MS = 2 * 60 * 1000;
const ALLOWED_FUTURE_SKEW_MS = 10 * 1000;
const require = createRequire(import.meta.url);
const campusBoundary = require("../../src/maps/campus-boundary.json");

export function anonymousSosInput(body, now = Date.now()) {
  const input = incidentInput(body, { sos: true });
  if (input.locationSource !== "device-gps") {
    fail("Anonymous SOS requires a current GPS location.");
  }
  if (input.accuracyMeters == null || input.accuracyMeters > 100) {
    fail("Your GPS location is too uncertain to verify campus boundaries. Try again outdoors or call campus security directly.");
  }

  const capturedAt = typeof body.locationCapturedAt === "string"
    ? Date.parse(body.locationCapturedAt)
    : Number.NaN;
  if (!Number.isFinite(capturedAt)
    || capturedAt < now - MAX_LOCATION_AGE_MS
    || capturedAt > now + ALLOWED_FUTURE_SKEW_MS) {
    fail("The GPS location is missing or out of date. Request a fresh location and try again.");
  }

  const insideCampus = booleanPointInPolygon(
    point([input.longitude, input.latitude]),
    campusBoundary,
  );
  if (!insideCampus) {
    fail("Anonymous SOS is available only within the UMP Mbombela campus boundary. Call emergency services or campus security directly if you need help elsewhere.");
  }

  return { ...input, campusVerified: true };
}

export function anonymousSosRateLimitKey(ipAddress, secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    const error = new Error("Anonymous SOS rate-limit protection is not configured.");
    error.status = 503;
    error.publicMessage = "Anonymous SOS is unavailable until the API server has a secure SOS_RATE_LIMIT_SECRET configured.";
    throw error;
  }
  if (typeof ipAddress !== "string" || !ipAddress.trim()) {
    const error = new Error("The request IP could not be determined for anonymous SOS abuse protection.");
    error.status = 503;
    error.publicMessage = "Anonymous SOS is temporarily unavailable because the server could not verify the request source.";
    throw error;
  }
  return createHmac("sha256", secret).update(ipAddress.trim()).digest("hex");
}

export function anonymousSosIncidentId(requestId) {
  return createHash("sha256").update(requestId).digest("hex");
}
