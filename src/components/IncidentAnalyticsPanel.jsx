import { useEffect, useState } from "react";
import { getDashboardAnalytics } from "../incidentApi.js";

function Bars({ title, values }) {
  const entries = Object.entries(values || {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  return <section style={{ background: "#fff", border: "1px solid #d8dee8", borderRadius: 9, padding: 16 }}>
    <h3 style={{ fontSize: 14, margin: "0 0 12px", color: "#202b46" }}>{title}</h3>
    {entries.length ? entries.map(([label, value]) => <div key={label} style={{ display: "grid", gridTemplateColumns: "105px 1fr 34px", alignItems: "center", gap: 8, margin: "8px 0", fontSize: 12 }}>
      <span>{label.replaceAll("_", " ")}</span><span style={{ height: 9, background: "#edf0f5", borderRadius: 9, overflow: "hidden" }}><span style={{ display: "block", width: `${Math.max(3, value / max * 100)}%`, height: "100%", background: "#a51c30" }} /></span><strong>{value}</strong>
    </div>) : <p style={{ color: "#68738a", fontSize: 12 }}>No records in this sample.</p>}
  </section>;
}

export default function IncidentAnalyticsPanel({ user }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getDashboardAnalytics(user).then(result => { if (active) setReport(result); }).catch(requestError => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [user]);

  if (error) return <div role="alert" style={{ padding: 20, color: "#a51c30" }}>{error}</div>;
  if (!report) return <div role="status" style={{ padding: 20 }}>Loading incident analytics…</div>;
  return <div style={{ maxWidth: 1320, margin: "0 auto", padding: "24px 3% 50px" }}>
    <h2 style={{ color: "#202b46", marginBottom: 5 }}>Incident analytics</h2>
    <p style={{ color: "#68738a", fontSize: 12, marginBottom: 18 }}>
      Based on {report.sampledIncidents} most recent incident records{report.capped ? " (sample capped at 5,000)" : ""}. Mean time from report to responder assignment is not a measure of arrival time.
    </p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginBottom: 14 }}>
      <div style={{ background: "#fff", border: "1px solid #d8dee8", borderRadius: 9, padding: 16 }}><div style={{ color: "#68738a", fontSize: 11 }}>Assigned reports</div><strong style={{ display: "block", fontSize: 24, marginTop: 6 }}>{report.assignedCount}</strong></div>
      <div style={{ background: "#fff", border: "1px solid #d8dee8", borderRadius: 9, padding: 16 }}><div style={{ color: "#68738a", fontSize: 11 }}>Mean time to assignment</div><strong style={{ display: "block", fontSize: 24, marginTop: 6 }}>{report.averageMinutesToAssignment == null ? "—" : `${report.averageMinutesToAssignment} min`}</strong></div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 12 }}>
      <Bars title="By status" values={report.byStatus} /><Bars title="By priority" values={report.byPriority} /><Bars title="By incident type" values={report.byType} />
    </div>
  </div>;
}
