import express from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { anonymousSosIncidentId, anonymousSosInput, anonymousSosRateLimitKey } from "./_lib/anonymousSos.js";
import {
  ACTIVE_INCIDENT_EXCLUDED_STATUSES,
  assignableRole,
  auditEntry,
  banEndDate,
  sendPasswordResetEmail,
  auditEntryForClient,
  deletionConfirmed,
  isResponderProfile,
  isSuspendedProfile,
  roleChangeFields,
  summarizeUser,
  suspensionReason,
  targetUid as adminTargetUid,
} from "./_lib/adminUsers.js";
import { authenticate, enforceRateLimit, hasRole, isResponder, requireRole } from "./_lib/auth.js";
import { getFirebaseServices } from "./_lib/firebaseAdmin.js";
import {
  EVIDENCE_TYPES,
  evidenceObjectKey,
  getR2Storage,
  parseEvidenceObjectKey,
  signEvidenceUpload,
} from "./_lib/r2Storage.js";
import { handleChat } from "./chat.js";
import { normalizeMedicalProfile } from "../src/medical/medicalProfile.js";
import { notifyUsers, usersWithRole } from "./_lib/notifications.js";
import { coordinates, fail, incidentInput, STATUSES, text } from "./_lib/validation.js";
import {
  canHandleIncident,
  isSpecialization,
  requiredFieldsText,
  responderSpecialization,
  specializationLabel,
} from "../src/responder/specializations.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "32kb", strict: true }));
app.use((req, res, next) => {
  res.set("x-content-type-options", "nosniff");
  res.set("referrer-policy", "no-referrer");
  const configuredOrigin = process.env.APP_URL;
  const origin = req.get("origin");
  if (origin && configuredOrigin && origin === configuredOrigin) {
    res.set("access-control-allow-origin", origin);
    res.set("vary", "Origin");
    res.set("access-control-allow-headers", "authorization, content-type, x-firebase-appcheck");
    res.set("access-control-allow-methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(origin && origin === configuredOrigin ? 204 : 403);
  next();
});
app.use((req, _res, next) => {
  const rewrittenPath = typeof req.query.path === "string" ? req.query.path : null;
  if (rewrittenPath?.startsWith("/")) {
    req.url = rewrittenPath;
  } else if (req.path === "/api/index") {
    req.url = "/";
  } else if (req.path.startsWith("/api/")) {
    req.url = req.url.replace(/^\/api/, "");
  }
  next();
});

function route(method, path, ...handlers) {
  app[method]([path, `/api${path}`, `/api/index${path}`], ...handlers);
}

function incidentForClient(id, row) {
  const date = value => value?.toDate?.().toISOString?.() || null;
  const createdAt = date(row.createdAt);
  return {
    id,
    reference: row.reference,
    reportedBy: row.reportedBy,
    responderUid: row.responderUid ?? null,
    type: row.type,
    priority: row.priority,
    building: row.building,
    buildingName: row.buildingName || null,
    loc: row.buildingName || (row.latitude != null
      ? `GPS location · ${row.latitude.toFixed(5)}, ${row.longitude.toFixed(5)}`
      : `Building ${row.building}`),
    desc: row.description,
    attachments: Array.isArray(row.attachments) ? row.attachments.map(item => ({
      id: item.id,
      name: item.name,
      kind: item.kind,
      contentType: item.contentType,
      size: item.size,
      createdAt: date(item.createdAt),
    })) : [],
    status: row.status,
    responder: row.responder || "Pending assignment",
    lat: row.latitude ?? null,
    lng: row.longitude ?? null,
    accuracy: row.accuracyMeters ?? null,
    locationCapturedAt: date(row.locationCapturedAt),
    locationSource: row.locationSource ?? null,
    campusVerified: row.campusVerified ?? null,
    reporter: row.isAnonymous === true || !row.reportedBy ? "Anonymous" : row.reporterName || "Campus user",
    isAnonymous: row.isAnonymous === true || !row.reportedBy,
    isSOS: row.isSOS === true,
    createdAt,
    updatedAt: date(row.updatedAt),
    dispatchedAt: date(row.dispatchedAt),
    resolvedAt: date(row.resolvedAt),
    time: createdAt ? new Date(createdAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }) : "",
  };
}

const RESPONDER_PRESENCE_FRESH_MS = 120000;

const INCIDENT_TYPE_LABELS = { medical: "Medical emergency", fire: "Fire", security: "Security incident", hazard: "Hazard", infrastructure: "Infrastructure issue", wellbeing: "Wellbeing concern", other: "Incident" };
const STATUS_FOR_REPORTER = {
  NEW: "received",
  ACKNOWLEDGED: "acknowledged — a responder is on the way",
  TEAM_DISPATCHED: "assigned to a responder",
  ON_SCENE: "being handled — the responder is on scene",
  RESOLVED: "resolved",
  CLOSED: "closed",
};

function incidentTypeLabel(type) {
  return INCIDENT_TYPE_LABELS[type] || "Incident";
}

function incidentWhere(row) {
  if (row.buildingName) return row.buildingName;
  if (row.latitude != null) return "the reported GPS location";
  return row.building && row.building !== "0" ? `Building ${row.building}` : "the reported location";
}

// Notifications follow an action that already succeeded, so a delivery problem
// is logged rather than turned into an error response.
async function safeNotify(services, payload, context) {
  if (!payload.userIds?.length) return null;
  try {
    return await notifyUsers(services, payload);
  } catch (error) {
    console.error("Notification delivery failed", context, payload.title, error);
    return null;
  }
}

function validAssignmentStatus(status) {
  if (!STATUSES.has(status)) fail("Choose a valid incident status.");
}

function distanceKm(aLat, aLng, bLat, bLng) {
  const radians = value => value * Math.PI / 180;
  const dLat = radians(bLat - aLat);
  const dLng = radians(bLng - aLng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function autoAssignNearest(services, incident) {
  if (incident.latitude == null) return null;
  const maxDistance = Number(process.env.SOS_MAX_DISPATCH_KM) || 15;
  const presence = await services.db.collection("responderPresence").where("available", "==", true).limit(200).get();
  const now = Date.now();
  const candidates = presence.docs.map(doc => ({
    ref: doc.ref,
    uid: doc.id,
    data: doc.data(),
    distance: distanceKm(incident.latitude, incident.longitude, doc.get("latitude"), doc.get("longitude")),
  })).filter(candidate => Number.isFinite(candidate.distance)
    && candidate.distance <= maxDistance
    && now - (candidate.data.updatedAt?.toMillis?.() ?? 0) <= 120000)
    .sort((a, b) => a.distance - b.distance);
  if (!candidates.length) return null;

  // Only responders whose field can handle this incident are dispatched.
  const profiles = await services.db.getAll(...candidates.map(candidate => services.db.collection("users").doc(candidate.uid)));
  const profileByUid = new Map(profiles.map(profile => [profile.id, profile]));

  for (const candidate of candidates) {
    const profile = profileByUid.get(candidate.uid);
    if (!profile?.exists || isSuspendedProfile(profile.data())
      || !canHandleIncident(responderSpecialization(profile.data()), incident)) continue;
    const claimed = await services.db.runTransaction(async transaction => {
      const snapshot = await transaction.get(candidate.ref);
      if (!snapshot.exists || snapshot.get("available") !== true
        || now - (snapshot.get("updatedAt")?.toMillis?.() ?? 0) > 120000) return false;
      transaction.update(candidate.ref, { available: false, assignmentReservedAt: FieldValue.serverTimestamp() });
      return true;
    });
    if (!claimed) continue;
    return { uid: candidate.uid, name: profile.get("fullName") || profile.get("email") || "Responder", distanceKm: candidate.distance };
  }
  return null;
}

async function createIncidentRecord(services, user, input, {
  sos = false,
  anonymous = false,
  idempotencyKey = null,
} = {}) {
  const incidentRef = idempotencyKey
    ? services.db.collection("incidents").doc(anonymousSosIncidentId(idempotencyKey))
    : services.db.collection("incidents").doc();
  const now = Timestamp.now();
  const data = {
    reference: `INC-${createHash("sha256").update(`${user.uid || "anonymous"}:${now.toMillis()}:${incidentRef.id}`).digest("hex").slice(0, 10).toUpperCase()}`,
    reportedBy: anonymous ? null : user.uid,
    responderUid: null,
    dispatchedByUid: null,
    type: input.type,
    priority: input.priority,
    building: input.building,
    buildingName: input.buildingName,
    description: input.description,
    attachments: [],
    status: "NEW",
    responder: null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    accuracyMeters: input.accuracyMeters ?? null,
    locationCapturedAt: input.locationCapturedAt || null,
    locationSource: input.locationSource ?? null,
    campusVerified: input.campusVerified ?? null,
    reporterName: anonymous ? "Anonymous visitor" : user.name,
    isSOS: sos,
    isAnonymous: anonymous,
    createdAt: now,
    updatedAt: now,
    dispatchedAt: null,
    resolvedAt: null,
  };
  const duplicate = await services.db.runTransaction(async transaction => {
    if (idempotencyKey) {
      const existing = await transaction.get(incidentRef);
      if (existing.exists) {
        Object.assign(data, existing.data());
        return true;
      }
    }
    transaction.create(incidentRef, data);
    transaction.create(incidentRef.collection("events").doc(), {
      event: sos ? "SOS_CREATED" : "INCIDENT_CREATED",
      actorUid: anonymous ? "anonymous" : user.uid,
      actorType: anonymous ? "anonymous" : "user",
      status: "NEW",
      createdAt: now,
    });
    return false;
  });

  if (duplicate) {
    const assignment = data.responderUid
      ? { uid: data.responderUid, name: data.responder || "Responder" }
      : null;
    return { ref: incidentRef, data, assignment, duplicate: true };
  }

  let assignment = null;
  if (sos) {
    // The SOS is already saved; a dispatch failure must not lose it. Admins and
    // responders are still alerted and can claim it from their portals.
    try {
      assignment = await autoAssignNearest(services, data);
    } catch (error) {
      console.error("SOS auto-dispatch failed", incidentRef.id, error);
    }
  }
  if (assignment) {
    try {
      await services.db.runTransaction(async transaction => {
        const fresh = await transaction.get(incidentRef);
        if (!fresh.exists || fresh.get("status") !== "NEW") return;
        const assignedAt = Timestamp.now();
        transaction.update(incidentRef, {
          responderUid: assignment.uid,
          responder: assignment.name,
          dispatchedByUid: "system",
          status: "TEAM_DISPATCHED",
          dispatchedAt: assignedAt,
          updatedAt: assignedAt,
        });
        transaction.create(incidentRef.collection("events").doc(), {
          event: "RESPONDER_AUTO_DISPATCHED",
          actorUid: "system",
          responderUid: assignment.uid,
          distanceKm: assignment.distanceKm,
          status: "TEAM_DISPATCHED",
          createdAt: assignedAt,
        });
      });
      Object.assign(data, {
        responderUid: assignment.uid,
        responder: assignment.name,
        status: "TEAM_DISPATCHED",
        dispatchedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("SOS assignment could not be recorded", incidentRef.id, error);
      // Release the responder reserved by autoAssignNearest so they stay dispatchable.
      await services.db.collection("responderPresence").doc(assignment.uid)
        .update({ available: true, assignmentReservedAt: FieldValue.delete() })
        .catch(() => {});
      assignment = null;
    }
  }
  return { ref: incidentRef, data, assignment, duplicate: false };
}

async function requireAnonymousAppCheck(req, _res, next) {
  try {
    const token = req.get("x-firebase-appcheck");
    if (!token) {
      const error = new Error("An App Check token is required for anonymous SOS.");
      error.status = 403;
      throw error;
    }
    const expectedAppId = process.env.FIREBASE_APP_CHECK_APP_ID || process.env.VITE_FIREBASE_APP_ID;
    if (!expectedAppId) {
      const error = new Error("Firebase App Check app id is not configured.");
      error.status = 503;
      error.publicMessage = "Anonymous SOS is unavailable until FIREBASE_APP_CHECK_APP_ID is configured on the API server.";
      throw error;
    }
    const services = getFirebaseServices();
    let verified;
    try {
      verified = await services.appCheck.verifyToken(token);
    } catch {
      const error = new Error("The App Check token could not be verified.");
      error.status = 403;
      throw error;
    }
    if (verified.appId !== expectedAppId) {
      const error = new Error("This app is not authorized to submit anonymous SOS requests.");
      error.status = 403;
      throw error;
    }
    next();
  } catch (error) {
    next(error);
  }
}

app.get("/health", (_req, res) => res.json({ ok: true, service: "ump-ceis-api" }));

route("get", "/incidents", authenticate, async (req, res) => {
  const { db } = getFirebaseServices();
  let query = db.collection("incidents").orderBy("createdAt", "desc").limit(500);
  if (hasRole(req.user, "admin")) {
    if (req.query.mine === "true") query = db.collection("incidents").where("reportedBy", "==", req.user.uid).orderBy("createdAt", "desc").limit(500);
  } else if (isResponder(req.user)) {
    query = db.collection("incidents").where("responderUid", "==", req.user.uid).orderBy("createdAt", "desc").limit(500);
  } else {
    query = db.collection("incidents").where("reportedBy", "==", req.user.uid).orderBy("createdAt", "desc").limit(500);
  }
  const snapshot = await query.get();
  res.json({ incidents: snapshot.docs.map(item => incidentForClient(item.id, item.data())) });
});

route("get", "/responders", authenticate, async (req, res) => {
  requireRole(req.user, ["admin"]);
  const services = getFirebaseServices();
  const ids = await usersWithRole(services, ["responder", "security", "medical"]);
  const roster = await Promise.all(ids.map(async uid => {
    const [profile, presence] = await Promise.all([
      services.db.collection("users").doc(uid).get(),
      services.db.collection("responderPresence").doc(uid).get(),
    ]);
    if (isSuspendedProfile(profile.data())) return null;
    const lastSeenMs = presence.get("updatedAt")?.toMillis?.() ?? null;
    // Older presence records only have `available`; treat that as on duty.
    const onDuty = typeof presence.get("onDuty") === "boolean" ? presence.get("onDuty") : presence.get("available") === true;
    return {
      uid,
      name: profile.get("fullName") || profile.get("email") || "Responder",
      specialization: responderSpecialization(profile.data()),
      // Same freshness window SOS auto-dispatch uses: a responder who went on duty
      // but whose app stopped reporting a location is not shown as available.
      available: onDuty && lastSeenMs != null && Date.now() - lastSeenMs <= RESPONDER_PRESENCE_FRESH_MS,
      onDuty,
      lastSeenAt: lastSeenMs == null ? null : new Date(lastSeenMs).toISOString(),
    };
  }));
  const responders = roster.filter(Boolean);
  responders.sort((a, b) => a.name.localeCompare(b.name));
  res.json({ responders });
});

route("get", "/access-requests", authenticate, async (req, res) => {
  requireRole(req.user, ["admin"]);
  const snapshot = await getFirebaseServices().db.collection("users")
    .where("requestedRole", "in", ["responder", "admin"])
    .where("roleRequestStatus", "==", "pending")
    .limit(200)
    .get();
  const requests = snapshot.docs.map(profile => ({
    uid: profile.id,
    name: profile.get("fullName") || "Name not provided",
    email: profile.get("email") || "",
    requestedRole: profile.get("requestedRole"),
    requestedAt: profile.get("roleRequestedAt")?.toDate?.().toISOString?.() || null,
  }));
  requests.sort((a, b) => (a.requestedAt || "").localeCompare(b.requestedAt || ""));
  res.json({ requests });
});

route("patch", "/access-requests/:uid", authenticate, async (req, res) => {
  requireRole(req.user, ["admin"]);
  const targetUid = text(req.params.uid, "User id", { max: 128 });
  if (!/^[A-Za-z0-9_-]+$/.test(targetUid) || targetUid === req.user.uid) {
    fail("Choose a valid access request.");
  }
  const action = req.body?.action;
  if (!["approve", "reject"].includes(action)) fail("Choose approve or reject.");

  const services = getFirebaseServices();
  const profileRef = services.db.collection("users").doc(targetUid);
  let reviewedRole;
  await services.db.runTransaction(async transaction => {
    const profile = await transaction.get(profileRef);
    const requestedRole = profile.exists ? profile.get("requestedRole") : null;
    if (!profile.exists
      || !["responder", "admin"].includes(requestedRole)
      || profile.get("roleRequestStatus") !== "pending"
      || profile.get("role") !== "student") {
      fail("This access request is no longer pending.", 409);
    }
    reviewedRole = requestedRole;
    const now = Timestamp.now();
    transaction.update(profileRef, {
      ...(action === "approve" ? { role: requestedRole, roles: [requestedRole] } : {}),
      roleRequestStatus: action === "approve" ? "approved" : "rejected",
      roleRequestReviewedAt: now,
      roleRequestReviewedBy: req.user.uid,
    });
    transaction.create(services.db.collection("adminAuditLog").doc(), auditEntry(
      req.user,
      action === "approve" ? "ACCESS_REQUEST_APPROVED" : "ACCESS_REQUEST_REJECTED",
      { uid: targetUid, email: profile.get("email") || null, name: profile.get("fullName") || null },
      { requestedRole },
      now,
    ));
  });
  res.json({ uid: targetUid, requestedRole: reviewedRole, status: action === "approve" ? "approved" : "rejected" });
});

// Audit writes that follow an already-completed action must not turn a success
// into an error response, so failures are logged instead of thrown.
async function writeAudit(services, actor, action, target, details) {
  try {
    await services.db.collection("adminAuditLog").add(auditEntry(actor, action, target, details, Timestamp.now()));
  } catch (error) {
    console.error("Admin audit entry could not be written", action, target?.uid, error);
  }
}

async function loadAdminTarget(services, uid) {
  const [authRecord, profileSnapshot] = await Promise.all([
    services.auth.getUser(uid).catch(error => {
      if (error.code === "auth/user-not-found") return null;
      throw error;
    }),
    services.db.collection("users").doc(uid).get(),
  ]);
  const profile = profileSnapshot.exists ? profileSnapshot.data() : null;
  if (!authRecord && !profile) fail("User not found.", 404);
  return { authRecord, profile, summary: summarizeUser(uid, authRecord, profile) };
}

// Removes a user from auto-dispatch and stops push alerts reaching their devices.
async function detachResponderAndDevices(services, uid) {
  await services.db.collection("responderPresence").doc(uid).delete();
  await services.db.recursiveDelete(services.db.collection("users").doc(uid).collection("pushTokens"));
}

async function activeAssignmentCount(services, uid) {
  const assigned = await services.db.collection("incidents").where("responderUid", "==", uid).limit(500).get();
  return assigned.docs.filter(doc => !ACTIVE_INCIDENT_EXCLUDED_STATUSES.includes(doc.get("status"))).length;
}

route("get", "/admin/users", authenticate, async (req, res) => {
  requireRole(req.user, ["admin"]);
  const services = getFirebaseServices();
  const MAX_AUTH_PAGES = 5;
  const authUsers = new Map();
  let pageToken;
  let pages = 0;
  do {
    const page = await services.auth.listUsers(1000, pageToken);
    page.users.forEach(record => authUsers.set(record.uid, record));
    pageToken = page.pageToken;
    pages += 1;
  } while (pageToken && pages < MAX_AUTH_PAGES);
  const profiles = await services.db.collection("users").limit(5000).get();
  const profileMap = new Map(profiles.docs.map(doc => [doc.id, doc.data()]));
  const uids = new Set([...authUsers.keys(), ...profileMap.keys()]);
  const users = [...uids].map(uid => summarizeUser(uid, authUsers.get(uid) || null, profileMap.get(uid) || null));
  users.sort((a, b) => a.name.localeCompare(b.name));
  res.set("cache-control", "no-store").json({
    users,
    capped: Boolean(pageToken) || profiles.size === 5000,
  });
});

route("patch", "/admin/users/:uid/role", authenticate, async (req, res) => {
  requireRole(req.user, ["admin"]);
  const services = getFirebaseServices();
  await enforceRateLimit(services.db, `admin_action_${req.user.uid}`, 30);
  const uid = adminTargetUid(req.params.uid, req.user.uid);
  const role = assignableRole(req.body?.role);
  const profileRef = services.db.collection("users").doc(uid);
  // Accounts that verified their email but never signed in have no profile yet;
  // the admin can still grant them a role, which creates the profile here.
  const authRecord = await services.auth.getUser(uid).catch(error => {
    if (error.code === "auth/user-not-found") return null;
    throw error;
  });
  let previousRole = null;
  let wasResponder = false;
  let target = null;
  let createdProfile = false;
  await services.db.runTransaction(async transaction => {
    const snapshot = await transaction.get(profileRef);
    if (!snapshot.exists) {
      if (!authRecord) fail("User not found.", 404);
      if (!authRecord.emailVerified) fail("This person has not verified their email address yet. Ask them to open the verification email first.", 409);
      const now = Timestamp.now();
      const email = authRecord.email || "";
      const fallbackName = email.split("@")[0];
      const fullName = [authRecord.displayName?.trim(), fallbackName]
        .find(name => name && name.length >= 2 && name.length <= 100) || "CEIS User";
      target = { uid, email: email || null, name: fullName };
      transaction.create(profileRef, {
        uid,
        email,
        fullName,
        role,
        roles: [role],
        createdAt: now,
        createdByAdmin: req.user.uid,
        roleChangedAt: now,
        roleChangedBy: req.user.uid,
      });
      transaction.create(services.db.collection("adminAuditLog").doc(), auditEntry(
        req.user, "USER_ROLE_CHANGED", target, { from: null, to: role, profileCreated: true }, now,
      ));
      createdProfile = true;
      return;
    }
    const profile = snapshot.data();
    previousRole = Array.isArray(profile.role) ? profile.role[0] : profile.role ?? null;
    wasResponder = isResponderProfile(profile);
    target = { uid, email: profile.email || null, name: profile.fullName || null };
    const now = Timestamp.now();
    transaction.update(profileRef, roleChangeFields(role, req.user.uid, now, FieldValue.delete()));
    transaction.create(services.db.collection("adminAuditLog").doc(), auditEntry(
      req.user, "USER_ROLE_CHANGED", target, { from: previousRole, to: role }, now,
    ));
  });
  // A former responder must not stay eligible for SOS auto-dispatch.
  let activeAssignments = 0;
  if (wasResponder && role !== "responder") {
    await services.db.collection("responderPresence").doc(uid).delete();
    activeAssignments = await activeAssignmentCount(services, uid);
  }
  const { summary } = await loadAdminTarget(services, uid);
  res.json({ user: summary, previousRole, activeAssignments, createdProfile });
});

// Sets a responder's field (e.g. Medical, Security, Electrician). Dispatch only
// sends responders to incidents their field can handle.
route("patch", "/admin/users/:uid/specialization", authenticate, async (req, res) => {
  requireRole(req.user, ["admin"]);
  const services = getFirebaseServices();
  await enforceRateLimit(services.db, `admin_action_${req.user.uid}`, 30);
  const uid = adminTargetUid(req.params.uid, req.user.uid);
  const specialization = req.body?.specialization;
  if (!isSpecialization(specialization)) fail("Choose a valid responder field.");
  const profileRef = services.db.collection("users").doc(uid);
  let previous = null;
  await services.db.runTransaction(async transaction => {
    const snapshot = await transaction.get(profileRef);
    if (!snapshot.exists) fail("User not found.", 404);
    const profile = snapshot.data();
    if (!isResponderProfile(profile)) fail("Only responder accounts have a field. Give this person the responder role first.", 409);
    previous = responderSpecialization(profile);
    const now = Timestamp.now();
    transaction.update(profileRef, { specialization, specializationChangedAt: now, specializationChangedBy: req.user.uid });
    transaction.create(services.db.collection("adminAuditLog").doc(), auditEntry(
      req.user,
      "RESPONDER_FIELD_CHANGED",
      { uid, email: profile.email || null, name: profile.fullName || null },
      { from: previous, to: specialization },
      now,
    ));
  });
  res.json({ uid, specialization, previous });
});

route("post", "/admin/users/:uid/suspend", authenticate, async (req, res) => {
  requireRole(req.user, ["admin"]);
  const services = getFirebaseServices();
  await enforceRateLimit(services.db, `admin_action_${req.user.uid}`, 30);
  const uid = adminTargetUid(req.params.uid, req.user.uid);
  const reason = suspensionReason(req.body?.reason);
  // With an end date this is a temporary ban; without one the account is disabled.
  const until = req.body?.until == null ? null : banEndDate(req.body.until);
  const { authRecord, profile, summary } = await loadAdminTarget(services, uid);
  if (until && !profile) fail("This account has never signed in, so it cannot be banned temporarily. Disable it instead.", 409);

  if (until) {
    // A ban is enforced through the profile (API, Firestore rules and sign-in
    // check) so it lifts itself at the end date. Sign-in stays enabled in
    // Firebase Auth; revoking tokens ends every current session now.
    await services.db.collection("users").doc(uid).update({
      accountStatus: "suspended",
      suspendedAt: Timestamp.now(),
      suspendedBy: req.user.uid,
      suspendedReason: reason,
      suspendedUntil: Timestamp.fromDate(until),
    });
    if (authRecord) {
      // Converting a disabled account to a ban must re-enable sign-in, or the ban would never lift.
      if (authRecord.disabled) await services.auth.updateUser(uid, { disabled: false });
      await services.auth.revokeRefreshTokens(uid);
    }
  } else {
    // Disable sign-in first: it is the step that actually locks the account out.
    if (authRecord) {
      await services.auth.updateUser(uid, { disabled: true });
      await services.auth.revokeRefreshTokens(uid);
    }
    if (profile) {
      await services.db.collection("users").doc(uid).update({
        accountStatus: "suspended",
        suspendedAt: Timestamp.now(),
        suspendedBy: req.user.uid,
        suspendedReason: reason,
        suspendedUntil: FieldValue.delete(),
      });
    }
  }
  await detachResponderAndDevices(services, uid);
  const activeAssignments = await activeAssignmentCount(services, uid);
  await writeAudit(services, req.user, until ? "USER_TEMP_BANNED" : "USER_SUSPENDED", summary, {
    reason,
    activeAssignments,
    ...(until ? { until: until.toISOString() } : {}),
  });
  const refreshed = await loadAdminTarget(services, uid);
  res.json({ user: refreshed.summary, activeAssignments });
});

route("post", "/admin/users/:uid/reactivate", authenticate, async (req, res) => {
  requireRole(req.user, ["admin"]);
  const services = getFirebaseServices();
  await enforceRateLimit(services.db, `admin_action_${req.user.uid}`, 30);
  const uid = adminTargetUid(req.params.uid, req.user.uid);
  const { authRecord, profile, summary } = await loadAdminTarget(services, uid);
  if (authRecord) await services.auth.updateUser(uid, { disabled: false });
  if (profile) {
    await services.db.collection("users").doc(uid).update({
      accountStatus: "active",
      suspendedAt: FieldValue.delete(),
      suspendedBy: FieldValue.delete(),
      suspendedReason: FieldValue.delete(),
      suspendedUntil: FieldValue.delete(),
      reactivatedAt: Timestamp.now(),
      reactivatedBy: req.user.uid,
    });
  }
  await writeAudit(services, req.user, "USER_REACTIVATED", summary, {});
  const refreshed = await loadAdminTarget(services, uid);
  res.json({ user: refreshed.summary });
});

route("post", "/admin/users/:uid/password-reset", authenticate, async (req, res) => {
  requireRole(req.user, ["admin"]);
  const services = getFirebaseServices();
  await enforceRateLimit(services.db, `admin_password_reset_${req.user.uid}`, 10, 10 * 60 * 1000);
  const uid = adminTargetUid(req.params.uid, req.user.uid);
  const signOutEverywhere = req.body?.signOutEverywhere === true;
  const { authRecord, summary } = await loadAdminTarget(services, uid);
  if (!authRecord?.email) fail("This account has no login with an email address to reset.", 409);
  if (authRecord.disabled) fail("This account is disabled. Reactivate it before sending a password reset.", 409);
  await sendPasswordResetEmail(authRecord.email, {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    appUrl: process.env.APP_URL,
  });
  if (signOutEverywhere) await services.auth.revokeRefreshTokens(uid);
  await writeAudit(services, req.user, "PASSWORD_RESET_SENT", summary, { signOutEverywhere });
  res.json({ sent: true, email: authRecord.email, signedOut: signOutEverywhere });
});

route("delete", "/admin/users/:uid", authenticate, async (req, res) => {
  requireRole(req.user, ["admin"]);
  const services = getFirebaseServices();
  await enforceRateLimit(services.db, `admin_action_${req.user.uid}`, 30);
  const uid = adminTargetUid(req.params.uid, req.user.uid);
  const { authRecord, summary } = await loadAdminTarget(services, uid);
  if (!deletionConfirmed(req.body?.confirmEmail, summary.email)) {
    fail("Type the user's email address exactly to confirm deletion.");
  }
  const activeAssignments = await activeAssignmentCount(services, uid);
  if (activeAssignments > 0) {
    fail(`Reassign or close this responder's ${activeAssignments} active incident${activeAssignments === 1 ? "" : "s"} before deleting the account.`, 409);
  }

  // Every step tolerates data that is already gone, so a failed deletion can be retried.
  if (authRecord) {
    await services.auth.deleteUser(uid).catch(error => {
      if (error.code !== "auth/user-not-found") throw error;
    });
  }
  let deletedCheckins = 0;
  for (;;) {
    const checkins = await services.db.collection("safetyCheckins").where("userId", "==", uid).limit(400).get();
    if (checkins.empty) break;
    const batch = services.db.batch();
    checkins.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    deletedCheckins += checkins.size;
  }
  await services.db.collection("responderPresence").doc(uid).delete();
  await services.db.recursiveDelete(services.db.collection("users").doc(uid));
  const reported = await services.db.collection("incidents").where("reportedBy", "==", uid).count().get();
  await writeAudit(services, req.user, "USER_DELETED", summary, {
    role: summary.role,
    deletedCheckins,
    retainedIncidentReports: reported.data().count,
  });
  res.json({ deleted: true, uid, retainedIncidentReports: reported.data().count });
});

route("get", "/admin/audit-log", authenticate, async (req, res) => {
  requireRole(req.user, ["admin"]);
  const requested = Number.parseInt(req.query.limit, 10);
  const pageSize = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, 500) : 200;
  const snapshot = await getFirebaseServices().db.collection("adminAuditLog")
    .orderBy("createdAt", "desc")
    .limit(pageSize)
    .get();
  res.set("cache-control", "no-store").json({ entries: snapshot.docs.map(doc => auditEntryForClient(doc.id, doc.data())) });
});

route("post", "/incidents", authenticate, async (req, res) => {
  const services = getFirebaseServices();
  await enforceRateLimit(services.db, `incident_${req.user.uid}`, 15);
  const input = incidentInput(req.body);
  const created = await createIncidentRecord(services, req.user, input);
  // Tell the admin team about every new report (urgent for P1/P2). Awaited so the
  // serverless function is not frozen mid-send; failures never fail the report.
  try {
    const adminIds = (await usersWithRole(services, ["admin"])).filter(uid => uid !== req.user.uid);
    await safeNotify(services, {
      userIds: adminIds,
      title: `New ${created.data.priority} report · ${created.data.reference}`,
      body: `${incidentTypeLabel(created.data.type)} at ${incidentWhere(created.data)}, reported by ${created.data.reporterName}.`,
      data: { incidentId: created.ref.id, reference: created.data.reference, kind: "new-incident" },
      emergency: ["P1", "P2"].includes(created.data.priority),
    }, created.ref.id);
  } catch (error) {
    console.error("New incident admin lookup failed", created.ref.id, error);
  }
  res.status(201).json({ incident: incidentForClient(created.ref.id, created.data) });
});

// Who may see a reporter's emergency contacts and medical details: admins, the
// responder assigned to the active incident, and any responder for an open SOS
// still waiting to be accepted (the same SOS alerts responders can already read).
function canViewReporterEmergencyData(user, incident) {
  if (hasRole(user, "admin")) return true;
  if (!isResponder(user)) return false;
  const openSos = incident.isSOS === true && !incident.responderUid && incident.status === "NEW";
  return openSos || (incident.responderUid === user.uid && !["RESOLVED", "CLOSED"].includes(incident.status));
}

route("get", "/incidents/:id/medical", authenticate, async (req, res) => {
  const services = getFirebaseServices();
  const incidentId = text(req.params.id, "Incident id", { max: 150 });
  const incidentRef = services.db.collection("incidents").doc(incidentId);
  const snapshot = await incidentRef.get();
  if (!snapshot.exists) fail("Incident not found.", 404);
  const incident = snapshot.data();
  if (!canViewReporterEmergencyData(req.user, incident)) fail("You are not allowed to view medical details for this incident.", 403);
  if (typeof incident.reportedBy !== "string" || incident.isAnonymous === true) {
    res.set("cache-control", "no-store").json({ medical: null, reason: "anonymous" });
    return;
  }
  const record = await services.db.collection("users").doc(incident.reportedBy).collection("private").doc("medical").get();
  await incidentRef.collection("events").add({
    event: "MEDICAL_INFO_VIEWED",
    actorUid: req.user.uid,
    found: record.exists && record.get("consent") === true,
    createdAt: Timestamp.now(),
  });
  if (!record.exists || record.get("consent") !== true) {
    res.set("cache-control", "no-store").json({ medical: null, reason: "not-provided" });
    return;
  }
  let medical;
  try {
    // Re-validate on the way out so only known, bounded fields ever reach a responder.
    medical = normalizeMedicalProfile(record.data(), { requireConsent: true });
  } catch (error) {
    console.error("Stored medical profile failed validation", incident.reportedBy, error.message);
    res.set("cache-control", "no-store").json({ medical: null, reason: "unreadable" });
    return;
  }
  res.set("cache-control", "no-store").json({
    medical,
    updatedAt: record.get("updatedAt")?.toDate?.().toISOString?.() || null,
  });
});

route("get", "/incidents/:id/emergency-contacts", authenticate, async (req, res) => {
  const services = getFirebaseServices();
  const incidentId = text(req.params.id, "Incident id", { max: 150 });
  const incidentRef = services.db.collection("incidents").doc(incidentId);
  const snapshot = await incidentRef.get();
  if (!snapshot.exists) fail("Incident not found.", 404);
  const incident = snapshot.data();
  if (!canViewReporterEmergencyData(req.user, incident)) fail("You are not allowed to view contacts for this incident.", 403);
  if (typeof incident.reportedBy !== "string") {
    res.set("cache-control", "no-store").json({ contacts: [] });
    return;
  }

  const contacts = await services.db.collection("users").doc(incident.reportedBy)
    .collection("emergencyContacts").orderBy("order").limit(10).get();
  await incidentRef.collection("events").add({
    event: "EMERGENCY_CONTACTS_VIEWED",
    actorUid: req.user.uid,
    createdAt: Timestamp.now(),
  });
  res.set("cache-control", "no-store").json({
    contacts: contacts.docs.map(contact => ({
      name: contact.get("name"),
      relationship: contact.get("relationship"),
      phone: contact.get("phone"),
    })),
  });
});

// Admin view of the verified account behind a non-anonymous report. Every view is
// recorded on the incident's timeline, like emergency-contact views.
route("get", "/incidents/:id/reporter", authenticate, async (req, res) => {
  requireRole(req.user, ["admin"]);
  const services = getFirebaseServices();
  const incidentId = text(req.params.id, "Incident id", { max: 150 });
  const incidentRef = services.db.collection("incidents").doc(incidentId);
  const snapshot = await incidentRef.get();
  if (!snapshot.exists) fail("Incident not found.", 404);
  const reporterUid = snapshot.get("reportedBy");
  if (snapshot.get("isAnonymous") === true || typeof reporterUid !== "string") {
    fail("This report was submitted anonymously, so no profile is linked.", 404);
  }
  const [authRecord, profileSnapshot, reported] = await Promise.all([
    services.auth.getUser(reporterUid).catch(error => {
      if (error.code === "auth/user-not-found") return null;
      throw error;
    }),
    services.db.collection("users").doc(reporterUid).get(),
    services.db.collection("incidents").where("reportedBy", "==", reporterUid).count().get(),
  ]);
  if (!profileSnapshot.exists) fail("The account that filed this report has since been deleted.", 404);
  const profile = profileSnapshot.data();
  await incidentRef.collection("events").add({
    event: "REPORTER_PROFILE_VIEWED",
    actorUid: req.user.uid,
    createdAt: Timestamp.now(),
  });
  res.set("cache-control", "no-store").json({
    reporter: {
      ...summarizeUser(reporterUid, authRecord, profile),
      faculty: profile.faculty || null,
      department: profile.department || null,
      year: Number.isInteger(profile.year) ? profile.year : null,
      incidentsReported: reported.data().count,
    },
  });
});

route("post", "/incidents/:id/attachments/upload-url", authenticate, async (req, res) => {
  const services = getFirebaseServices();
  const r2 = getR2Storage();
  await enforceRateLimit(services.db, `evidence_upload_${req.user.uid}`, 10, 10 * 60 * 1000);
  const incidentId = text(req.params.id, "Incident id", { max: 150 });
  const attachmentId = text(req.body?.attachmentId, "Attachment id", { max: 48 });
  const contentType = req.body?.contentType;
  const fileType = EVIDENCE_TYPES[contentType];
  const size = req.body?.size;
  if (!fileType || !/^[a-f0-9-]{36}\.(jpg|png|webp|webm|mp4)$/.test(attachmentId)
    || !attachmentId.endsWith(`.${fileType.extension}`)
    || !Number.isSafeInteger(size) || size <= 0 || size > fileType.maxBytes) {
    fail("The attachment identifier, file type, or size is invalid.");
  }
  if (req.body?.kind !== fileType.kind) fail("The attachment type does not match its content.");

  const incidentRef = services.db.collection("incidents").doc(incidentId);
  const snapshot = await incidentRef.get();
  if (!snapshot.exists) fail("Incident not found.", 404);
  const incident = snapshot.data();
  if (incident.reportedBy !== req.user.uid) fail("Only the incident reporter can add evidence.", 403);
  const attachments = Array.isArray(incident.attachments) ? incident.attachments : [];
  if (attachments.some(item => item.id === attachmentId)) fail("This attachment is already registered.", 409);
  if (attachments.length >= 3 || (fileType.kind === "video" && attachments.some(item => item.kind === "video"))) {
    fail("This incident has reached its attachment limit.", 409);
  }

  const objectKey = evidenceObjectKey(incidentId, attachmentId);
  const url = await signEvidenceUpload(r2, { objectKey, contentType, uid: req.user.uid });
  res.set("cache-control", "no-store").json({
    url,
    expiresInSeconds: 300,
    headers: {
      "cache-control": "private, no-store",
      "content-type": contentType,
      "x-amz-meta-uid": req.user.uid,
    },
  });
});

route("post", "/incidents/:id/attachments", authenticate, async (req, res) => {
  const services = getFirebaseServices();
  const r2 = getR2Storage();
  const incidentId = text(req.params.id, "Incident id", { max: 150 });
  const attachmentId = text(req.body?.attachmentId, "Attachment id", { max: 48 });
  const contentType = req.body?.contentType;
  const fileType = EVIDENCE_TYPES[contentType];
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp|webm|mp4)$/.test(attachmentId)
    || !fileType || !attachmentId.endsWith(`.${fileType.extension}`)) {
    fail("The attachment identifier or file type is invalid.");
  }
  if (req.body?.kind !== fileType.kind) fail("The attachment type does not match its content.");

  const incidentRef = services.db.collection("incidents").doc(incidentId);
  const objectKey = evidenceObjectKey(incidentId, attachmentId);
  let metadata;
  try {
    metadata = await r2.client.send(new HeadObjectCommand({ Bucket: r2.bucketName, Key: objectKey }));
  } catch (error) {
    if (error.name === "NotFound" || error.name === "NoSuchKey") fail("The uploaded attachment was not found.", 400);
    throw error;
  }
  const size = metadata.ContentLength;
  if (metadata.ContentType !== contentType || metadata.Metadata?.uid !== req.user.uid
    || !Number.isSafeInteger(size) || size <= 0 || size > fileType.maxBytes) {
    fail("The uploaded attachment did not pass verification.", 400);
  }

  const attachment = {
    id: attachmentId,
    name: [...text(req.body?.name, "File name", { max: 180 })]
      .map(character => {
        const code = character.charCodeAt(0);
        return code < 32 || code === 127 || character === "/" || character === "\\" ? "_" : character;
      })
      .join(""),
    kind: fileType.kind,
    contentType,
    size,
    createdAt: Timestamp.now(),
  };
  let savedAttachment;
  await services.db.runTransaction(async transaction => {
    const snapshot = await transaction.get(incidentRef);
    if (!snapshot.exists) fail("Incident not found.", 404);
    const incident = snapshot.data();
    if (incident.reportedBy !== req.user.uid) fail("Only the incident reporter can add evidence.", 403);
    const attachments = Array.isArray(incident.attachments) ? incident.attachments : [];
    const existing = attachments.find(item => item.id === attachmentId);
    if (existing) {
      savedAttachment = existing;
      return;
    }
    if (attachments.length >= 3 || (fileType.kind === "video" && attachments.some(item => item.kind === "video"))) {
      fail("This incident has reached its attachment limit.", 409);
    }
    transaction.update(incidentRef, {
      attachments: [...attachments, attachment],
      updatedAt: Timestamp.now(),
    });
    transaction.create(incidentRef.collection("events").doc(), {
      event: "EVIDENCE_ATTACHED",
      actorUid: req.user.uid,
      attachmentId,
      createdAt: Timestamp.now(),
    });
    savedAttachment = attachment;
  });
  res.status(201).json({ attachment: incidentForClient(incidentId, { attachments: [savedAttachment] }).attachments[0] });
});

route("get", "/incidents/:id/attachments/:attachmentId/url", authenticate, async (req, res) => {
  const services = getFirebaseServices();
  const r2 = getR2Storage();
  const incidentId = text(req.params.id, "Incident id", { max: 150 });
  const attachmentId = text(req.params.attachmentId, "Attachment id", { max: 48 });
  const incidentRef = services.db.collection("incidents").doc(incidentId);
  const snapshot = await incidentRef.get();
  if (!snapshot.exists) fail("Incident not found.", 404);
  const incident = snapshot.data();
  const permitted = hasRole(req.user, "admin")
    || incident.reportedBy === req.user.uid
    || (isResponder(req.user) && incident.responderUid === req.user.uid);
  if (!permitted) fail("You are not allowed to view evidence for this incident.", 403);
  const attachment = (incident.attachments || []).find(item => item.id === attachmentId);
  if (!attachment) fail("Attachment not found.", 404);
  await incidentRef.collection("events").add({
    event: "EVIDENCE_VIEW_LINK_ISSUED",
    actorUid: req.user.uid,
    attachmentId,
    createdAt: Timestamp.now(),
  });
  const objectKey = evidenceObjectKey(incidentId, attachmentId);
  const url = await getSignedUrl(r2.client, new GetObjectCommand({
    Bucket: r2.bucketName,
    Key: objectKey,
    ResponseContentDisposition: "inline",
    ResponseCacheControl: "private, no-store",
  }), { expiresIn: 300 });
  res.set("cache-control", "no-store").json({ url, expiresInSeconds: 300 });
});

route("delete", "/incidents/:id/attachments/:attachmentId", authenticate, async (req, res) => {
  const services = getFirebaseServices();
  const r2 = getR2Storage();
  const incidentId = text(req.params.id, "Incident id", { max: 150 });
  const attachmentId = text(req.params.attachmentId, "Attachment id", { max: 48 });
  const incidentRef = services.db.collection("incidents").doc(incidentId);
  const snapshot = await incidentRef.get();
  if (!snapshot.exists) fail("Incident not found.", 404);
  const incident = snapshot.data();
  if (incident.reportedBy !== req.user.uid) fail("Only the incident reporter can remove an unregistered upload.", 403);
  if ((incident.attachments || []).some(item => item.id === attachmentId)) return res.sendStatus(204);
  await r2.client.send(new DeleteObjectCommand({
    Bucket: r2.bucketName,
    Key: evidenceObjectKey(incidentId, attachmentId),
  }));
  res.sendStatus(204);
});

app.get("/cleanup-evidence", async (req, res, next) => {
  const secret = process.env.CRON_SECRET || "";
  const supplied = (req.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const expectedBytes = Buffer.from(secret);
  const suppliedBytes = Buffer.from(supplied);
  if (!secret || expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) {
    return res.sendStatus(secret ? 401 : 503);
  }

  try {
    const services = getFirebaseServices();
    const r2 = getR2Storage();
    const cutoff = Timestamp.fromMillis(Date.now() - 90 * 24 * 60 * 60 * 1000);
    let deleted = 0;
    let continuationToken;
    do {
      const page = await r2.client.send(new ListObjectsV2Command({
        Bucket: r2.bucketName,
        Prefix: "incidents/",
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      }));
      const expiredObjects = (page.Contents || []).filter(item => item.Key && item.LastModified
        && item.LastModified.getTime() <= cutoff.toMillis());
      const byIncident = new Map();
      for (const object of expiredObjects) {
        const parsed = parseEvidenceObjectKey(object.Key);
        if (!parsed) continue;
        if (!byIncident.has(parsed.incidentId)) byIncident.set(parsed.incidentId, new Set());
        byIncident.get(parsed.incidentId).add(parsed.attachmentId);
      }
      for (const [incidentId, expiredIds] of byIncident) {
        const incidentRef = services.db.collection("incidents").doc(incidentId);
        const incidentSnapshot = await incidentRef.get();
        if (!incidentSnapshot.exists) continue;
        const attachments = Array.isArray(incidentSnapshot.get("attachments"))
          ? incidentSnapshot.get("attachments")
          : [];
        const expiredAttachments = attachments.filter(item => expiredIds.has(item.id));
        if (!expiredAttachments.length) continue;
        const remainingIds = new Set(expiredAttachments.map(item => item.id));
        const now = Timestamp.now();
        await incidentRef.update({
          attachments: attachments.filter(item => !remainingIds.has(item.id)),
          updatedAt: now,
        });
        await incidentRef.collection("events").add({
          event: "EVIDENCE_AUTO_DELETED",
          actorUid: "system",
          attachmentCount: expiredAttachments.length,
          createdAt: now,
        });
      }
      if (expiredObjects.length) {
        const deletion = await r2.client.send(new DeleteObjectsCommand({
          Bucket: r2.bucketName,
          Delete: { Objects: expiredObjects.map(item => ({ Key: item.Key })), Quiet: true },
        }));
        if (deletion.Errors?.length) throw new Error("Some expired R2 evidence objects could not be deleted.");
        deleted += expiredObjects.length;
      }
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (continuationToken);
    res.json({ deleted });
  } catch (error) {
    next(error);
  }
});

const RESPONDER_ROLE_NAMES = ["responder", "security", "medical"];

// Keeps only the responders whose field can handle the incident, so alerts reach
// people who are allowed to accept it.
async function responderIdsForIncident(services, uids, incident) {
  const unique = [...new Set(uids)];
  if (!unique.length) return [];
  const profiles = await services.db.getAll(...unique.map(uid => services.db.collection("users").doc(uid)));
  return profiles
    .filter(profile => profile.exists && canHandleIncident(responderSpecialization(profile.data()), incident))
    .map(profile => profile.id);
}

// Alerts every admin and every responder about a new SOS. The assigned responder
// (if any) gets a separate "you are dispatched" alert. Never throws: the SOS is
// already saved and visible on the Admin and Responder portals regardless.
async function alertSos(services, created, { anonymous = false } = {}) {
  const { reference } = created.data;
  const data = { incidentId: created.ref.id, reference, kind: "sos" };
  const lookup = async roles => {
    try {
      return await usersWithRole(services, roles);
    } catch (error) {
      console.error("SOS alert recipient lookup failed", roles, error);
      return [];
    }
  };
  const [adminIds, allResponderIds] = await Promise.all([lookup(["admin"]), lookup(RESPONDER_ROLE_NAMES)]);
  let responderIds = [];
  try {
    responderIds = await responderIdsForIncident(services, allResponderIds, created.data);
  } catch (error) {
    console.error("SOS alert responder field lookup failed", error);
    // Better to over-alert than to leave an SOS unseen.
    responderIds = allResponderIds;
  }
  const assignedUid = created.assignment?.uid || null;
  const broadcast = [...new Set([...adminIds, ...responderIds])].filter(uid => uid !== assignedUid);
  const who = anonymous ? "Anonymous visitor" : created.data.reporterName || "Campus user";
  const body = created.assignment
    ? `${reference}: SOS from ${who}. ${created.assignment.name} has been dispatched.`
    : `${reference}: SOS from ${who}. No responder assigned yet. Open the Responder portal to accept it.`;
  const send = async payload => {
    try {
      return await notifyUsers(services, { ...payload, data, emergency: true });
    } catch (error) {
      console.error("SOS alert delivery failed", created.ref.id, error);
      return { error: "Alert delivery failed." };
    }
  };
  const [broadcastResult, assignedResult] = await Promise.all([
    send({ userIds: broadcast, title: anonymous ? "Anonymous campus SOS" : "Campus SOS alert", body }),
    assignedUid
      ? send({ userIds: [assignedUid], title: "You have been dispatched to an SOS", body: `${reference}: go to the reported GPS location now. Details are in your Responder portal.` })
      : null,
  ]);
  return {
    admins: adminIds.length,
    responders: responderIds.length,
    broadcast: broadcastResult,
    assigned: assignedResult,
  };
}

route("post", "/sos", authenticate, async (req, res) => {
  const services = getFirebaseServices();
  await enforceRateLimit(services.db, `sos_${req.user.uid}`, 3);
  const input = incidentInput(req.body, { sos: true });
  let created;
  try {
    created = await createIncidentRecord(services, req.user, input, { sos: true });
  } catch (error) {
    console.error("SOS incident could not be saved", error);
    if (!error.status) {
      error.publicMessage = "Your SOS could not be saved to the incident system. Call UMP Campus Security on +27 13 002 0010 or 10177 now.";
    }
    throw error;
  }
  const delivery = await alertSos(services, created);
  res.status(201).json({
    incident: incidentForClient(created.ref.id, created.data),
    dispatch: created.assignment ? { assigned: true, responder: created.assignment.name, distanceKm: Number(created.assignment.distanceKm.toFixed(2)) } : { assigned: false },
    notifications: delivery,
  });
});

route("post", "/sos/anonymous", requireAnonymousAppCheck, async (req, res) => {
  const services = getFirebaseServices();
  const rateKey = anonymousSosRateLimitKey(req.ip, process.env.SOS_RATE_LIMIT_SECRET);
  await enforceRateLimit(services.db, `anonymous_sos_${rateKey}`, 8, 10 * 60 * 1000);
  const requestId = req.body?.requestId;
  if (typeof requestId !== "string" || !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(requestId)) {
    const error = new Error("A valid SOS request identifier is required.");
    error.status = 400;
    throw error;
  }
  const input = anonymousSosInput(req.body);
  const created = await createIncidentRecord(
    services,
    { uid: null, name: "Anonymous visitor" },
    input,
    { sos: true, anonymous: true, idempotencyKey: requestId },
  );

  let delivery = null;
  if (!created.duplicate) delivery = await alertSos(services, created, { anonymous: true });

  res.status(created.duplicate ? 200 : 201).json({
    incident: incidentForClient(created.ref.id, created.data),
    dispatch: created.assignment
      ? { assigned: true, responder: created.assignment.name }
      : { assigned: false },
    notifications: delivery,
    duplicate: created.duplicate,
  });
});

// A responder accepts an SOS that auto-dispatch could not assign.
route("post", "/incidents/:id/claim", authenticate, async (req, res) => {
  if (!isResponder(req.user)) fail("Responder access is required.", 403);
  const services = getFirebaseServices();
  const id = text(req.params.id, "Incident id", { max: 150 });
  const ref = services.db.collection("incidents").doc(id);
  let claimed;
  await services.db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) fail("Incident not found.", 404);
    const before = snapshot.data();
    if (before.isSOS !== true) fail("Only SOS alerts can be accepted from the Responder portal.", 403);
    if (before.responderUid || before.status !== "NEW") fail("Another responder has already accepted this SOS.", 409);
    if (!canHandleIncident(responderSpecialization(req.user.profile), before)) {
      fail(`This SOS needs one of these responder fields: ${requiredFieldsText(before)}. Your field is ${specializationLabel(responderSpecialization(req.user.profile))}.`, 403);
    }
    const now = Timestamp.now();
    const updates = {
      responderUid: req.user.uid,
      responder: req.user.name,
      dispatchedByUid: req.user.uid,
      status: "TEAM_DISPATCHED",
      dispatchedAt: now,
      updatedAt: now,
    };
    transaction.update(ref, updates);
    transaction.create(ref.collection("events").doc(), {
      event: "RESPONDER_ACCEPTED_SOS",
      actorUid: req.user.uid,
      fromStatus: before.status,
      status: "TEAM_DISPATCHED",
      responderUid: req.user.uid,
      createdAt: now,
    });
    claimed = { ...before, ...updates };
  });

  try {
    const adminIds = await usersWithRole(services, ["admin"]);
    await notifyUsers(services, {
      userIds: [...new Set([...adminIds, claimed.reportedBy].filter(Boolean))],
      title: "Responder on the way",
      body: `${claimed.reference}: ${req.user.name} accepted the SOS and is responding.`,
      data: { incidentId: id, reference: claimed.reference, kind: "incident-update" },
    });
  } catch (error) {
    console.error("SOS claim notification failed", id, error);
  }
  res.json({ incident: incidentForClient(id, claimed) });
});

async function onDutyResponderIds(services, excludeUid) {
  const snapshot = await services.db.collection("responderPresence").where("onDuty", "==", true).limit(200).get();
  const now = Date.now();
  return snapshot.docs
    .filter(doc => doc.id !== excludeUid && now - (doc.get("updatedAt")?.toMillis?.() ?? 0) <= RESPONDER_PRESENCE_FRESH_MS)
    .map(doc => doc.id);
}

// Progress notes and backup requests from the scene. Stored on the incident's
// timeline so admins see them live; backup requests also alert admins and the
// other responders currently on duty.
route("post", "/incidents/:id/updates", authenticate, async (req, res) => {
  const services = getFirebaseServices();
  const adminActor = hasRole(req.user, "admin");
  if (!adminActor && !isResponder(req.user)) fail("Only admins or responders can post incident updates.", 403);
  await enforceRateLimit(services.db, `incident_update_${req.user.uid}`, 20);
  const id = text(req.params.id, "Incident id", { max: 150 });
  const kind = req.body?.kind === "backup" ? "backup" : "note";
  const message = text(req.body?.message ?? (kind === "backup" ? "Backup requested." : ""), "Update", { min: kind === "backup" ? 1 : 2, max: 500 });
  const ref = services.db.collection("incidents").doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) fail("Incident not found.", 404);
  const incident = snapshot.data();
  if (!adminActor && incident.responderUid !== req.user.uid) fail("This incident is not assigned to you.", 403);
  if (["RESOLVED", "CLOSED"].includes(incident.status)) fail("This incident is already closed.", 409);
  const now = Timestamp.now();
  const eventRef = ref.collection("events").doc();
  await eventRef.set({
    event: kind === "backup" ? "BACKUP_REQUESTED" : "RESPONDER_UPDATE",
    actorUid: req.user.uid,
    actorName: req.user.name,
    message,
    status: incident.status,
    createdAt: now,
  });
  await ref.update({ updatedAt: now });

  let alerted = 0;
  if (kind === "backup") {
    try {
      const [adminIds, responderIds] = await Promise.all([
        usersWithRole(services, ["admin"]),
        onDutyResponderIds(services, req.user.uid),
      ]);
      const recipients = [...new Set([...adminIds, ...responderIds])].filter(uid => uid !== req.user.uid);
      alerted = recipients.length;
      await notifyUsers(services, {
        userIds: recipients,
        title: `Backup requested · ${incident.reference}`,
        body: `${req.user.name} needs backup at ${incident.buildingName || "the incident location"}: ${message}`.slice(0, 300),
        data: { incidentId: id, reference: incident.reference, kind: "backup" },
        emergency: true,
      });
    } catch (error) {
      console.error("Backup request alert failed", id, error);
    }
  }
  res.status(201).json({ update: { id: eventRef.id, kind, message, createdAt: now.toDate().toISOString() }, alerted });
});

