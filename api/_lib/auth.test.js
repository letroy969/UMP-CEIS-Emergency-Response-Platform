import test from "node:test";
import assert from "node:assert/strict";
import { roleSet } from "./auth.js";

test("legacy pending staff requests resolve to staff without approval", () => {
  const roles = roleSet({
    role: "student",
    roles: ["student"],
    requestedRole: "staff",
    roleRequestStatus: "pending",
  });

  assert.deepEqual([...roles], ["staff"]);
});

test("a staff profile grants staff access without approval metadata", () => {
  const roles = roleSet({
    role: "staff",
    roles: ["staff"],
  });

  assert.deepEqual([...roles], ["staff"]);
});

test("a legacy staff request with conflicting assigned roles remains denied", () => {
  const roles = roleSet({
    role: "student",
    roles: ["student", "admin"],
    requestedRole: "staff",
    roleRequestStatus: "pending",
  });

  assert.deepEqual([...roles], []);
});

test("regular student profiles retain student access", () => {
  const roles = roleSet({ role: "student" });

  assert.deepEqual([...roles], ["student"]);
});

test("API role assignment normalizes capitalization and whitespace for every role", () => {
  for (const [storedRole, portal] of [
    [" STUDENT ", "student"],
    ["Staff", "staff"],
    ["ADMIN", "admin"],
    [" Responder ", "responder"],
    ["SECURITY", "responder"],
    ["Medical", "responder"],
  ]) {
    assert.deepEqual([...roleSet({ role: storedRole })], [portal]);
  }
});

test("approved access requests normalize role and approval capitalization", () => {
  const roles = roleSet({
    role: "STAFF",
    requestedRole: " Staff ",
    roleRequestStatus: " APPROVED ",
  });

  test("pending responder and admin requests do not grant API access", () => {
    for (const requestedRole of ["responder", "admin"]) {
      assert.deepEqual([...roleSet({
        role: "student",
        requestedRole,
        roleRequestStatus: "pending",
      })], []);
    }
  });

  assert.deepEqual([...roles], ["staff"]);
});

test("student profiles with another portal role are denied API roles", () => {
  const roles = roleSet({ role: "student", roles: ["student", "staff"] });

  assert.deepEqual([...roles], []);
});

test("approved requests must match the assigned role", () => {
  const roles = roleSet({
    role: "student",
    roles: ["student", "admin"],
    requestedRole: "staff",
    roleRequestStatus: "approved",
  });

  assert.deepEqual([...roles], []);
});
