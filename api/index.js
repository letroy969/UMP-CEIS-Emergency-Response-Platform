import express from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { anonymousSosIncidentId, anonymousSosInput, anonymousSosRateLimitKey } from "./_lib/anonymousSos.js";
import { authenticate, enforceRateLimit, hasRole, isResponder, requireRole } from "./_lib/auth.js";
import { getFirebaseServices } from "./_lib/firebaseAdmin.js";
import { handleChat } from "./chat.js";
import { notifyUsers, usersWithRole } from "./_lib/notifications.js";
import { coordinates, fail, incidentInput, STATUSES, text } from "./_lib/validation.js";

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
    reporter: row.reporterName || "Student",
    createdAt,
    updatedAt: date(row.updatedAt),
    dispatchedAt: date(row.dispatchedAt),
    resolvedAt: date(row.resolvedAt),
    time: createdAt ? new Date(createdAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }) : "",
  };
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

  for (const candidate of candidates) {
    const claimed = await services.db.runTransaction(async transaction => {
      const snapshot = await transaction.get(candidate.ref);
      if (!snapshot.exists || snapshot.get("available") !== true
        || now - (snapshot.get("updatedAt")?.toMillis?.() ?? 0) > 120000) return false;
      transaction.update(candidate.ref, { available: false, assignmentReservedAt: FieldValue.serverTimestamp() });
      return true;
    });
    if (!claimed) continue;
    const profile = await services.db.collection("users").doc(candidate.uid).get();
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
  if (sos) assignment = await autoAssignNearest(services, data);
  if (assignment) {
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
  const responders = await Promise.all(ids.map(async uid => {
    const [profile, presence] = await Promise.all([
      services.db.collection("users").doc(uid).get(),
      services.db.collection("responderPresence").doc(uid).get(),
    ]);
    return {
      uid,
      name: profile.get("fullName") || profile.get("email") || "Responder",
      available: presence.get("available") === true,
      lastSeenAt: presence.get("updatedAt")?.toDate?.().toISOString?.() || null,
    };
  }));
  responders.sort((a, b) => a.name.localeCompare(b.name));
  res.json({ responders });
});

route("post", "/incidents", authenticate, async (req, res) => {
  const services = getFirebaseServices();
  await enforceRateLimit(services.db, `incident_${req.user.uid}`, 15);
  const input = incidentInput(req.body);
  const created = await createIncidentRecord(services, req.user, input);
  res.status(201).json({ incident: incidentForClient(created.ref.id, created.data) });
});

const EVIDENCE_TYPES = {
  "image/jpeg": { kind: "image", extension: "jpg", maxBytes: 10 * 1024 * 1024 },
  "image/png": { kind: "image", extension: "png", maxBytes: 10 * 1024 * 1024 },
  "image/webp": { kind: "image", extension: "webp", maxBytes: 10 * 1024 * 1024 },
  "video/webm": { kind: "video", extension: "webm", maxBytes: 40 * 1024 * 1024 },
  "video/mp4": { kind: "video", extension: "mp4", maxBytes: 40 * 1024 * 1024 },
};

route("post", "/incidents/:id/attachments", authenticate, async (req, res) => {
  const services = getFirebaseServices();
  if (!services.storage) fail("Firebase Storage is not configured for incident evidence.", 503);
  const incidentId = text(req.params.id, "Incident id", { max: 150 });
  const attachmentId = text(req.body?.attachmentId, "Attachment id", { max: 48 });
  const contentType = req.body?.contentType;
  const fileType = EVIDENCE_TYPES[contentType];
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp|webm|mp4)$/.test(attachmentId) || !fileType) {
    fail("The attachment identifier or file type is invalid.");
  }
  if (req.body?.kind !== fileType.kind) fail("The attachment type does not match its content.");

  const incidentRef = services.db.collection("incidents").doc(incidentId);
  const objectRef = services.storage.file(`incidents/${incidentId}/attachments/${attachmentId}`);
  const [metadata] = await objectRef.getMetadata();
  const size = Number(metadata.size);
  if (metadata.contentType !== contentType || metadata.metadata?.uid !== req.user.uid
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
  if (!services.storage) fail("Firebase Storage is not configured for incident evidence.", 503);
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
  const objectRef = services.storage.file(`incidents/${incidentId}/attachments/${attachmentId}`);
  const [url] = await objectRef.getSignedUrl({
    action: "read",
    expires: Date.now() + 5 * 60 * 1000,
    version: "v4",
    responseDisposition: "inline",
  });
  res.set("cache-control", "no-store").json({ url, expiresInSeconds: 300 });
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
    if (!services.storage) fail("Firebase Storage is not configured for incident evidence.", 503);
    const cutoff = Timestamp.fromMillis(Date.now() - 90 * 24 * 60 * 60 * 1000);
    let query = services.db.collection("incidents")
      .where("createdAt", "<=", cutoff)
      .orderBy("createdAt")
      .limit(100);
    let deleted = 0;
    let hasMoreIncidents = true;
    while (hasMoreIncidents) {
      const snapshot = await query.get();
      if (snapshot.empty) {
        hasMoreIncidents = false;
        continue;
      }
      for (const doc of snapshot.docs) {
        const attachments = Array.isArray(doc.get("attachments")) ? doc.get("attachments") : [];
        const expired = attachments.filter(item => item.createdAt?.toMillis?.() <= cutoff.toMillis());
        if (!expired.length) continue;
        await Promise.all(expired.map(item =>
          services.storage.file(`incidents/${doc.id}/attachments/${item.id}`).delete({ ignoreNotFound: true }),
        ));
        const expiredIds = new Set(expired.map(item => item.id));
        const now = Timestamp.now();
        await doc.ref.update({
          attachments: attachments.filter(item => !expiredIds.has(item.id)),
          updatedAt: now,
        });
        await doc.ref.collection("events").add({
          event: "EVIDENCE_AUTO_DELETED",
          actorUid: "system",
          attachmentCount: expired.length,
          createdAt: now,
        });
        deleted += expired.length;
      }
      if (snapshot.size < 100) {
        hasMoreIncidents = false;
        continue;
      }
      query = services.db.collection("incidents")
        .where("createdAt", "<=", cutoff)
        .orderBy("createdAt")
        .startAfter(snapshot.docs[snapshot.docs.length - 1])
        .limit(100);
    }
    let pageToken;
    do {
      const [files, nextPage] = await services.storage.getFiles({
        prefix: "incidents/",
        autoPaginate: false,
        maxResults: 100,
        pageToken,
      });
      await Promise.all(files.map(async file => {
        const [metadata] = await file.getMetadata();
        if (Date.parse(metadata.timeCreated) <= cutoff.toMillis()) {
          await file.delete({ ignoreNotFound: true });
          deleted += 1;
        }
      }));
      pageToken = nextPage?.pageToken;
    } while (pageToken);
    res.json({ deleted });
  } catch (error) {
    next(error);
  }
});