// A responder who cannot attend hands the incident back before reaching the
// scene. It returns to the unassigned queue (an SOS reappears for every
// responder) and admins are told so they can redispatch.
route("post", "/incidents/:id/release", authenticate, async (req, res) => {
  if (!isResponder(req.user)) fail("Responder access is required.", 403);
  const services = getFirebaseServices();
  const id = text(req.params.id, "Incident id", { max: 150 });
  const reason = text(req.body?.reason, "Reason", { min: 3, max: 300 });
  const ref = services.db.collection("incidents").doc(id);
  let released;
  await services.db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) fail("Incident not found.", 404);
    const before = snapshot.data();
    if (before.responderUid !== req.user.uid) fail("This incident is not assigned to you.", 403);
    if (!["TEAM_DISPATCHED", "ACKNOWLEDGED"].includes(before.status)) {
      fail("You can only hand back an incident before you are on scene. Post an update or request backup instead.", 409);
    }
    const now = Timestamp.now();
    const updates = { responderUid: null, responder: null, dispatchedByUid: null, dispatchedAt: null, status: "NEW", updatedAt: now };
    transaction.update(ref, updates);
    transaction.create(ref.collection("events").doc(), {
      event: "RESPONDER_RELEASED",
      actorUid: req.user.uid,
      actorName: req.user.name,
      message: reason,
      fromStatus: before.status,
      status: "NEW",
      createdAt: now,
    });
    released = { ...before, ...updates };
  });

  try {
    const [adminIds, responderIds] = await Promise.all([
      usersWithRole(services, ["admin"]),
      released.isSOS
        ? onDutyResponderIds(services, req.user.uid).then(ids => responderIdsForIncident(services, ids, released))
        : Promise.resolve([]),
    ]);
    await notifyUsers(services, {
      userIds: [...new Set([...adminIds, ...responderIds])],
      title: released.isSOS ? `SOS needs a responder again · ${released.reference}` : `Incident needs redispatch · ${released.reference}`,
      body: `${req.user.name} cannot attend: ${reason}`.slice(0, 300),
      data: { incidentId: id, reference: released.reference, kind: released.isSOS ? "sos" : "incident-update" },
      emergency: released.isSOS === true,
    });
  } catch (error) {
    console.error("Release notification failed", id, error);
  }
  res.json({ incident: incidentForClient(id, released) });
});

