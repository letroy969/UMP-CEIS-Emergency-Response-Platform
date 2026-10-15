import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEmergencyPhone, validateEmergencyContact, validateStudentProfile } from "./profileValidation.js";

test("normalizes South African emergency contact numbers", () => {
  assert.equal(normalizeEmergencyPhone("082 123 4567"), "+27821234567");
  assert.equal(normalizeEmergencyPhone("27 82 123 4567"), "+27821234567");
  assert.deepEqual(
    validateEmergencyContact({ name: "A Friend", relationship: "Friend", phone: "082-123-4567" }),
    { name: "A Friend", relationship: "Friend", phone: "+27821234567" },
  );
});

test("rejects invalid emergency contact details", () => {
  assert.throws(
    () => validateEmergencyContact({ name: "A", relationship: "Friend", phone: "not a number" }),
    /Contact name must be between 2 and 80 characters/,
  );
  assert.throws(
    () => validateEmergencyContact({ name: "A Friend", relationship: "Friend", phone: "123" }),
    /Enter a valid phone number/,
  );
});

test("validates editable student profile fields without roles or approval status", () => {
  assert.deepEqual(
    validateStudentProfile({ fullName: " Sihle Dladla ", faculty: "Science", department: "ICT", year: "2" }),
    { fullName: "Sihle Dladla", faculty: "Science", department: "ICT", year: 2 },
  );
  assert.throws(
    () => validateStudentProfile({ fullName: "Sihle", faculty: "", department: "", year: 9 }),
    /Study year must be a number between 1 and 8/,
  );
});
