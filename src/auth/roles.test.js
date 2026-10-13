import test from "node:test";
import assert from "node:assert/strict";
import { defaultPortal, profilePortals } from "./roles.js";

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