route("patch", "/incidents/:id", authenticate, async (req, res) => {
  const services = getFirebaseServices();
  const id = text(req.params.id, "Incident id", { max: 150 });
  const ref = services.db.collection("incidents").doc(id);
  const responderActor = isResponder(req.user);
  const adminActor = hasRole(req.user, "admin");
  if (!adminActor && !responderActor) fail("Only admins or responders can update incidents.", 403);
  const status = req.body?.status;
  validAssignmentStatus(status);
  if (responderActor && !adminActor && !["ACKNOWLEDGED", "ON_SCENE", "RESOLVED"].includes(status)) fail("Responders cannot set that status.", 403);

  let changed;
  let assignedNow = false;
  await services.db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) fail("Incident not found.", 404);
    const before = snapshot.data();
    if (!adminActor && before.responderUid !== req.user.uid) fail("This incident is not assigned to you.", 403);
    const transitionAllowed = adminActor
      || (status === "ACKNOWLEDGED" && before.status === "TEAM_DISPATCHED")
      || (status === "ON_SCENE" && before.status === "ACKNOWLEDGED")
      || (status === "RESOLVED" && before.status === "ON_SCENE");
    if (!transitionAllowed) fail(`Cannot change incident from ${before.status} to ${status}.`, 409);

    const now = Timestamp.now();
    const updates = { status, updatedAt: now };
    if (adminActor && req.body.responder) {
      const responderUid = text(req.body.responder.uid, "Responder id", { max: 128 });
      const responderProfile = await services.db.collection("users").doc(responderUid).get();
      const roles = [responderProfile.get("role"), ...(responderProfile.get("roles") || [])].flat();
      if (!responderProfile.exists || !roles.some(role => ["responder", "security", "medical"].includes(role))) fail("Choose a provisioned responder account.");
      if (isSuspendedProfile(responderProfile.data())) fail("This responder account is suspended. Choose another responder.");
      const field = responderSpecialization(responderProfile.data());
      if (!isSpecialization(field)) {
        fail("This responder has no field set. Set their field in Assignments → Provisioned Responders before dispatching them.");
      }
      if (!canHandleIncident(field, before)) {
        fail(`This responder's field (${specializationLabel(field)}) cannot be dispatched to this incident. Choose one of: ${requiredFieldsText(before)}.`);
      }
      updates.responderUid = responderUid;
      updates.responder = responderProfile.get("fullName") || responderProfile.get("email") || "Responder";
      updates.dispatchedByUid = req.user.uid;
      updates.status = "TEAM_DISPATCHED";
      updates.dispatchedAt = now;
      assignedNow = true;
    }
    if (status === "RESOLVED" || status === "CLOSED") updates.resolvedAt = now;
    transaction.update(ref, updates);
    transaction.create(ref.collection("events").doc(), {
      event: updates.responderUid ? "RESPONDER_ASSIGNED" : "STATUS_CHANGED",
      actorUid: req.user.uid,
      fromStatus: before.status,
      status: updates.status,
      responderUid: updates.responderUid || before.responderUid || null,
      createdAt: now,
    });
    changed = { ...before, ...updates };
  });

  const urgent = changed.isSOS === true || ["P1", "P2"].includes(changed.priority);
  const notices = [];
  const reporterUid = changed.reportedBy && changed.reportedBy !== req.user.uid ? changed.reportedBy : null;
  if (assignedNow) {
    // The responder needs a clear, actionable dispatch alert, not a generic update.
    notices.push(safeNotify(services, {
      userIds: [changed.responderUid],
      title: `${urgent ? "Urgent: " : ""}You've been dispatched · ${changed.reference}`,
      body: `${changed.isSOS ? "SOS" : incidentTypeLabel(changed.type)} at ${incidentWhere(changed)}. Open the Responder portal to navigate.`,
      data: { incidentId: id, reference: changed.reference, kind: "dispatch" },
      emergency: urgent,
    }, id));
    if (reporterUid) {
      notices.push(safeNotify(services, {
        userIds: [reporterUid],
        title: "A responder has been assigned",
        body: `${changed.responder} is responding to your report ${changed.reference}.`,
        data: { incidentId: id, reference: changed.reference, kind: "incident-update" },
      }, id));
    }
  } else {
    if (reporterUid) {
      notices.push(safeNotify(services, {
        userIds: [reporterUid],
        title: "Update on your report",
        body: `${changed.reference} is ${STATUS_FOR_REPORTER[changed.status] || changed.status.toLowerCase()}.`,
        data: { incidentId: id, reference: changed.reference, kind: "incident-update" },
      }, id));
    }
    // A responder is told when an admin changes their incident, not about their own updates.
    if (adminActor && changed.responderUid && changed.responderUid !== req.user.uid) {
      notices.push(safeNotify(services, {
        userIds: [changed.responderUid],
        title: `Incident ${changed.reference} updated by the admin team`,
        body: `Status is now ${changed.status.replaceAll("_", " ").toLowerCase()}.`,
        data: { incidentId: id, reference: changed.reference, kind: "incident-update" },
      }, id));
    }
  }
  await Promise.all(notices);
  res.json({ incident: incidentForClient(id, changed) });
});

