import {
  addDoc,
  collection,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { auth, db } from "./lib/firebase.js";

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

async function apiRequest(user, path, options = {}) {
  if (!user || !auth.currentUser || auth.currentUser.uid !== user.uid) throw new Error("Sign in to continue.");
  const token = await auth.currentUser.getIdToken();
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "The request could not be completed.");
  return payload;
}

export async function listIncidents(user, mine = false) {
  if (!user) throw new Error("Sign in to access incident reports.");
  try {
    const payload = await apiRequest(user, `/incidents${mine ? "?mine=true" : ""}`);
    return payload.incidents || [];
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
  try {
    const payload = await apiRequest(user, "/incidents", {
      method: "POST",
      body: JSON.stringify({
        type: incident.type,
        priority: incident.priority,
        building: String(incident.building),
        description: incident.desc.trim(),
        latitude: incident.lat ?? null,
        longitude: incident.lng ?? null,
        accuracyMeters: incident.accuracy ?? null,
        campusVerified: incident.campusVerified ?? null,
      }),
    });
    return payload.incident;
  } catch (error) {
    fail(error, "Incident report could not be saved.");
  }
}

export async function activateSOS(user, position) {
  if (!position?.coords) throw new Error("Location access is required to send an SOS.");
  const { latitude, longitude, accuracy } = position.coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error("Your device did not return a valid location.");
  return apiRequest(user, "/sos", {
    method: "POST",
    body: JSON.stringify({ latitude, longitude, accuracyMeters: accuracy }),
  });
}

export async function setResponderPresence(user, available, coordinates = {}) {
  return apiRequest(user, "/responders/presence", {
    method: "PUT",
    body: JSON.stringify({ available, ...coordinates }),
  });
}

export async function registerPushToken(user, token) {
  return apiRequest(user, "/notifications/tokens", { method: "POST", body: JSON.stringify({ token }) });
}

export async function removePushToken(user, token) {
  return apiRequest(user, "/notifications/tokens", { method: "DELETE", body: JSON.stringify({ token }) });
}

export async function getDashboardAnalytics(user) {
  return apiRequest(user, "/dashboard/analytics");
}

export async function sendCampusAlert(user, alert) {
  return apiRequest(user, "/alerts", { method: "POST", body: JSON.stringify(alert) });
}

export async function updateIncident(user, update) {
  if (!user || !["admin", "responder"].includes(user.role)) {
    throw new Error("Only admins or assigned responders can update incident reports.");
  }
  if (typeof update.id !== "string" || !STATUSES.has(update.status)) throw new Error("Provide a valid incident and status.");
  if (user.role === "responder" && !["ACKNOWLEDGED", "ON_SCENE", "RESOLVED"].includes(update.status)) {
    throw new Error("Responders may acknowledge, mark on scene, or resolve assigned incidents.");
  }
  try {
    const payload = await apiRequest(user, `/incidents/${encodeURIComponent(update.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: update.status }),
    });
    return payload.incident;
  } catch (error) {
    fail(error, "Incident update could not be saved.");
  }
}

export async function listResponders(user) {
  if (!user || user.role !== "admin") throw new Error("Admin access is required to view responders.");
  try {
    const payload = await apiRequest(user, "/responders");
    return payload.responders || [];
  } catch (error) {
    fail(error, "Could not load the responder roster.");
  }
}

export async function assignIncident(user, incidentId, responder) {
  if (!user || user.role !== "admin") throw new Error("Admin access is required to dispatch responders.");
  if (!incidentId || !responder?.uid || !responder?.name) throw new Error("Choose a valid responder.");
  try {
    const payload = await apiRequest(user, `/incidents/${encodeURIComponent(incidentId)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "TEAM_DISPATCHED", responder: { uid: responder.uid } }),
    });
    return payload.incident;
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
