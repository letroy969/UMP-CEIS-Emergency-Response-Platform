import test from "node:test";
import assert from "node:assert/strict";
import { criticalAlerts, emptyMedicalProfile, hasAnyDetails, normalizeMedicalProfile, withDefaults } from "./medicalProfile.js";

function profile(overrides = {}) {
  const base = emptyMedicalProfile();
  base.consent = true;
  for (const [key, value] of Object.entries(overrides)) {
    base[key] = typeof value === "object" && !Array.isArray(value) ? { ...base[key], ...value } : value;
  }
  return base;
}

test("saving requires explicit consent to share with responders", () => {
  assert.throws(() => normalizeMedicalProfile({ ...emptyMedicalProfile(), consent: false }), /consent/);
  assert.equal(normalizeMedicalProfile(profile()).consent, true);
});

test("rejects unknown options and wrong types", () => {
  assert.throws(() => normalizeMedicalProfile(profile({ allergies: { has: "maybe" } })), /Known allergies/);
  assert.throws(() => normalizeMedicalProfile(profile({ allergies: { has: "yes", types: ["plants"] } })), /Allergy type/);
  assert.throws(() => normalizeMedicalProfile(profile({ instructions: { needs: 42 } })), /must be text/);
  assert.throws(() => normalizeMedicalProfile(null), /Provide/);
});

test("text fields are bounded and stripped of control characters", () => {
  assert.throws(() => normalizeMedicalProfile(profile({ instructions: { needs: "x".repeat(1001) } })), /under 1000/);
  const saved = normalizeMedicalProfile(profile({ instructions: { needs: "  Epi\u0000Pen in bag\nleft pocket  " } }));
  assert.equal(saved.instructions.needs, "EpiPen in bag\nleft pocket");
});

test("answering No clears the section's details so stale data is never shown", () => {
  const saved = normalizeMedicalProfile(profile({
    allergies: { has: "no", types: ["food"], allergens: "Peanuts", severity: "severe" },
    medication: { taking: "no", items: [{ name: "Insulin" }], carriesEmergency: "no", emergencyType: "EpiPen" },
    accessibility: { needsAssistance: "no", needs: ["mobility"], usesDevice: "no", devices: ["wheelchair"] },
  }));
  assert.deepEqual(saved.allergies, { has: "no", types: [], allergens: "", severity: "", reactions: "", precautions: "" });
  assert.deepEqual(saved.medication.items, []);
  assert.equal(saved.medication.emergencyType, "");
  assert.deepEqual(saved.accessibility.needs, []);
  assert.deepEqual(saved.accessibility.devices, []);
});

test("medications drop empty rows, need a name, and are capped", () => {
  const saved = normalizeMedicalProfile(profile({
    medication: { taking: "yes", items: [{ name: "Ventolin", frequency: "as_needed" }, { name: "", dosage: "" }] },
  }));
  assert.deepEqual(saved.medication.items, [{ name: "Ventolin", dosage: "", frequency: "as_needed", frequencyOther: "", reason: "" }]);
  assert.throws(() => normalizeMedicalProfile(profile({ medication: { taking: "yes", items: [{ dosage: "5mg" }] } })), /name for each medication/);
  assert.throws(() => normalizeMedicalProfile(profile({ medication: { taking: "yes", items: Array.from({ length: 11 }, () => ({ name: "x" })) } })), /at most 10/);
});

test("multi-select answers are de-duplicated and kept in a stable order", () => {
  const saved = normalizeMedicalProfile(profile({ accessibility: { needsAssistance: "yes", needs: ["hearing", "mobility", "hearing"] } }));
  assert.deepEqual(saved.accessibility.needs, ["mobility", "hearing"]);
});

test("'Other' free text is kept only when Other is selected", () => {
  const withOther = normalizeMedicalProfile(profile({ accessibility: { needsAssistance: "yes", needs: ["other"], otherNeed: "Guide dog" } }));
  assert.equal(withOther.accessibility.otherNeed, "Guide dog");
  const without = normalizeMedicalProfile(profile({ accessibility: { needsAssistance: "yes", needs: ["visual"], otherNeed: "Guide dog" } }));
  assert.equal(without.accessibility.otherNeed, "");
});

test("critical alerts surface the facts a responder needs first", () => {
  const alerts = criticalAlerts(profile({
    allergies: { has: "yes", severity: "life_threatening", allergens: "Peanuts" },
    medication: { carriesEmergency: "yes", emergencyType: "EpiPen", keptWhere: "Backpack" },
    accessibility: { evacuationHelp: "yes", needs: ["hearing"] },
  }));
  assert.deepEqual(alerts, [
    "Life-threatening allergy: Peanuts",
    "Carries emergency medication: EpiPen (kept: Backpack)",
    "Needs assistance evacuating buildings",
    "Hearing impairment",
  ]);
});

test("defaults fill missing keys and empty profiles report no details", () => {
  const filled = withDefaults({ consent: true, allergies: { has: "no" } });
  assert.equal(filled.medication.taking, "");
  assert.equal(hasAnyDetails(emptyMedicalProfile()), false);
  assert.equal(hasAnyDetails(filled), true);
});
