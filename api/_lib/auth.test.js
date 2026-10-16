import test from "node:test";
import assert from "node:assert/strict";
import { roleSet } from "./auth.js";

test("a pending staff request does not retain its legacy student role", () => {
  const roles = roleSet({
    role: "student",
    roles: ["student"],
    requestedRole: "staff",
    roleRequestStatus: "pending",
  });

  assert.deepEqual([...roles], []);
});

test("an approved staff request grants only staff access", () => {
  const roles = roleSet({
    role: "staff",
    roles: ["staff"],
    requestedRole: "staff",
    roleRequestStatus: "approved",
  });

  assert.deepEqual([...roles], ["staff"]);
});

test("regular student profiles retain student access", () => {
  const roles = roleSet({ role: "student" });

  assert.deepEqual([...roles], ["student"]);
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
