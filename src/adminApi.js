import { apiRequest } from "./incidentApi.js";

function requireAdmin(user) {
  if (!user || user.role !== "admin") throw new Error("Admin access is required.");
}

function userPath(uid, suffix = "") {
  return `/admin/users/${encodeURIComponent(uid)}${suffix}`;
}

export async function listUsers(user) {
  requireAdmin(user);
  return apiRequest(user, "/admin/users");
}

export async function changeUserRole(user, uid, role) {
  requireAdmin(user);
  return apiRequest(user, userPath(uid, "/role"), { method: "PATCH", body: JSON.stringify({ role }) });
}

export async function setResponderSpecialization(user, uid, specialization) {
  requireAdmin(user);
  return apiRequest(user, userPath(uid, "/specialization"), { method: "PATCH", body: JSON.stringify({ specialization }) });
}

// Without `until` the account is disabled indefinitely; with an ISO end date it is banned temporarily.
export async function suspendUser(user, uid, reason, until = null) {
  requireAdmin(user);
  return apiRequest(user, userPath(uid, "/suspend"), { method: "POST", body: JSON.stringify({ reason: reason || null, until }) });
}

export async function sendUserPasswordReset(user, uid, signOutEverywhere) {
  requireAdmin(user);
  return apiRequest(user, userPath(uid, "/password-reset"), { method: "POST", body: JSON.stringify({ signOutEverywhere: Boolean(signOutEverywhere) }) });
}

export async function getIncidentReporter(user, incidentId) {
  requireAdmin(user);
  const payload = await apiRequest(user, `/incidents/${encodeURIComponent(incidentId)}/reporter`);
  return payload.reporter;
}

export async function reactivateUser(user, uid) {
  requireAdmin(user);
  return apiRequest(user, userPath(uid, "/reactivate"), { method: "POST", body: JSON.stringify({}) });
}

export async function deleteUser(user, uid, confirmEmail) {
  requireAdmin(user);
  return apiRequest(user, userPath(uid), { method: "DELETE", body: JSON.stringify({ confirmEmail }) });
}

export async function listAuditLog(user, limit = 200) {
  requireAdmin(user);
  const payload = await apiRequest(user, `/admin/audit-log?limit=${encodeURIComponent(limit)}`);
  return payload.entries || [];
}
