import { booleanPointInPolygon, point } from "@turf/turf";
import campusBoundary from "./campus-boundary.json";

export { campusBoundary };

export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser does not support location services."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords, timestamp }) => resolve({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracyMeters: coords.accuracy,
        capturedAt: new Date(timestamp).toISOString(),
        source: "device-gps",
      }),
      (error) => {
        const messages = {
          1: "Location permission was denied. Allow location access in your browser settings and try again.",
          2: "Your device could not determine a location. Try again where GPS reception is stronger.",
          3: "Location request timed out. Please try again.",
        };
        reject(new Error(messages[error.code] || "Unable to get your location."));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

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
