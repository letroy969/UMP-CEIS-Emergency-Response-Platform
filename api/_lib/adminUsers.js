import { isSuspendedProfile, roleSet } from "./auth.js";
import { fail } from "./validation.js";

// Roles an administrator can assign from the Admin Portal. Legacy "security" and
// "medical" profiles keep working (they map to the responder portal) but new
// assignments use the single "responder" role.
export const ASSIGNABLE_ROLES = Object.freeze(["student", "staff", "responder", "admin"]);
export const RESPONDER_ROLE_NAMES = Object.freeze(["responder", "security", "medical"]);
export const ACTIVE_INCIDENT_EXCLUDED_STATUSES = Object.freeze(["RESOLVED", "CLOSED"]);

export function targetUid(value, actorUid) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) fail("Choose a valid user.");
  if (value === actorUid) fail("You cannot change your own account from the Admin Portal. Ask another administrator.", 403);
  return value;
}

export function assignableRole(value) {
  if (!ASSIGNABLE_ROLES.includes(value)) fail(`Choose one of: ${ASSIGNABLE_ROLES.join(", ")}.`);
  return value;
}

export function isResponderProfile(profile = {}) {
  const roles = [profile.role, ...(Array.isArray(profile.roles) ? profile.roles : [])].flat();
  return roles.some(role => RESPONDER_ROLE_NAMES.includes(role));
}

export { isSuspendedProfile };

export const MAX_BAN_DAYS = 365;

export function banEndDate(value, nowMs = Date.now()) {
  if (typeof value !== "string") fail("Choose when the ban ends.");
  const until = new Date(value);
  if (Number.isNaN(until.getTime())) fail("Choose a valid ban end date.");
  if (until.getTime() <= nowMs + 60 * 1000) fail("A temporary ban must end in the future.");
  if (until.getTime() > nowMs + MAX_BAN_DAYS * 24 * 60 * 60 * 1000) {
    fail(`A temporary ban can last at most ${MAX_BAN_DAYS} days. Disable the account instead.`);
  }
  return until;
}

export function accountStatus(authRecord, profile, nowMs = Date.now()) {
  if (authRecord?.disabled) return "suspended";
  if (!isSuspendedProfile(profile, nowMs)) return "active";
  return profile.suspendedUntil ? "banned" : "suspended";
}

// Fields written when an admin sets a role. Pending request fields are removed:
// roleSet() rejects a profile whose requestedRole no longer matches its role,
// which would otherwise lock the user out of every portal.
export function roleChangeFields(role, actorUid, now, deleteField) {
  return {
    role,
    roles: [role],
    requestedRole: deleteField,
    roleRequestStatus: deleteField,
    roleRequestedAt: deleteField,
    roleChangedAt: now,
    roleChangedBy: actorUid,
  };
}

export function suspensionReason(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") fail("Suspension reason must be text.");
  const reason = value.trim();
  if (reason.length > 300) fail("Keep the suspension reason under 300 characters.");
  return reason || null;
}

export function deletionConfirmed(confirmEmail, email) {
  return typeof confirmEmail === "string"
    && typeof email === "string"
    && email.length > 0
    && confirmEmail.trim().toLowerCase() === email.trim().toLowerCase();
}

function isoFrom(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Merges a Firebase Auth record and a Firestore profile into the row the Admin
// Portal shows. Either side may be missing: an Auth account without a profile
// has never completed first sign-in; a profile without an Auth account is left
// over from a partial deletion and can be deleted again.
export function summarizeUser(uid, authRecord, profile, nowMs = Date.now()) {
  const rawRole = Array.isArray(profile?.role) ? profile.role[0] : profile?.role;
  const portal = profile ? [...roleSet(profile)][0] || null : null;
  const email = profile?.email || authRecord?.email || "";
  const status = accountStatus(authRecord, profile, nowMs);
  return {
    uid,
    email,
    name: profile?.fullName || authRecord?.displayName || email || "Unnamed account",
    role: typeof rawRole === "string" ? rawRole : null,
    portal,
    requestedRole: profile?.requestedRole || null,
    roleRequestStatus: profile?.roleRequestStatus || null,
    status,
    suspendedReason: status === "active" ? null : profile?.suspendedReason || null,
    suspendedAt: status === "active" ? null : isoFrom(profile?.suspendedAt),
    suspendedUntil: status === "banned" ? isoFrom(profile?.suspendedUntil) : null,
    emailVerified: authRecord ? authRecord.emailVerified === true : null,
    hasProfile: Boolean(profile),
    hasAuthAccount: Boolean(authRecord),
    createdAt: isoFrom(profile?.createdAt) || isoFrom(authRecord?.metadata?.creationTime),
    lastSignInAt: isoFrom(authRecord?.metadata?.lastSignInTime),
  };
}

const RESET_ERRORS = {
  EMAIL_NOT_FOUND: ["This account has no login to reset.", 404],
  USER_DISABLED: ["This account is disabled. Reactivate it before sending a password reset.", 409],
  TOO_MANY_ATTEMPTS_TRY_LATER: ["Firebase is limiting password reset emails for this account. Try again later.", 429],
  RESET_PASSWORD_EXCEED_LIMIT: ["Firebase is limiting password reset emails for this account. Try again later.", 429],
};

// The Admin SDK can only generate a reset link; it cannot send the email. The
// Identity Toolkit endpoint sends Firebase's standard reset email, the same one
// the sign-in page's "Forgot password" uses. The Referer header lets this work
// with a browser API key restricted to the app's own domain.
export async function sendPasswordResetEmail(email, { apiKey, appUrl, fetchImpl = fetch }) {
  if (!apiKey) {
    const error = new Error("Password reset email is not configured.");
    error.status = 503;
    error.publicMessage = "Password reset emails are unavailable: the API server has no Firebase web API key.";
    throw error;
  }
  const response = await fetchImpl(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(appUrl ? { referer: `${appUrl.replace(/\/$/, "")}/` } : {}) },
    body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
    signal: AbortSignal.timeout(10000),
  });
  if (response.ok) return;
  const payload = await response.json().catch(() => ({}));
  const code = String(payload?.error?.message || "").split(" ")[0];
  const [message, status] = RESET_ERRORS[code] || [null, 502];
  const error = new Error(message || `Firebase rejected the password reset request (${code || response.status}).`);
  error.status = status;
  if (!message) error.publicMessage = "The password reset email could not be sent. Check the server's Firebase API key restrictions.";
  throw error;
}

export function auditEntry(actor, action, target, details, now) {
  return {
    action,
    actorUid: actor.uid,
    actorName: actor.name || actor.email || actor.uid,
    targetUid: target?.uid ?? null,
    targetEmail: target?.email ?? null,
    targetName: target?.name ?? null,
    details: details ?? {},
    createdAt: now,
  };
}

export function auditEntryForClient(id, row) {
  return {
    id,
    action: row.action,
    actorUid: row.actorUid,
    actorName: row.actorName,
    targetUid: row.targetUid,
    targetEmail: row.targetEmail,
    targetName: row.targetName,
    details: row.details || {},
    createdAt: isoFrom(row.createdAt),
  };
}
