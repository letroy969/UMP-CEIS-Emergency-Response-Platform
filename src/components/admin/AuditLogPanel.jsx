import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { BD, GREEN, MID, NAVY, NK, ORANGE, PAPER, RED, REDL, SL, WHITE } from "../../constants.js";
import { listAuditLog } from "../../adminApi.js";

const ACTIONS = {
  USER_ROLE_CHANGED: ["Role changed", NAVY],
  USER_SUSPENDED: ["Account disabled", RED],
  USER_TEMP_BANNED: ["Temporary ban", ORANGE],
  USER_REACTIVATED: ["Account reactivated", GREEN],
  PASSWORD_RESET_SENT: ["Password reset sent", NAVY],
  USER_DELETED: ["Account deleted", RED],
  ACCESS_REQUEST_APPROVED: ["Access request approved", GREEN],
  ACCESS_REQUEST_REJECTED: ["Access request rejected", ORANGE],
  CAMPUS_ALERT_SENT: ["Campus alert sent", ORANGE],
};

function describe(entry) {
  const d = entry.details || {};
  switch (entry.action) {
    case "USER_ROLE_CHANGED": return `${d.from || "none"} → ${d.to}`;
    case "USER_SUSPENDED": return d.reason ? `Reason: ${d.reason}` : "No reason given";
    case "USER_TEMP_BANNED": return `Until ${d.until ? new Date(d.until).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" }) : "?"}${d.reason ? ` · Reason: ${d.reason}` : ""}`;
    case "PASSWORD_RESET_SENT": return d.signOutEverywhere ? "Signed out of all devices" : "Sessions kept";
    case "USER_DELETED": return `Was ${d.role || "no role"}${d.retainedIncidentReports ? ` · ${d.retainedIncidentReports} incident report(s) kept` : ""}`;
    case "ACCESS_REQUEST_APPROVED":
    case "ACCESS_REQUEST_REJECTED": return `Requested ${d.requestedRole}`;
    case "CAMPUS_ALERT_SENT": return `"${d.title}" to ${d.recipientCount} account(s)`;
    default: return "";
  }
}

export default function AuditLogPanel({ authUser }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setEntries(await listAuditLog(authUser, 500));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(
    () => actionFilter === "all" ? entries : entries.filter(entry => entry.action === actionFilter),
    [entries, actionFilter],
  );

  return (
    <section style={{ animation: "fadeIn .35s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: "'IBM Plex Serif',serif", fontSize: 24, color: NK, marginBottom: 6 }}>Admin audit log</h2>
          <p style={{ fontSize: 14, color: SL, maxWidth: 720 }}>Who changed accounts, reviewed access requests or sent campus alerts, and when. Entries cannot be edited or deleted from the app. Dispatch and status changes are shown on each incident&apos;s timeline.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select aria-label="Filter audit log by action" value={actionFilter} onChange={event => setActionFilter(event.target.value)} style={{ padding: "8px 12px", border: `1.5px solid ${BD}`, borderRadius: 6, fontSize: 13, color: NK, background: WHITE }}>
            <option value="all">All actions</option>
            {Object.entries(ACTIONS).map(([value, [label]]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="button" onClick={load} disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", border: `1px solid ${BD}`, borderRadius: 6, background: WHITE, color: NAVY, fontWeight: 700, cursor: "pointer" }}>
            <RefreshCw size={15} aria-hidden="true" /> {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>
      {error && <div role="alert" style={{ background: REDL, color: RED, padding: 12, borderRadius: 7, marginBottom: 12 }}>{error}</div>}
      <div style={{ background: WHITE, border: `1px solid ${BD}`, borderRadius: 10, overflow: "hidden" }}>
        {visible.map(entry => {
          const [label, color] = ACTIONS[entry.action] || [entry.action, MID];
          return (
            <div key={entry.id} style={{ display: "grid", gridTemplateColumns: "170px 190px minmax(0,1fr)", gap: 14, padding: "12px 16px", borderBottom: `1px solid ${BD}`, alignItems: "start" }}>
              <div style={{ fontSize: 12, color: MID, fontFamily: "'IBM Plex Mono',monospace" }}>{entry.createdAt ? new Date(entry.createdAt).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" }) : "—"}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color }}>{label}</div>
              <div style={{ fontSize: 12.5, color: SL, lineHeight: 1.5 }}>
                <div><strong style={{ color: NK }}>{entry.actorName}</strong>{entry.targetUid && <> → {entry.targetName || entry.targetEmail || entry.targetUid}{entry.targetEmail && entry.targetName ? ` (${entry.targetEmail})` : ""}</>}</div>
                <div style={{ color: MID }}>{describe(entry)}</div>
              </div>
            </div>
          );
        })}
        {!loading && visible.length === 0 && <div style={{ padding: 24, color: SL, fontSize: 13, background: PAPER }}>No audit entries yet. Admin actions taken from now on will appear here.</div>}
      </div>
    </section>
  );
}
