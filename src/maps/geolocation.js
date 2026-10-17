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

export function getAccurateCurrentLocation({
  geolocation = navigator.geolocation,
  maxAccuracyMeters = 100,
  timeoutMs = 30000,
} = {}) {
  if (!geolocation) {
    return Promise.reject(new Error("This browser does not support location services."));
  }

  return new Promise((resolve, reject) => {
    let watchId = null;
    let timeoutId;
    let bestAccuracy = null;
    let settled = false;

    function stopWatching() {
      globalThis.clearTimeout(timeoutId);
      if (watchId !== null) geolocation.clearWatch(watchId);
    }

    function finish(callback, value) {
      if (settled) return;
      settled = true;
      stopWatching();
      callback(value);
    }

    function toLocation({ coords, timestamp }) {
      return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracyMeters: coords.accuracy,
        capturedAt: new Date(timestamp).toISOString(),
        source: "device-gps",
      };
    }

    timeoutId = globalThis.setTimeout(() => {
      const message = bestAccuracy === null
        ? "Location request timed out. Please try again."
        : `Your GPS accuracy is still ±${Math.round(bestAccuracy)} m. Move to an open area and try again, or call campus security directly.`;
      finish(reject, new Error(message));
    }, timeoutMs);

    try {
      watchId = geolocation.watchPosition(
        position => {
          const { accuracy } = position.coords;
          if (Number.isFinite(accuracy) && (bestAccuracy === null || accuracy < bestAccuracy)) {
            bestAccuracy = accuracy;
          }
          if (Number.isFinite(accuracy) && accuracy <= maxAccuracyMeters) {
            finish(resolve, toLocation(position));
          }
        },
        error => {
          const messages = {
            1: "Location permission was denied. Allow location access in your browser settings and try again.",
            2: "Your device could not determine a location. Try again where GPS reception is stronger.",
            3: "Location request timed out. Please try again.",
          };
          finish(reject, new Error(messages[error.code] || "Unable to get your location."));
        },
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
      );
    } catch (error) {
      finish(reject, error);
    }
  });
}
