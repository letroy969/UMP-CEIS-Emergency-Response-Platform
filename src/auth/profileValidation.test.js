import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeEmergencyPhone,
  validateEmergencyContact,
  validateRegistrationEmail,
  validateStudentProfile,
} from "./profileValidation.js";

test("accepts only a 19-character nine-digit student email", () => {
  assert.equal(validateRegistrationEmail("230021646@ump.ac.za", "student"), "230021646@ump.ac.za");
  assert.throws(() => validateRegistrationEmail("student@ump.ac.za", "student"), /9-digit student number/);
  assert.throws(() => validateRegistrationEmail("23002164@ump.ac.za", "student"), /19 characters total/);
  assert.throws(() => validateRegistrationEmail("230021646@gmail.com", "student"), /@ump\.ac\.za/);
});

test("requires UMP email addresses for staff and privileged access requests", () => {
  for (const role of ["staff", "responder", "admin"]) {
    assert.equal(validateRegistrationEmail(`person@ump.ac.za`, role), "person@ump.ac.za");
    assert.throws(() => validateRegistrationEmail("person@example.com", role), /official UMP/);
  }
});

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