route("get", "/dashboard/analytics", authenticate, async (req, res) => {
  requireRole(req.user, ["admin"]);
  const services = getFirebaseServices();
  const snapshot = await services.db.collection("incidents").orderBy("createdAt", "desc").limit(5000).get();
  const byType = {};
  const byPriority = {};
  const byStatus = {};
  let assignedCount = 0;
  let assignmentMs = 0;
  let assignmentSamples = 0;
  const rows = snapshot.docs.map(doc => doc.data());
  for (const row of rows) {
    byType[row.type] = (byType[row.type] || 0) + 1;
    byPriority[row.priority] = (byPriority[row.priority] || 0) + 1;
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
    if (row.responderUid) assignedCount += 1;
    if (row.createdAt && row.dispatchedAt) {
      assignmentMs += row.dispatchedAt.toMillis() - row.createdAt.toMillis();
      assignmentSamples += 1;
    }
  }
  res.json({
    sampledIncidents: rows.length,
    capped: rows.length === 5000,
    byType,
    byPriority,
    byStatus,
    assignedCount,
    averageMinutesToAssignment: assignmentSamples ? Math.round(assignmentMs / assignmentSamples / 60000 * 10) / 10 : null,
    calculatedAt: new Date().toISOString(),
  });
});

route("put", "/responders/presence", authenticate, async (req, res) => {
  if (!isResponder(req.user)) fail("Responder access is required.", 403);
  // onDuty: the responder is working and sharing location (shown to admins).
  // available: on duty AND free, i.e. eligible for SOS auto-dispatch. A busy
  // responder stays on duty but is not auto-assigned a second emergency.
  const available = req.body?.available;
  if (typeof available !== "boolean") fail("Set available to true or false.");
  const onDuty = typeof req.body?.onDuty === "boolean" ? req.body.onDuty : available;
  const services = getFirebaseServices();
  await enforceRateLimit(services.db, `presence_${req.user.uid}`, 30);
  const data = { available: onDuty && available, onDuty, updatedAt: FieldValue.serverTimestamp() };
  if (onDuty) {
    Object.assign(data, coordinates(req.body.latitude, req.body.longitude));
    const accuracy = req.body.accuracyMeters;
    data.accuracyMeters = Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= 100000 ? accuracy : null;
    if (data.available) data.assignmentReservedAt = FieldValue.delete();
  } else {
    // Off duty: stop holding the responder's location.
    Object.assign(data, { latitude: FieldValue.delete(), longitude: FieldValue.delete(), accuracyMeters: FieldValue.delete() });
  }
  await services.db.collection("responderPresence").doc(req.user.uid).set(data, { merge: true });
  res.json({ onDuty, available: data.available, updatedAt: new Date().toISOString() });
});

