import test from "node:test";
import assert from "node:assert/strict";
import {
  signupRoleFor,
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

test("requires UMP email addresses for staff and admin access requests", () => {
  for (const role of ["staff", "admin"]) {
    assert.equal(validateRegistrationEmail(`person@ump.ac.za`, role), "person@ump.ac.za");
    assert.throws(() => validateRegistrationEmail("person@example.com", role), /official UMP/);
  }
});

test("first sign-in keeps the account type chosen at signup", () => {
  assert.equal(signupRoleFor("responder", "medic@example.com"), "responder");
  assert.equal(signupRoleFor("admin", "boss@ump.ac.za"), "admin");
  assert.equal(signupRoleFor("staff", "person@ump.ac.za"), "staff");
});

test("first sign-in on another device infers responder for non-UMP emails only", () => {
  assert.equal(signupRoleFor(null, "Medic@Example.com"), "responder");
  assert.equal(signupRoleFor("bogus", "medic@example.com"), "responder");
  assert.equal(signupRoleFor(null, "230021646@ump.ac.za"), "student");
  assert.equal(signupRoleFor(null, "person@ump.ac.za"), "student");
});

test("responder access requests accept any valid email address", () => {
  assert.equal(validateRegistrationEmail(" Medic@Example.com ", "responder"), "medic@example.com");
  assert.equal(validateRegistrationEmail("person@ump.ac.za", "responder"), "person@ump.ac.za");
  for (const invalid of ["", "no-at-sign", "a@b", "two@@example.com", "spaces in@example.com", `${"x".repeat(250)}@example.com`]) {
    assert.throws(() => validateRegistrationEmail(invalid, "responder"), /valid email/);
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