route("post", "/sos", authenticate, async (req, res) => {
  const services = getFirebaseServices();
  await enforceRateLimit(services.db, `sos_${req.user.uid}`, 3);
  const input = incidentInput(req.body, { sos: true });
  const created = await createIncidentRecord(services, req.user, input, { sos: true });
  const adminIds = await usersWithRole(services, ["admin"]);
  const audience = [...new Set([...adminIds, ...(created.assignment ? [created.assignment.uid] : [])])];
  const title = created.assignment ? "Responder dispatched" : "Campus emergency report";
  const body = created.assignment
    ? `${created.assignment.name} has been assigned to ${created.data.reference}.`
    : `${created.data.reference}: SOS received. No available responder was found; administrator review is required.`;
  const delivery = await notifyUsers(services, {
    userIds: audience,
    title,
    body,
    data: { incidentId: created.ref.id, reference: created.data.reference, kind: "sos" },
    emergency: true,
  });
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
  if (!created.duplicate) {
    const adminIds = await usersWithRole(services, ["admin"]);
    const audience = [...new Set([...adminIds, ...(created.assignment ? [created.assignment.uid] : [])])];
    const title = created.assignment ? "Responder assigned to anonymous SOS" : "Anonymous campus SOS received";
    const body = created.assignment
      ? `${created.assignment.name} has been assigned to ${created.data.reference}.`
      : `${created.data.reference}: SOS received. No available responder was found; administrator review is required.`;
    delivery = await notifyUsers(services, {
      userIds: audience,
      title,
      body,
      data: { incidentId: created.ref.id, reference: created.data.reference, kind: "sos" },
      emergency: true,
    });
  }

  res.status(created.duplicate ? 200 : 201).json({
    incident: incidentForClient(created.ref.id, created.data),
    dispatch: created.assignment
      ? { assigned: true, responder: created.assignment.name }
      : { assigned: false },
    notifications: delivery,
    duplicate: created.duplicate,
  });
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
      updates.responderUid = responderUid;
      updates.responder = responderProfile.get("fullName") || responderProfile.get("email") || "Responder";
      updates.dispatchedByUid = req.user.uid;
      updates.status = "TEAM_DISPATCHED";
      updates.dispatchedAt = now;
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

  const recipientIds = [changed.reportedBy, changed.responderUid].filter(Boolean);
  await notifyUsers(services, {
    userIds: recipientIds,
    title: "Incident updated",
    body: `${changed.reference} is now ${changed.status.replaceAll("_", " ").toLowerCase()}.`,
    data: { incidentId: id, kind: "incident-update" },
  });
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
  const available = req.body?.available;
  if (typeof available !== "boolean") fail("Set available to true or false.");
  const data = { available, updatedAt: FieldValue.serverTimestamp() };
  if (available) Object.assign(data, coordinates(req.body.latitude, req.body.longitude));
  const services = getFirebaseServices();
  await services.db.collection("responderPresence").doc(req.user.uid).set(data, { merge: true });
  res.json({ available, updatedAt: new Date().toISOString() });
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
  res.status(201).json({ id: alertRef.id, recipientCount: userIds.length, delivery });
});

route("post", "/chat", handleChat);

route("get", "/firebase-public-config", (_req, res) => {
  const config = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  };
  if (Object.values(config).some(value => !value)) return res.status(503).json({ error: "Firebase browser configuration is incomplete." });
  res.set("cache-control", "public, max-age=300").json(config);
});

route("get", "/firebase-messaging-sw.js", async (_req, res) => {
  const { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId } = process.env;
  const config = {
    apiKey: apiKey || process.env.VITE_FIREBASE_API_KEY,
    authDomain: authDomain || process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: projectId || process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: storageBucket || process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: messagingSenderId || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: appId || process.env.VITE_FIREBASE_APP_ID,
  };
  if (Object.values(config).some(value => !value)) return res.status(503).type("text").send("Firebase web configuration is incomplete.");
  res.set({ "service-worker-allowed": "/", "cache-control": "no-cache" }).type("application/javascript").send(
    `importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js","https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");firebase.initializeApp(${JSON.stringify(config)});const messaging=firebase.messaging();messaging.onBackgroundMessage(({notification={},data={}})=>{self.registration.showNotification(notification.title||"UMP Campus Safety",{body:notification.body||"A campus safety update is available.",icon:"/favicon.svg",data});});self.addEventListener("notificationclick",event=>{event.notification.close();event.waitUntil(clients.openWindow("/"));});`,
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