route("post", "/notifications/tokens", authenticate, async (req, res) => {
  const token = text(req.body?.token, "Push token", { min: 100, max: 4096 });
  const tokenId = createHash("sha256").update(token).digest("hex");
  const services = getFirebaseServices();
  await services.db.collection("users").doc(req.user.uid).collection("pushTokens").doc(tokenId).set({
    token,
    updatedAt: FieldValue.serverTimestamp(),
    userAgent: String(req.get("user-agent") || "").slice(0, 300),
  });
  res.status(204).end();
});

route("delete", "/notifications/tokens", authenticate, async (req, res) => {
  const token = text(req.body?.token, "Push token", { min: 100, max: 4096 });
  const tokenId = createHash("sha256").update(token).digest("hex");
  const services = getFirebaseServices();
  await services.db.collection("users").doc(req.user.uid).collection("pushTokens").doc(tokenId).delete();
  res.status(204).end();
});

route("post", "/alerts", authenticate, async (req, res) => {
  requireRole(req.user, ["admin"]);
  const title = text(req.body?.title, "Alert title", { max: 120 });
  const body = text(req.body?.body, "Alert message", { max: 1000 });
  const services = getFirebaseServices();
  await enforceRateLimit(services.db, `broadcast_${req.user.uid}`, 5);
  const userIds = await usersWithRole(services, ["student", "staff", "admin", "responder", "security", "medical"]);
  const alertRef = await services.db.collection("campusAlerts").add({
    title, body, createdBy: req.user.uid, scope: "campus", createdAt: FieldValue.serverTimestamp(),
  });
  const delivery = await notifyUsers(services, { userIds, title, body, data: { alertId: alertRef.id, kind: "campus-alert" }, emergency: true });
  await writeAudit(services, req.user, "CAMPUS_ALERT_SENT", null, { alertId: alertRef.id, title, recipientCount: userIds.length });
  res.status(201).json({ id: alertRef.id, recipientCount: userIds.length, delivery });
});

