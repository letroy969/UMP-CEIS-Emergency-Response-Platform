import { useEffect, useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { BD, MID, NAVY, NK, RED, REDL, SL, STATUS_LABEL, WHITE } from "../../constants.js";
import { postIncidentUpdate, subscribeIncidentEvents } from "../../incidentApi.js";

const EVENT_LABEL = {
  INCIDENT_CREATED: "Report submitted",
  SOS_CREATED: "SOS raised",
  RESPONDER_AUTO_DISPATCHED: "Auto-dispatched to nearest responder",
  RESPONDER_ACCEPTED_SOS: "SOS accepted",
  RESPONDER_ASSIGNED: "Responder assigned",
  STATUS_CHANGED: "Status changed",
  RESPONDER_UPDATE: "Update",
  BACKUP_REQUESTED: "Backup requested",
  RESPONDER_RELEASED: "Handed back",
  EVIDENCE_ATTACHED: "Evidence attached",
};
// Access-audit events are for administrators; responders see the operational trail.
const HIDDEN = new Set(["EVIDENCE_VIEW_LINK_ISSUED", "EMERGENCY_CONTACTS_VIEWED", "MEDICAL_INFO_VIEWED", "REPORTER_PROFILE_VIEWED"]);

export default function IncidentUpdates({ incident, user }) {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState("");
  const [notice, setNotice] = useState("");
  const closed = ["RESOLVED", "CLOSED"].includes(incident.status);

  useEffect(() => {
    setEvents([]);
    return subscribeIncidentEvents(incident.id, setEvents, subscribeError => setError(subscribeError.message));
  }, [incident.id]);

  async function send(kind) {
    const text = message.trim();
    if (kind === "note" && text.length < 2) return;
    if (kind === "backup" && !window.confirm("Request backup? Administrators and every on-duty responder will be alerted.")) return;
    setSending(kind);
    setError("");
    setNotice("");
    try {
      const result = await postIncidentUpdate(user, incident.id, { kind, message: text || undefined });
      setMessage("");
      setNotice(kind === "backup" ? `Backup requested. ${result.alerted} people alerted.` : "Update posted for the admin team.");
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setSending("");
    }
  }

  const visible = events.filter(event => !HIDDEN.has(event.event));

  return (
    <section aria-label="Incident updates" style={{ marginTop: 14 }}>
      <h3 style={{ fontSize: 13, color: NK, margin: "0 0 8px" }}>Updates & timeline</h3>
      {!closed && (
        <div style={{ marginBottom: 12 }}>
          <label htmlFor={`update-${incident.id}`} style={{ fontSize: 11.5, color: MID, fontWeight: 700 }}>Post an update for the admin team</label>
          <textarea
            id={`update-${incident.id}`}
            value={message}
            maxLength={500}
            rows={2}
            onChange={event => setMessage(event.target.value)}
            placeholder="e.g. Patient conscious, breathing. Ambulance requested. Area cordoned off."
            style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 10px", border: `1px solid ${BD}`, borderRadius: 6, fontSize: 13, fontFamily: "inherit", resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => send("note")} disabled={sending !== "" || message.trim().length < 2} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 13px", background: NAVY, color: WHITE, border: 0, borderRadius: 6, fontWeight: 700, cursor: "pointer", opacity: sending !== "" || message.trim().length < 2 ? 0.55 : 1 }}>
              <Send size={14} aria-hidden="true" />{sending === "note" ? "Posting…" : "Post update"}
            </button>
            <button type="button" onClick={() => send("backup")} disabled={sending !== ""} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 13px", background: WHITE, color: RED, border: `1.5px solid ${RED}`, borderRadius: 6, fontWeight: 800, cursor: "pointer" }}>
              <Megaphone size={14} aria-hidden="true" />{sending === "backup" ? "Requesting…" : "Request backup"}
            </button>
          </div>
          {notice && <p role="status" style={{ fontSize: 12, color: "#1B6B3A", margin: "6px 0 0" }}>{notice}</p>}
        </div>
      )}
      {error && <p role="alert" style={{ fontSize: 12, color: RED, background: REDL, padding: 8, borderRadius: 6 }}>{error}</p>}
      <ol style={{ listStyle: "none", margin: 0, padding: 0, borderLeft: `2px solid ${BD}` }}>
        {[...visible].reverse().map(event => (
          <li key={event.id} style={{ position: "relative", padding: "0 0 11px 14px" }}>
            <span aria-hidden="true" style={{ position: "absolute", left: -6, top: 4, width: 10, height: 10, borderRadius: "50%", background: event.event === "BACKUP_REQUESTED" ? RED : NAVY }} />
            <div style={{ fontSize: 12.5, fontWeight: 700, color: event.event === "BACKUP_REQUESTED" ? RED : NK }}>
              {EVENT_LABEL[event.event] || event.event.replaceAll("_", " ").toLowerCase()}
              {event.status && ["STATUS_CHANGED", "RESPONDER_ASSIGNED"].includes(event.event) && <span style={{ fontWeight: 500, color: SL }}> · {STATUS_LABEL[event.status] || event.status}</span>}
            </div>
            {event.message && <div style={{ fontSize: 12.5, color: NK, whiteSpace: "pre-wrap", margin: "2px 0" }}>{event.message}</div>}
            <div style={{ fontSize: 11, color: MID }}>
              {event.createdAt ? new Date(event.createdAt).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" }) : ""}
              {event.actorName ? ` · ${event.actorUid === user.uid ? "You" : event.actorName}` : event.actorUid === user.uid ? " · You" : event.actorUid === "system" ? " · System" : ""}
            </div>
          </li>
        ))}
        {!error && visible.length === 0 && <li style={{ paddingLeft: 14, fontSize: 12, color: MID }}>No updates yet.</li>}
      </ol>
    </section>
  );
}
