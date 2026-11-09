import test from "node:test";
import assert from "node:assert/strict";
import { roleSet } from "./auth.js";
import {
  accountStatus,
  assignableRole,
  auditEntry,
  banEndDate,
  deletionConfirmed,
  isResponderProfile,
  isSuspendedProfile,
  roleChangeFields,
  sendPasswordResetEmail,
  summarizeUser,
  suspensionReason,
  targetUid,
} from "./adminUsers.js";

const NOW = Date.parse("2026-11-09T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;

test("temporary bans block until their end date and then lift themselves", () => {
  const banned = { accountStatus: "suspended", suspendedUntil: new Date(NOW + HOUR) };
  assert.equal(isSuspendedProfile(banned, NOW), true);
  assert.equal(isSuspendedProfile(banned, NOW + 2 * HOUR), false);
  assert.equal(accountStatus(null, banned, NOW), "banned");
  assert.equal(accountStatus(null, banned, NOW + 2 * HOUR), "active");
});

test("bans read Firestore Timestamps as well as dates", () => {
  const banned = { accountStatus: "suspended", suspendedUntil: { toMillis: () => NOW + HOUR } };
  assert.equal(isSuspendedProfile(banned, NOW), true);
});

test("indefinite suspension and disabled logins never lift on their own", () => {
  assert.equal(isSuspendedProfile({ accountStatus: "suspended" }, NOW + 1e12), true);
  assert.equal(accountStatus({ disabled: true }, { accountStatus: "active" }, NOW), "suspended");
  assert.equal(accountStatus(null, { role: "student" }, NOW), "active");
});

test("ban end dates must be in the future and at most a year away", () => {
  assert.equal(banEndDate(new Date(NOW + 24 * HOUR).toISOString(), NOW).getTime(), NOW + 24 * HOUR);
  for (const value of [new Date(NOW - HOUR).toISOString(), new Date(NOW + 30 * 1000).toISOString(), new Date(NOW + 400 * 24 * HOUR).toISOString(), "soon", 5]) {
    assert.throws(() => banEndDate(value, NOW), error => error.status === 400, String(value));
  }
});

test("banned users show their end date; expired bans show no stale details", () => {
  const profile = { email: "p@ump.ac.za", role: "student", accountStatus: "suspended", suspendedReason: "Abuse", suspendedUntil: new Date(NOW + HOUR) };
  const active = summarizeUser("u1", null, profile, NOW);
  assert.equal(active.status, "banned");
  assert.equal(active.suspendedUntil, new Date(NOW + HOUR).toISOString());
  const expired = summarizeUser("u1", null, profile, NOW + 2 * HOUR);
  assert.equal(expired.status, "active");
  assert.equal(expired.suspendedReason, null);
  assert.equal(expired.suspendedUntil, null);
});

test("password reset posts Firebase's PASSWORD_RESET request with the app as referer", async () => {
  let request;
  await sendPasswordResetEmail("p@ump.ac.za", {
    apiKey: "key-123",
    appUrl: "https://app.example/",
    fetchImpl: async (url, options) => { request = { url, options }; return { ok: true }; },
  });
  assert.match(request.url, /accounts:sendOobCode\?key=key-123$/);
  assert.equal(request.options.headers.referer, "https://app.example/");
  assert.deepEqual(JSON.parse(request.options.body), { requestType: "PASSWORD_RESET", email: "p@ump.ac.za" });
});

test("password reset maps Firebase errors to clear messages", async () => {
  const failing = message => async () => ({ ok: false, status: 400, json: async () => ({ error: { message } }) });
  await assert.rejects(
    sendPasswordResetEmail("p@ump.ac.za", { apiKey: "k", fetchImpl: failing("USER_DISABLED") }),
    error => error.status === 409 && /Reactivate/.test(error.message),
  );
  await assert.rejects(
    sendPasswordResetEmail("p@ump.ac.za", { apiKey: "k", fetchImpl: failing("API_KEY_HTTP_REFERRER_BLOCKED : x") }),
    error => error.status === 502 && /API key/.test(error.publicMessage),
  );
  await assert.rejects(sendPasswordResetEmail("p@ump.ac.za", { apiKey: "" }), error => error.status === 503);
});

const DELETE = Symbol("delete");

function applyUpdate(profile, fields) {
  const next = { ...profile };
  for (const [key, value] of Object.entries(fields)) {
    if (value === DELETE) delete next[key];
    else next[key] = value;
  }
  return next;
}

test("admins cannot target their own account", () => {
  assert.throws(() => targetUid("admin-1", "admin-1"), error => error.status === 403);
});

test("target ids must look like Firebase uids", () => {
  for (const value of ["", "a/b", "../users", "x".repeat(129), null, 42]) {
    assert.throws(() => targetUid(value, "admin-1"), error => error.status === 400);
  }
  assert.equal(targetUid("Ab9_-z", "admin-1"), "Ab9_-z");
});

test("only supported roles can be assigned", () => {
  for (const role of ["student", "staff", "responder", "admin"]) assert.equal(assignableRole(role), role);
  for (const role of ["security", "medical", "Admin", "", undefined]) {
    assert.throws(() => assignableRole(role), error => error.status === 400);
  }
});

test("every assignable role yields exactly one portal, even from an approved request", () => {
  const approvedResponder = {
    role: "responder",
    roles: ["responder"],
    requestedRole: "responder",
    roleRequestStatus: "approved",
  };
  for (const role of ["student", "staff", "responder", "admin"]) {
    const updated = applyUpdate(approvedResponder, roleChangeFields(role, "admin-1", "now", DELETE));
    assert.deepEqual([...roleSet(updated)], [role], `role ${role}`);
    assert.equal("requestedRole" in updated, false);
  }
});

test("a role change clears a pending request so the user is not left without access", () => {
  const pending = { role: "student", requestedRole: "admin", roleRequestStatus: "pending" };
  assert.deepEqual([...roleSet(pending)], []);
  const updated = applyUpdate(pending, roleChangeFields("staff", "admin-1", "now", DELETE));
  assert.deepEqual([...roleSet(updated)], ["staff"]);
});

test("legacy security and medical profiles count as responders", () => {
  assert.equal(isResponderProfile({ role: "security" }), true);
  assert.equal(isResponderProfile({ role: "student", roles: ["medical"] }), true);
  assert.equal(isResponderProfile({ role: "staff" }), false);
});

test("deletion requires the exact email, ignoring case and surrounding spaces", () => {
  assert.equal(deletionConfirmed(" Person@UMP.ac.za ", "person@ump.ac.za"), true);
  assert.equal(deletionConfirmed("person@ump.ac.z", "person@ump.ac.za"), false);
  assert.equal(deletionConfirmed("", ""), false);
  assert.equal(deletionConfirmed(undefined, "person@ump.ac.za"), false);
});

test("suspension reasons are optional and bounded", () => {
  assert.equal(suspensionReason(undefined), null);
  assert.equal(suspensionReason("   "), null);
  assert.equal(suspensionReason(" Lost device "), "Lost device");
  assert.throws(() => suspensionReason("x".repeat(301)), error => error.status === 400);
  assert.throws(() => suspensionReason(5), error => error.status === 400);
});

test("user summaries merge Auth and profile data and flag suspension from either side", () => {
  const authRecord = {
    email: "auth@ump.ac.za",
    displayName: "Auth Name",
    disabled: false,
    emailVerified: true,
    metadata: { creationTime: "Mon, 02 Nov 2026 08:00:00 GMT", lastSignInTime: "Sun, 08 Nov 2026 10:30:00 GMT" },
  };
  const profile = { email: "person@ump.ac.za", fullName: "Person", role: "responder" };
  const summary = summarizeUser("u1", authRecord, profile);
  assert.equal(summary.email, "person@ump.ac.za");
  assert.equal(summary.portal, "responder");
  assert.equal(summary.specialization, null);
  assert.equal(summarizeUser("u1", authRecord, { ...profile, specialization: "nurse" }).specialization, "nurse");
  assert.equal(summarizeUser("u1", authRecord, { ...profile, role: "student", specialization: "nurse" }).specialization, null);
  assert.equal(summary.status, "active");
  assert.equal(summary.lastSignInAt, "2026-11-08T10:30:00.000Z");
  assert.equal(summary.createdAt, "2026-11-02T08:00:00.000Z");

  assert.equal(summarizeUser("u1", { ...authRecord, disabled: true }, profile).status, "suspended");
  assert.equal(summarizeUser("u1", authRecord, { ...profile, accountStatus: "suspended" }).status, "suspended");
});

test("accounts missing one side are still listed", () => {
  const authOnly = summarizeUser("u2", { email: "new@ump.ac.za", emailVerified: false, metadata: {} }, null);
  assert.equal(authOnly.hasProfile, false);
  assert.equal(authOnly.portal, null);
  assert.equal(authOnly.emailVerified, false);

  const profileOnly = summarizeUser("u3", null, { email: "left@ump.ac.za", fullName: "Left Over", role: "student" });
  assert.equal(profileOnly.hasAuthAccount, false);
  assert.equal(profileOnly.emailVerified, null);
});

test("audit entries record the actor and a snapshot of the target", () => {
  const entry = auditEntry(
    { uid: "admin-1", name: "Admin One" },
    "USER_DELETED",
    { uid: "u1", email: "person@ump.ac.za", name: "Person" },
    { role: "student" },
    "now",
  );
  assert.deepEqual(entry, {
    action: "USER_DELETED",
    actorUid: "admin-1",
    actorName: "Admin One",
    targetUid: "u1",
    targetEmail: "person@ump.ac.za",
    targetName: "Person",
    details: { role: "student" },
    createdAt: "now",
  });
});
