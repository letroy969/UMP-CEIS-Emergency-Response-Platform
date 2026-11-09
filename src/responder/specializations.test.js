import test from "node:test";
import assert from "node:assert/strict";
import {
  INCIDENT_SPECIALIZATIONS,
  SPECIALIZATION_KEYS,
  canHandleIncident,
  isSpecialization,
  responderSpecialization,
  specializationLabel,
  specializationsForIncident,
} from "./specializations.js";
import { INCIDENT_TYPES } from "../../api/_lib/validation.js";

test("every incident type has at least one responder field", () => {
  for (const type of INCIDENT_TYPES) {
    const fields = INCIDENT_SPECIALIZATIONS[type];
    assert.ok(fields?.length, `${type} has no responder fields`);
    fields.forEach(field => assert.ok(isSpecialization(field), `${type} lists unknown field ${field}`));
  }
});

test("responders are matched to incidents by field", () => {
  assert.equal(canHandleIncident("nurse", { type: "medical" }), true);
  assert.equal(canHandleIncident("electrician", { type: "medical" }), false);
  assert.equal(canHandleIncident("electrician", { type: "infrastructure" }), true);
  assert.equal(canHandleIncident("security", { type: "infrastructure" }), false);
  assert.equal(canHandleIncident("counsellor", { type: "other" }), true);
  assert.equal(canHandleIncident(null, { type: "other" }), false);
});

test("SOS goes only to front-line fields, whatever its stored type", () => {
  assert.deepEqual([...specializationsForIncident({ isSOS: true, type: "security" })], ["security", "medical", "nurse"]);
  assert.equal(canHandleIncident("medical", { isSOS: true, type: "security" }), true);
  assert.equal(canHandleIncident("electrician", { isSOS: true, type: "security" }), false);
});

test("unknown incident types fall back to any field", () => {
  assert.deepEqual([...specializationsForIncident({ type: "unknown" })], SPECIALIZATION_KEYS);
});

test("a stored field wins; legacy security and medical roles map to a field", () => {
  assert.equal(responderSpecialization({ role: "responder", specialization: "nurse" }), "nurse");
  assert.equal(responderSpecialization({ role: "security" }), "security");
  assert.equal(responderSpecialization({ role: "responder", roles: ["medical"] }), "medical");
  assert.equal(responderSpecialization({ role: "responder" }), null);
  assert.equal(responderSpecialization({ role: "responder", specialization: "wizard" }), null);
  assert.equal(responderSpecialization(null), null);
});

test("labels name the field or say it is missing", () => {
  assert.equal(specializationLabel("electrician"), "Electrician");
  assert.equal(specializationLabel(undefined), "Field not set");
});
