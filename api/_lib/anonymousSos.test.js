import test from "node:test";
import assert from "node:assert/strict";
import {
  anonymousSosIncidentId,
  anonymousSosInput,
  anonymousSosRateLimitKey,
} from "./anonymousSos.js";

const now = Date.parse("2025-05-10T10:00:00.000Z");
const validLocation = {
  latitude: -25.430,
  longitude: 30.974,
  accuracyMeters: 35,
  locationCapturedAt: new Date(now).toISOString(),
  locationSource: "device-gps",
  campusVerified: false,
};

test("accepts a fresh, accurate GPS fix inside the server campus boundary", () => {
  const input = anonymousSosInput(validLocation, now);
  assert.equal(input.campusVerified, true);
  assert.equal(input.type, "security");
  assert.equal(input.priority, "P1");
});

test("rejects locations outside the campus even when the client claims verification", () => {
  assert.throws(
    () => anonymousSosInput({
      ...validLocation,
      latitude: -25.430,
      longitude: 30.99,
      campusVerified: true,
    }, now),
    /only within the UMP Mbombela campus boundary/,
  );
});

test("rejects missing, inaccurate, stale, or non-GPS location fixes", () => {
  assert.throws(() => anonymousSosInput({ ...validLocation, accuracyMeters: null }, now), /too uncertain/);
  assert.throws(() => anonymousSosInput({ ...validLocation, accuracyMeters: 101 }, now), /too uncertain/);
  assert.throws(() => anonymousSosInput({
    ...validLocation,
    locationCapturedAt: new Date(now - 121000).toISOString(),
  }, now), /out of date/);
  assert.throws(() => anonymousSosInput({ ...validLocation, locationSource: "map-pin" }, now), /current GPS/);
});

test("creates a stable, non-reversible rate-limit key without storing the source IP", () => {
  const first = anonymousSosRateLimitKey("203.0.113.7", "a".repeat(32));
  const second = anonymousSosRateLimitKey("203.0.113.7", "b".repeat(32));
  assert.equal(first.length, 64);
  assert.notEqual(first, second);
  assert.throws(() => anonymousSosRateLimitKey("203.0.113.7", "short"), /rate-limit protection is not configured/);
});

test("derives a stable opaque incident key from the anonymous request id", () => {
  assert.equal(anonymousSosIncidentId("request-1"), anonymousSosIncidentId("request-1"));
  assert.notEqual(anonymousSosIncidentId("request-1"), anonymousSosIncidentId("request-2"));
});