route("post", "/chat", handleChat);

route("get", "/firebase-public-config", (_req, res) => {
  const config = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  };
  if (Object.values(config).some(value => !value)) return res.status(503).json({ error: "Firebase browser configuration is incomplete." });
  res.set("cache-control", "public, max-age=300").json(config);
});

route("get", "/firebase-messaging-sw.js", async (_req, res) => {
  const { apiKey, authDomain, projectId, messagingSenderId, appId } = process.env;
  const config = {
    apiKey: apiKey || process.env.VITE_FIREBASE_API_KEY,
    authDomain: authDomain || process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: projectId || process.env.VITE_FIREBASE_PROJECT_ID,
    messagingSenderId: messagingSenderId || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: appId || process.env.VITE_FIREBASE_APP_ID,
  };
  if (Object.values(config).some(value => !value)) return res.status(503).type("text").send("Firebase web configuration is incomplete.");
  res.set({ "service-worker-allowed": "/", "cache-control": "no-cache" }).type("application/javascript").send(
    // Background alerts for when no CEIS tab is open. Messages include a
    // `notification` block, which browsers display themselves; the click handler
    // opens the portal (or focuses an open CEIS tab) instead of the landing page.
    `importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js","https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");firebase.initializeApp(${JSON.stringify(config)});firebase.messaging();self.addEventListener("install",()=>self.skipWaiting());self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));self.addEventListener("notificationclick",event=>{event.notification.close();const target=new URL("/?access=system",self.location.origin).href;event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{const open=list.find(client=>new URL(client.url).origin===self.location.origin);if(open){return open.focus();}return self.clients.openWindow(target);}));});`,
  );
});

app.use((error, _req, res, _next) => {
  const status = error.status || (error.code === "auth/id-token-expired" || error.code === "auth/argument-error" ? 401 : 500);
  if (status >= 500) console.error("CEIS API request failed", error);
  res.status(status).json({
    error: status === 503
      ? error.publicMessage || error.message || "The CEIS API is not configured for this operation."
      : status >= 500
      ? error.publicMessage || "The request could not be completed."
      : error.message,
  });
});

export default app;
