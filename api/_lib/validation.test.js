import test from "node:test";
import assert from "node:assert/strict";
import { incidentInput } from "./validation.js";

const validIncident = {
  type: "medical",
  priority: "P3",
};

test("accepts a GPS-only incident with no description or building", () => {
  const incident = incidentInput({
    ...validIncident,
    latitude: -25.4355,
    longitude: 30.9823,
    locationSource: "device-gps",
  });

  assert.equal(incident.description, "");
  assert.equal(incident.building, "0");
  assert.equal(incident.latitude, -25.4355);
  assert.equal(incident.locationSource, "device-gps");
});

test("accepts an empty description when a campus building is selected", () => {
  const incident = incidentInput({
    ...validIncident,
    description: " ",
    building: "3",
    buildingName: "ICT Building",
  });

  assert.equal(incident.description, "");
  assert.equal(incident.building, "3");
  assert.equal(incident.buildingName, "ICT Building");
});

test("requires either GPS coordinates or a valid campus building", () => {
  assert.throws(
    () => incidentInput({ ...validIncident, description: "" }),
    /Choose a valid campus building/,
  );
  assert.throws(
    () => incidentInput({ ...validIncident, building: "ICT", description: "" }),
    /Choose a valid campus building/,
  );
});

test("still validates a supplied description", () => {
  assert.throws(
    () => incidentInput({ ...validIncident, building: "3", description: "No" }),
    /Description must be 3–4000 characters/,
  );
});

test("accepts an SOS position on the equator", () => {
  const incident = incidentInput({
    latitude: 0,
    longitude: 30,
  }, { sos: true });

  assert.equal(incident.latitude, 0);
  assert.equal(incident.building, "0");
});
