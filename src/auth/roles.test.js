import test from "node:test";
import assert from "node:assert/strict";
import { canAccessPortal, defaultPortal, profilePortals } from "./roles.js";

test("profilePortals supports student and admin roles together", () => {
  const portals = profilePortals({ roles: ["student", "admin"] });

  assert.deepEqual(portals, ["student", "admin"]);
  assert.equal(defaultPortal(portals), "admin");
});

test("profilePortals supports legacy and array-valued role fields", () => {
  assert.deepEqual(profilePortals({ role: "medical" }), ["responder"]);
  assert.deepEqual(profilePortals({ role: ["student", "admin"] }), ["student", "admin"]);
});

test("profilePortals ignores unknown roles and safely defaults to student", () => {
  assert.deepEqual(profilePortals({ roles: ["unknown"] }), ["student"]);
});

test("a pending responder request does not grant responder portal access", () => {
  assert.deepEqual(profilePortals({
    role: "student",
    requestedRole: "responder",
    roleRequestStatus: "pending",
  }), ["student"]);
});

test("pending staff, responder, and admin requests never grant the requested role", () => {
  for (const requestedRole of ["staff", "responder", "admin"]) {
    assert.deepEqual(profilePortals({
      role: "student",
      requestedRole,
      roleRequestStatus: "pending",
    }), ["student"]);
  }
});

test("approved access requests grant only the approved role", () => {
  for (const role of ["staff", "responder", "admin"]) {
    assert.deepEqual(profilePortals({ role, roles: [role], requestedRole: role, roleRequestStatus: "approved" }), [role]);
  }
});

test("portal sign-in requires the matching privileged role", () => {
  const portals = ["student", "admin", "responder"];

  assert.equal(canAccessPortal(portals, "admin"), true);
  assert.equal(canAccessPortal(portals, "responder"), true);
  assert.equal(canAccessPortal(["student"], "admin"), false);
});
