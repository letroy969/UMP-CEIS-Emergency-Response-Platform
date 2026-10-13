import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
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
    responderUid: row.responderUid ?? null,
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
    const snapshot = await getDocs(buildIncidentQuery(user, mine));
    return snapshot.docs.map(item => present(item.id, item.data()));
  } catch (error) {
    fail(error, "Could not load incident reports.");
  }
}

function buildIncidentQuery(user, mine = false) {
  const constraints = [orderBy("createdAt", "desc")];
  if (user.role === "responder") constraints.unshift(where("responderUid", "==", user.uid));
  else if (user.role !== "admin" || mine) constraints.unshift(where("reportedBy", "==", user.uid));
  return query(collection(db, "incidents"), ...constraints);
}

export function subscribeIncidents(user, onRows, onError, mine = false) {
  if (!user) throw new Error("Sign in to access incident reports.");
  try {
    return onSnapshot(
      buildIncidentQuery(user, mine),
      snapshot => onRows(snapshot.docs.map(item => present(item.id, item.data()))),
      error => onError(new Error(error.message || "Could not monitor incident reports.")),
    );
  } catch (error) {
    onError(new Error(error.message || "Could not monitor incident reports."));
    return () => {};
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
    responderUid: null,
    dispatchedByUid: null,
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
  if (!user || !["admin", "responder"].includes(user.role)) {
    throw new Error("Only admins or assigned responders can update incident reports.");
  }
  if (typeof update.id !== "string" || !STATUSES.has(update.status)) throw new Error("Provide a valid incident and status.");
  if (user.role === "responder" && !["ACKNOWLEDGED", "ON_SCENE", "RESOLVED"].includes(update.status)) {
    throw new Error("Responders may acknowledge, mark on scene, or resolve assigned incidents.");
  }
  const changes = { status: update.status, updatedAt: serverTimestamp() };
  if (user.role === "admin" && update.responder !== undefined) {
    if (typeof update.responder !== "string" || update.responder.length > 120) throw new Error("Responder name is invalid.");
    changes.responder = update.responder;
  }
  if (user.role === "admin" && update.status === "TEAM_DISPATCHED") changes.dispatchedAt = serverTimestamp();
  if (user.role === "admin" || update.status === "RESOLVED") {
    if (["RESOLVED", "CLOSED"].includes(update.status)) changes.resolvedAt = serverTimestamp();
  }
  try {
    const incidentRef = doc(db, "incidents", update.id);
    await updateDoc(incidentRef, changes);
    const saved = await getDoc(incidentRef);
    return present(saved.id, saved.data());
  } catch (error) {
    fail(error, "Incident update could not be saved.");
  }
}

export async function listResponders(user) {
  if (!user || user.role !== "admin") throw new Error("Admin access is required to view responders.");
  try {
    const users = collection(db, "users");
    const [legacyProfiles, roleArrays, roleFieldArrays] = await Promise.all([
      getDocs(query(users, where("role", "in", ["responder", "security", "medical"]), limit(100))),
      getDocs(query(users, where("roles", "array-contains-any", ["responder", "security", "medical"]), limit(100))),
      getDocs(query(users, where("role", "array-contains-any", ["responder", "security", "medical"]), limit(100))),
    ]);
    const profiles = new Map();
    for (const snapshot of [legacyProfiles, roleArrays, roleFieldArrays]) {
      for (const item of snapshot.docs) profiles.set(item.id, item.data());
    }
    return [...profiles]
      .map(([uid, profile]) => ({ uid, name: profile.fullName || profile.email || "Responder" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    fail(error, "Could not load the responder roster.");
  }
}

export async function assignIncident(user, incidentId, responder) {
  if (!user || user.role !== "admin") throw new Error("Admin access is required to dispatch responders.");
  if (!incidentId || !responder?.uid || !responder?.name) throw new Error("Choose a valid responder.");
  try {
    const incidentRef = doc(db, "incidents", incidentId);
    await updateDoc(incidentRef, {
      responderUid: responder.uid,
      responder: responder.name,
      dispatchedByUid: user.uid,
      status: "TEAM_DISPATCHED",
      dispatchedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const saved = await getDoc(incidentRef);
    return present(saved.id, saved.data());
  } catch (error) {
    fail(error, "Responder dispatch could not be saved.");
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
