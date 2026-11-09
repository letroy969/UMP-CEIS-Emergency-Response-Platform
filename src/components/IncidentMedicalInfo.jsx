import { useState } from "react";
import { AlertTriangle, HeartPulse } from "lucide-react";
import { getIncidentMedicalInfo } from "../incidentApi.js";
import {
  ACCESS_NEEDS,
  ALLERGY_STATUS,
  ALLERGY_TYPES,
  CONDITION_STATUS,
  criticalAlerts,
  DEVICES,
  FREQUENCIES,
  labelOf,
  SEVERITIES,
} from "../medical/medicalProfile.js";

const yesNo = value => (value === "yes" ? "Yes" : value === "no" ? "No" : "");

const filled = value => !(value == null || value === "" || (Array.isArray(value) && !value.length));

// rows: [label, value] pairs. Empty values are skipped, and a section with no
// filled rows is not rendered at all.
function Section({ title, rows }) {
  const visible = rows.filter(([, value]) => filled(value));
  if (!visible.length) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: "#5B6577", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{title}</div>
      {visible.map(([label, value], index) => (
        <div key={`${label}-${index}`} style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 8, padding: "3px 0", fontSize: 12 }}>
          <span style={{ color: "#5B6577" }}>{label}</span>
          <span style={{ color: "#152033", whiteSpace: "pre-wrap" }}>{Array.isArray(value) ? value.join(", ") : value}</span>
        </div>
      ))}
    </div>
  );
}

function MedicalDetails({ medical }) {
  const { allergies: a, conditions: c, medication: m, accessibility: s, instructions: i } = medical;
  const alerts = criticalAlerts(medical);
  return (
    <div>
      {alerts.length > 0 && (
        <div role="alert" style={{ display: "flex", gap: 8, padding: 10, background: "#FDECEC", border: "1px solid #F2C4BD", borderRadius: 6, marginBottom: 6 }}>
          <AlertTriangle size={16} color="#9B1C1C" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: "#7A1414", fontWeight: 700 }}>
            {alerts.map(alert => <li key={alert}>{alert}</li>)}
          </ul>
        </div>
      )}
      <Section title="Emergency instructions" rows={[
        ["Responders should know", i.needs],
        ["Precautions", i.precautions],
        ["Avoid", i.avoid],
        ["Additional", i.additional],
      ]} />
      <Section title="Allergies" rows={[
        ["Known allergies", a.has && labelOf(ALLERGY_STATUS, a.has)],
        ["Type", a.types.map(type => labelOf(ALLERGY_TYPES, type))],
        ["Allergens", a.allergens],
        ["Severity", a.severity && labelOf(SEVERITIES, a.severity)],
        ["Reactions", a.reactions],
        ["Precautions", a.precautions],
      ]} />
      <Section title="Medication" rows={[
        ["Taking medication", yesNo(m.taking)],
        ...m.items.map((item, index) => [
          `Medication ${index + 1}`,
          [item.name, item.dosage, item.frequency === "other" ? item.frequencyOther : item.frequency && labelOf(FREQUENCIES, item.frequency), item.reason && `for ${item.reason}`].filter(Boolean).join(" · "),
        ]),
        ["Carries emergency meds", yesNo(m.carriesEmergency)],
        ["Emergency medication", m.emergencyType],
        ["Kept", m.keptWhere],
      ]} />
      <Section title="Medical conditions" rows={[
        ["Existing conditions", c.has && labelOf(CONDITION_STATUS, c.has)],
        ["Conditions", c.conditions],
        ["History", c.history],
        ["Seizures or fainting", yesNo(c.seizuresOrFainting)],
        ["Severe emergencies", c.severeEmergencies],
        ["Additional", c.additional],
      ]} />
      <Section title="Accessibility" rows={[
        ["Needs assistance", yesNo(s.needsAssistance)],
        ["Requirements", s.needs.map(need => (need === "other" && s.otherNeed ? s.otherNeed : labelOf(ACCESS_NEEDS, need)))],
        ["Assistive device", s.devices.map(device => (device === "other" && s.otherDevice ? s.otherDevice : labelOf(DEVICES, device)))],
        ["Evacuation help", yesNo(s.evacuationHelp)],
        ["Communicate by", s.communication],
        ["Instructions", s.instructions],
      ]} />
    </div>
  );
}

// On-demand view of a reporter's medical & accessibility details for admins and
// the responders handling the incident. Each open is logged on the incident timeline.
export default function IncidentMedicalInfo({ incident, user }) {
  const [state, setState] = useState({ status: "idle", data: null, error: "" });
  const [expanded, setExpanded] = useState(false);
  if (user.role === "responder" && ["RESOLVED", "CLOSED"].includes(incident.status)) return null;
  if (incident.isAnonymous || !incident.reportedBy) return null;

  async function toggle() {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (state.status === "loaded") return;
    setState({ status: "loading", data: null, error: "" });
    try {
      setState({ status: "loaded", data: await getIncidentMedicalInfo(user, incident.id), error: "" });
    } catch (error) {
      setState({ status: "error", data: null, error: error.message || "Could not load medical details." });
    }
  }

  return (
    <section style={{ marginTop: 10 }}>
      <button type="button" onClick={toggle} disabled={state.status === "loading"} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 10px", border: "1px solid #D9DEE8", borderRadius: 5, background: "#fff", color: "#172B58", fontWeight: 700, cursor: state.status === "loading" ? "wait" : "pointer" }}>
        <HeartPulse size={15} aria-hidden="true" />
        {state.status === "loading" ? "Loading medical details…" : expanded ? "Hide medical & accessibility" : "View medical & accessibility"}
      </button>
      {expanded && state.status !== "loading" && (
        <div aria-live="polite" style={{ marginTop: 8, padding: 10, background: "#F5F7FA", borderRadius: 6 }}>
          {state.status === "error" ? <p role="alert" style={{ color: "#9B1C1C", fontSize: 12, margin: 0 }}>{state.error}</p>
            : state.data?.medical ? (
              <>
                <MedicalDetails medical={state.data.medical} />
                <p style={{ fontSize: 10.5, color: "#5B6577", margin: "10px 0 0" }}>Self-reported by the user{state.data.updatedAt ? `, last updated ${new Date(state.data.updatedAt).toLocaleDateString("en-ZA")}` : ""}. Shared with their consent; this view is logged.</p>
              </>
            ) : <p style={{ fontSize: 12, color: "#5B6577", margin: 0 }}>This person has not provided medical or accessibility details.</p>}
        </div>
      )}
    </section>
  );
}
