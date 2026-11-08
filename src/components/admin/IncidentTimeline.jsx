import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../lib/firebase.js";
import { BD, MID, NK, SL, STATUS_LABEL } from "../../constants.js";

const EVENT_LABEL = {
  INCIDENT_CREATED: "Report submitted",
  SOS_CREATED: "SOS raised",
  RESPONDER_AUTO_DISPATCHED: "Nearest responder auto-dispatched",
  RESPONDER_ACCEPTED_SOS: "Responder accepted the SOS",
  RESPONDER_ASSIGNED: "Responder assigned",
  STATUS_CHANGED: "Status changed",
  EVIDENCE_ATTACHED: "Evidence attached",
  EVIDENCE_VIEW_LINK_ISSUED: "Evidence opened",
  EVIDENCE_AUTO_DELETED: "Evidence removed after 90 days",
  EMERGENCY_CONTACTS_VIEWED: "Emergency contacts viewed",
  REPORTER_PROFILE_VIEWED: "Reporter profile viewed",
};

function actorLabel(event, people) {
  if (event.actorUid === "system") return "System";
  if (event.actorUid === "anonymous") return "Anonymous visitor";
  return people[event.actorUid] || `User ${String(event.actorUid || "").slice(0, 6)}…`;
}

// Read-only audit trail of one incident. Admins may read events directly under
// the Firestore rules; writes only ever come from the API.
export default function IncidentTimeline({ incidentId, people = {} }) {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setEvents([]);
    setError("");
    return onSnapshot(
      query(collection(db, "incidents", incidentId, "events"), orderBy("createdAt", "asc")),
      snapshot => setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      snapshotError => setError(snapshotError.message || "The incident timeline could not be loaded."),
    );
  }, [incidentId]);

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: MID, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Timeline</div>
      {error && <div style={{ fontSize: 12, color: SL }}>{error}</div>}
      <ol style={{ listStyle: "none", margin: 0, padding: 0, borderLeft: `2px solid ${BD}` }}>
        {events.map(event => (
          <li key={event.id} style={{ position: "relative", padding: "0 0 12px 14px" }}>
            <span aria-hidden="true" style={{ position: "absolute", left: -6, top: 4, width: 10, height: 10, borderRadius: "50%", background: NK }} />
            <div style={{ fontSize: 12.5, fontWeight: 700, color: NK }}>
              {EVENT_LABEL[event.event] || event.event}
              {event.status && ["STATUS_CHANGED", "RESPONDER_ASSIGNED"].includes(event.event) && <span style={{ fontWeight: 500, color: SL }}> · {STATUS_LABEL[event.status] || event.status}</span>}
            </div>
            <div style={{ fontSize: 11.5, color: MID }}>
              {event.createdAt?.toDate ? event.createdAt.toDate().toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" }) : ""} · {actorLabel(event, people)}
              {event.responderUid && event.event !== "STATUS_CHANGED" && people[event.responderUid] && event.actorUid !== event.responderUid ? ` → ${people[event.responderUid]}` : ""}
            </div>
          </li>
        ))}
        {!error && events.length === 0 && <li style={{ paddingLeft: 14, fontSize: 12, color: MID }}>No events recorded.</li>}
      </ol>
    </div>
  );
}
