import test from "node:test";
import assert from "node:assert/strict";
import { canAccessPortal, defaultPortal, profilePortals } from "./roles.js";

test("profilePortals rejects profiles assigned to more than one portal", () => {
  const portals = profilePortals({ roles: ["student", "admin"] });

  assert.deepEqual(portals, []);
  assert.equal(defaultPortal(portals), null);
});

test("profilePortals supports legacy and array-valued single roles", () => {
  assert.deepEqual(profilePortals({ role: "medical" }), ["responder"]);
  assert.deepEqual(profilePortals({ role: ["student", "student"] }), ["student"]);
});

test("profilePortals normalizes capitalization and whitespace for every role", () => {
  for (const [storedRole, portal] of [
    [" STUDENT ", "student"],
    ["Staff", "staff"],
    ["ADMIN", "admin"],
    [" Responder ", "responder"],
    ["SECURITY", "responder"],
    ["Medical", "responder"],
  ]) {
    assert.deepEqual(profilePortals({ role: storedRole }), [portal]);
    assert.equal(canAccessPortal(profilePortals({ role: storedRole }), portal), true);
  }
});

test("profilePortals rejects profiles with no assigned valid role", () => {
  assert.deepEqual(profilePortals({ roles: ["unknown"] }), []);
  assert.deepEqual(profilePortals({}), []);
});

test("a pending responder request does not grant portal access", () => {
  const portals = profilePortals({
    role: "student",
    requestedRole: "responder",
    roleRequestStatus: "pending",
  });

  assert.deepEqual(portals, []);
  assert.equal(canAccessPortal(portals, "student"), false);
  assert.equal(canAccessPortal(portals, "responder"), false);
});

test("pending staff, responder, and admin requests never grant the requested role", () => {
  for (const requestedRole of ["staff", "responder", "admin"]) {
    const portals = profilePortals({
      role: "student",
      requestedRole,
      roleRequestStatus: "pending",
    });
    assert.deepEqual(portals, []);
    assert.equal(canAccessPortal(portals, "student"), false);
    assert.equal(defaultPortal(portals), null);
  }
});

test("legacy pending access requests cannot inherit student portal access", () => {
  assert.deepEqual(profilePortals({
    role: "student",
    roles: ["student"],
    requestedRole: "staff",
    roleRequestStatus: "pending",
  }), []);
});

test("rejected staff requests cannot inherit student portal access", () => {
  assert.deepEqual(profilePortals({
    role: "student",
    requestedRole: "staff",
    roleRequestStatus: "rejected",
  }), []);
});

test("approved access requests grant only the approved role", () => {
  for (const role of ["staff", "responder", "admin"]) {
    const portals = profilePortals({
      role: "student",
      roles: ["student", role],
      requestedRole: role,
      roleRequestStatus: "approved",
    });
    assert.deepEqual(portals, [role]);
    assert.equal(canAccessPortal(portals, "student"), false);
  }
});

test("approved access requests normalize role and approval capitalization", () => {
  assert.deepEqual(profilePortals({
    role: "STAFF",
    requestedRole: " Staff ",
    roleRequestStatus: " APPROVED ",
  }), ["staff"]);
});

test("each portal accepts only its exact assigned role", () => {
  for (const role of ["student", "staff", "admin", "responder"]) {
    const portals = [role];
    for (const portal of ["student", "staff", "admin", "responder"]) {
      assert.equal(canAccessPortal(portals, portal), role === portal);
    }
  }
});

test("accounts with multiple assigned roles cannot sign in to any portal", () => {
  const portals = profilePortals({ role: "student", roles: ["student", "staff"] });

  assert.deepEqual(portals, []);
  for (const portal of ["student", "staff", "admin", "responder"]) {
    assert.equal(canAccessPortal(portals, portal), false);
  }
});
