import test from "node:test";
import assert from "node:assert/strict";
import { getAccurateCurrentLocation } from "./geolocation.js";

function createGeolocation() {
  let onSuccess;
  let onError;
  let clearedWatch = false;
  return {
    api: {
      watchPosition(success, error) {
        onSuccess = success;
        onError = error;
        return 7;
      },
      clearWatch(id) {
        assert.equal(id, 7);
        clearedWatch = true;
      },
    },
    success(position) {
      onSuccess(position);
    },
    error(error) {
      onError(error);
    },
    wasCleared() {
      return clearedWatch;
    },
  };
}

function position(accuracy, timestamp = Date.now()) {
  return {
    coords: { latitude: -25.43, longitude: 30.974, accuracy },
    timestamp,
  };
}

test("accurate location capture waits for a GPS reading within the accuracy limit", async () => {
  const geolocation = createGeolocation();
  const resultPromise = getAccurateCurrentLocation({
    geolocation: geolocation.api,
    timeoutMs: 1000,
  });

  geolocation.success(position(240));
  geolocation.success(position(72));

  const result = await resultPromise;
  assert.equal(result.accuracyMeters, 72);
  assert.equal(result.source, "device-gps");
  assert.equal(geolocation.wasCleared(), true);
});

test("inaccurate GPS readings are not accepted when the capture times out", async () => {
  const geolocation = createGeolocation();
  const resultPromise = getAccurateCurrentLocation({
    geolocation: geolocation.api,
    timeoutMs: 5,
  });

  geolocation.success(position(240));
  await assert.rejects(resultPromise, /accuracy is still ±240 m/);
  assert.equal(geolocation.wasCleared(), true);
});

test("geolocation errors stop the GPS watch and report permission failures", async () => {
  const geolocation = createGeolocation();
  const resultPromise = getAccurateCurrentLocation({
    geolocation: geolocation.api,
    timeoutMs: 1000,
  });

  geolocation.error({ code: 1 });

  await assert.rejects(resultPromise, /Location permission was denied/);
  assert.equal(geolocation.wasCleared(), true);
});
