import { useState } from "react";
import { getIncidentEmergencyContacts } from "../incidentApi.js";

export default function IncidentEmergencyContacts({ incident, user }) {
  const [contacts, setContacts] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  if (user.role === "responder" && ["RESOLVED", "CLOSED"].includes(incident.status)) return null;

  async function toggleContacts() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (!loaded && incident.reportedBy) {
      setLoading(true);
      setError("");
      try {
        setContacts(await getIncidentEmergencyContacts(user, incident.id));
        setLoaded(true);
      } catch (issue) {
        setError(issue.message || "Could not load emergency contacts.");
      } finally {
        setLoading(false);
      }
    }
    setExpanded(true);
  }

  return (
    <section style={{ marginTop: 10 }}>
      <button
        type="button"
        onClick={toggleContacts}
        disabled={loading}
        style={{ padding: "7px 10px", border: "1px solid #D9DEE8", borderRadius: 5, background: "#fff", color: "#172B58", fontWeight: 700, cursor: loading ? "wait" : "pointer" }}
      >
        {loading ? "Loading contacts…" : expanded ? "Hide emergency contacts" : "View emergency contacts"}
      </button>
      {expanded && (
        <div aria-live="polite" style={{ marginTop: 8, padding: 10, background: "#F5F7FA", borderRadius: 6, fontSize: 12 }}>
          {error ? <p role="alert" style={{ color: "#9B1C1C" }}>{error}</p>
            : !incident.reportedBy ? <p>Anonymous report — no profile or emergency contacts are linked.</p>
              : contacts.length ? contacts.map((contact, index) => (
                <p key={`${contact.phone}-${index}`} style={{ margin: index ? "8px 0 0" : 0 }}>
                  <strong>{contact.name}</strong> ({contact.relationship}) · <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                </p>
              )) : <p>No emergency contacts are on file.</p>}
        </div>
      )}
    </section>
  );
}
