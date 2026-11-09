import { useEffect, useState } from "react";
import { FileText, MapPin, UserRound } from "lucide-react";
import { INC_TYPES, PRIORITY } from "../../constants.js";
import { subscribeIncidentEvents } from "../../incidentApi.js";
import IncidentEvidenceList from "../../components/IncidentEvidenceList.jsx";
import { Page, StatusSteps } from "../ui.jsx";
import { REPORT_STEP_LABELS, REPORT_STEPS, reportStatusChip } from "./reportStatus.js";

// What the person who reported sees on their timeline. Responder notes, backup
// requests and access-audit entries are for the response team only.
const VISIBLE_EVENTS = {
  INCIDENT_CREATED: "Report received",
  SOS_CREATED: "SOS received",
  RESPONDER_AUTO_DISPATCHED: "Nearest responder dispatched",
  RESPONDER_ACCEPTED_SOS: "A responder accepted your SOS",
  RESPONDER_ASSIGNED: "Responder assigned",
  STATUS_CHANGED: "Status updated",
  EVIDENCE_ATTACHED: "Photo or video added",
};

export default function ReportDetailPage({ report, authUser, onBack }) {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => subscribeIncidentEvents(report.id, setEvents, issue => setError(issue.message)), [report.id]);

  const type = INC_TYPES[report.type];
  const TypeIcon = report.isSOS ? null : type?.icon || FileText;
  const step = report.status === "CLOSED" ? "RESOLVED" : report.status;
  const chip = reportStatusChip(report.status);
  const timeline = events.filter(event => VISIBLE_EVENTS[event.event]).reverse();

  return (
    <Page title={report.reference || "Report"} onBack={onBack}>
      <div className="m-card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span className="m-row-icon" style={{ width: 44, height: 44, borderRadius: 12, background: report.isSOS ? "var(--m-red)" : type?.color || "var(--m-tint)" }}>
            {TypeIcon ? <TypeIcon size={22} aria-hidden="true" /> : <b style={{ fontSize: 12 }}>SOS</b>}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 700 }}>{report.isSOS ? "SOS alert" : type?.label || "Incident"}</div>
            <div className="m-muted">{report.createdAt ? new Date(report.createdAt).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" }) : report.time}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <span className={chip.className}>{chip.label}</span>
              {PRIORITY[report.priority] && <span className="m-chip" style={{ color: PRIORITY[report.priority].color }}>{report.priority} · {PRIORITY[report.priority].label}</span>}
            </div>
          </div>
        </div>
        <StatusSteps steps={REPORT_STEPS} labels={REPORT_STEP_LABELS} current={step} />
      </div>

      <div className="m-group" style={{ marginBottom: 12 }}>
        <div className="m-row" style={{ cursor: "default" }}>
          <span className="m-row-icon" style={{ background: "#1A2766" }}><UserRound size={17} aria-hidden="true" /></span>
          <span className="m-row-main"><span className="m-row-label">{report.responderUid ? report.responder : "Waiting for a responder"}</span><span className="m-row-detail" style={{ display: "block" }}>Responder</span></span>
        </div>
        <div className="m-row" style={{ cursor: "default" }}>
          <span className="m-row-icon" style={{ background: "#34C759" }}><MapPin size={17} aria-hidden="true" /></span>
          <span className="m-row-main"><span className="m-row-label">{report.loc}</span><span className="m-row-detail" style={{ display: "block" }}>{report.accuracy ? `GPS ±${Math.round(report.accuracy)} m` : "Location"}</span></span>
        </div>
      </div>

      {report.desc && <div className="m-card" style={{ marginBottom: 12, whiteSpace: "pre-wrap", fontSize: 15.5 }}>{report.desc}</div>}

      {report.attachments?.length > 0 && <div className="m-card m-embed" style={{ marginBottom: 12 }}><IncidentEvidenceList incident={report} user={authUser} /></div>}

      <h2 className="m-section-title">Updates</h2>
      {error && <div className="m-alert m-alert--warn">{error}</div>}
      <div className="m-card">
        {timeline.length === 0 ? <p className="m-muted" style={{ margin: 0 }}>No updates yet.</p> : (
          <ol style={{ listStyle: "none", margin: 0, padding: 0, borderLeft: "2px solid var(--m-sep)" }}>
            {timeline.map(event => (
              <li key={event.id} style={{ position: "relative", padding: "0 0 14px 16px" }}>
                <span aria-hidden="true" style={{ position: "absolute", left: -6, top: 5, width: 10, height: 10, borderRadius: "50%", background: "var(--m-tint)" }} />
                <div style={{ fontWeight: 600, fontSize: 15 }}>{VISIBLE_EVENTS[event.event]}{event.event === "STATUS_CHANGED" && event.status ? ` · ${REPORT_STEP_LABELS[event.status === "CLOSED" ? "RESOLVED" : event.status] || event.status}` : ""}</div>
                <div className="m-muted">{event.createdAt ? new Date(event.createdAt).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" }) : ""}</div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Page>
  );
}
