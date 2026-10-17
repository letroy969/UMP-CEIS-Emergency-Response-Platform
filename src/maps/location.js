import { booleanPointInPolygon, point } from "@turf/turf";
import campusBoundary from "./campus-boundary.json";
import { getAccurateCurrentLocation, getCurrentLocation } from "./geolocation.js";

export { campusBoundary, getAccurateCurrentLocation, getCurrentLocation };

export function checkCampusLocation({ latitude, longitude, accuracyMeters }) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "unknown";

  const insideBoundary = booleanPointInPolygon(
    point([longitude, latitude]),
    campusBoundary,
  );

  // A reported GPS radius above 100 m can cross the campus edge. Keep that
  // result explicitly uncertain rather than treating it as a verified fix.
  if (Number.isFinite(accuracyMeters) && accuracyMeters > 100) return "uncertain";
  if (!Number.isFinite(accuracyMeters)) return "unverified";
  return insideBoundary ? "inside" : "outside";
}
