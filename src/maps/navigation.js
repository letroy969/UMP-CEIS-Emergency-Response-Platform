import { MAPPED_BUILDINGS } from "./campusBuildings.js";

// Pure geo helpers for the responder's live navigation guide.

const EARTH_RADIUS_M = 6371000;
const WALKING_SPEED_MPS = 1.35; // brisk walk; responders are often on foot on campus
const DRIVING_SPEED_MPS = 30 / 3.6; // campus roads, ~30 km/h
export const ARRIVAL_RADIUS_M = 30;
const COMPASS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];

const radians = degrees => (degrees * Math.PI) / 180;
const degrees = rad => (rad * 180) / Math.PI;

export function isCoordinate(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

export function distanceMeters(from, to) {
  const dLat = radians(to.lat - from.lat);
  const dLng = radians(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Initial great-circle bearing from `from` to `to`, 0–360° clockwise from north.
export function bearingDegrees(from, to) {
  const y = Math.sin(radians(to.lng - from.lng)) * Math.cos(radians(to.lat));
  const x = Math.cos(radians(from.lat)) * Math.sin(radians(to.lat))
    - Math.sin(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.cos(radians(to.lng - from.lng));
  return (degrees(Math.atan2(y, x)) + 360) % 360;
}

export function compassLabel(bearing) {
  return COMPASS[Math.round((((bearing % 360) + 360) % 360) / 45) % 8];
}

export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.max(1, Math.round(meters / 5) * 5)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

export function etaMinutes(meters, mode = "walking") {
  if (!Number.isFinite(meters)) return null;
  const speed = mode === "driving" ? DRIVING_SPEED_MPS : WALKING_SPEED_MPS;
  return Math.max(1, Math.round(meters / speed / 60));
}

// Where to send the responder: the reporter's GPS fix when there is one,
// otherwise the mapped centre of the reported building. Returns null if the
// report has neither (the responder must rely on the written location).
export function navigationTarget(incident) {
  const lat = Number(incident?.lat);
  const lng = Number(incident?.lng);
  if (incident?.lat != null && incident?.lng != null && isCoordinate(lat, lng)) {
    return {
      lat,
      lng,
      source: "gps",
      accuracyMeters: Number.isFinite(Number(incident.accuracy)) ? Number(incident.accuracy) : null,
      label: incident.buildingName || "Reported GPS location",
    };
  }
  const building = MAPPED_BUILDINGS.find(item => item.id === String(incident?.building));
  if (building) {
    return { lat: building.lat, lng: building.lng, source: "building", accuracyMeters: null, label: building.name };
  }
  return null;
}

export function directionsLinks(target) {
  const destination = `${target.lat},${target.lng}`;
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=walking`,
    googleDriving: `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`,
    waze: `https://waze.com/ul?ll=${destination}&navigate=yes`,
  };
}

// One summary the navigation panel renders. `position` is the responder's
// latest GPS fix ({ lat, lng, accuracyMeters }) or null.
export function navigationSummary(position, target) {
  if (!target || !position || !isCoordinate(position.lat, position.lng)) return null;
  const meters = distanceMeters(position, target);
  const bearing = bearingDegrees(position, target);
  // Treat "arrived" generously when either fix is imprecise.
  const arrivalRadius = Math.max(ARRIVAL_RADIUS_M, Math.min(100, (position.accuracyMeters || 0) + (target.accuracyMeters || 0)));
  return {
    meters,
    bearing,
    direction: compassLabel(bearing),
    walkMinutes: etaMinutes(meters, "walking"),
    driveMinutes: etaMinutes(meters, "driving"),
    arrived: meters <= arrivalRadius,
  };
}
