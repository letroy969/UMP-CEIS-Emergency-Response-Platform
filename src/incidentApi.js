import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./lib/firebase.js";

const INCIDENT_TYPES = new Set(["medical", "fire", "security", "hazard", "infrastructure", "wellbeing", "other"]);
const PRIORITIES = new Set(["P1", "P2", "P3", "P4"]);
const STATUSES = new Set(["NEW", "ACKNOWLEDGED", "TEAM_DISPATCHED", "ON_SCENE", "RESOLVED", "CLOSED"]);

function fail(error, fallback) {
  if (error.code === "permission-denied") {
    throw new Error("You do not have permission to perform this action. Check your verified account and CEIS role.");
  }
  throw new Error(error.message || fallback);
}

function iso(value) {
  if (!value) return null;
  return typeof value.toDate === "function" ? value.toDate().toISOString() : new Date(value).toISOString();
}

function present(id, row) {
  const createdAt = iso(row.createdAt);
  return {
    id,
    reference: row.reference,
    reportedBy: row.reportedBy,
    type: row.type,
    priority: row.priority,
    building: row.building,
    loc: `Building ${row.building}`,
    desc: row.description,
    status: row.status,
    responder: row.responder || "Pending assignment",
    lat: row.latitude ?? null,
    lng: row.longitude ?? null,
    accuracy: row.accuracyMeters ?? null,
    locationCapturedAt: iso(row.locationCapturedAt),
    locationSource: row.locationSource ?? null,
    campusVerified: row.campusVerified ?? null,
    reporter: row.reporterName || "Student",
    createdAt,
    updatedAt: iso(row.updatedAt),
    dispatchedAt: iso(row.dispatchedAt),
    resolvedAt: iso(row.resolvedAt),
    time: createdAt ? new Date(createdAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }) : "",
  };
}

export async function listIncidents(user, mine = false) {
  if (!user) throw new Error("Sign in to access incident reports.");
  try {
    const constraints = [orderBy("createdAt", "desc"), limit(500)];
    if (mine) constraints.unshift(where("reportedBy", "==", user.uid));
    const snapshot = await getDocs(query(collection(db, "incidents"), ...constraints));
    return snapshot.docs.map(item => present(item.id, item.data()));
  } catch (error) {
    fail(error, "Could not load incident reports.");
  }
}

export async function createIncident(user, incident) {
  if (!user) throw new Error("Sign in to submit an incident report.");
  if (!INCIDENT_TYPES.has(incident.type) || !PRIORITIES.has(incident.priority)
    || !/^\d{1,3}$/.test(String(incident.building || ""))
    || typeof incident.desc !== "string" || incident.desc.trim().length < 3 || incident.desc.length > 4000) {
    throw new Error("Provide a valid incident type, priority, building, and description.");
  }
  if ((incident.lat == null) !== (incident.lng == null)) throw new Error("Location must include both coordinates.");
  const reference = `INC-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
  const data = {
    reference,
    reportedBy: user.uid,
    type: incident.type,
    priority: incident.priority,
    building: String(incident.building),
    description: incident.desc.trim(),
    status: "NEW",
    responder: null,
    latitude: incident.lat ?? null,
    longitude: incident.lng ?? null,
    accuracyMeters: incident.accuracy ?? null,
    locationCapturedAt: incident.locationCapturedAt ? new Date(incident.locationCapturedAt) : null,
    locationSource: incident.locationSource ?? null,
    campusVerified: incident.campusVerified ?? null,
    reporterName: typeof incident.reporter === "string" ? incident.reporter.trim().slice(0, 100) : user.displayName || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    dispatchedAt: null,
    resolvedAt: null,
  };
  try {
    const created = await addDoc(collection(db, "incidents"), data);
    const saved = await getDoc(created);
    return present(saved.id, saved.data());
  } catch (error) {
    fail(error, "Incident report could not be saved.");
  }
}

export async function updateIncident(user, update) {
  if (!user) throw new Error("Sign in to update incident reports.");
  if (typeof update.id !== "string" || !STATUSES.has(update.status)) throw new Error("Provide a valid incident and status.");
  const changes = { status: update.status, updatedAt: serverTimestamp() };
  if (update.responder !== undefined) {
    if (typeof update.responder !== "string" || update.responder.length > 120) throw new Error("Responder name is invalid.");
    changes.responder = update.responder;
  }
  if (update.status === "TEAM_DISPATCHED") changes.dispatchedAt = serverTimestamp();
  if (["RESOLVED", "CLOSED"].includes(update.status)) changes.resolvedAt = serverTimestamp();
  try {
    const incidentRef = doc(db, "incidents", update.id);
    await updateDoc(incidentRef, changes);
    const saved = await getDoc(incidentRef);
    return present(saved.id, saved.data());
  } catch (error) {
    fail(error, "Incident update could not be saved.");
  }
}

export async function getCheckin(user) {
  if (!user) throw new Error("Sign in to access safety check-ins.");
  try {
    const snapshot = await getDocs(query(
      collection(db, "safetyCheckins"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(1),
    ));
    if (snapshot.empty) return null;
    const item = snapshot.docs[0];
    const row = item.data();
    return {
      id: item.id,
      status: row.status,
      note: row.note,
      latitude: row.latitude,
      longitude: row.longitude,
      created_at: iso(row.createdAt),
    };
  } catch (error) {
    fail(error, "Could not load your safety status.");
  }
}

export async function createCheckin(user, checkin) {
  if (!user) throw new Error("Sign in to submit a safety check-in.");
  const { status, note, lat, lng } = checkin;
  if (!["safe", "help"].includes(status) || (note !== undefined && (typeof note !== "string" || note.length > 500))) {
    throw new Error("Choose safe or needs help and keep notes under 500 characters.");
  }
  if ((lat == null) !== (lng == null) || (lat != null && (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180))) {
    throw new Error("Location coordinates are invalid.");
  }
  try {
    const created = await addDoc(collection(db, "safetyCheckins"), {
      userId: user.uid,
      status,
      note: note?.trim() || null,
      latitude: lat ?? null,
      longitude: lng ?? null,
      createdAt: serverTimestamp(),
    });
    const saved = await getDoc(created);
    const row = saved.data();
    return { id: saved.id, status: row.status, note: row.note, latitude: row.latitude, longitude: row.longitude, created_at: iso(row.createdAt) };
  } catch (error) {
    fail(error, "Safety check-in could not be saved.");
  }
}
