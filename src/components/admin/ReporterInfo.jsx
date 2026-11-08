import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, EyeOff, UserRound, X } from "lucide-react";
import { BD, GREEN, GREENL, MID, NAVY, NK, PAPER, RED, SL, WHITE } from "../../constants.js";
import { getIncidentReporter } from "../../adminApi.js";
import IncidentEmergencyContacts from "../IncidentEmergencyContacts.jsx";

const ROLE_LABEL = { student: "Student", staff: "Staff", responder: "Responder", admin: "Administrator" };

function formatDate(value) {
  return value ? new Date(value).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function ReporterProfileDialog({ incident, authUser, onClose }) {
  const [reporter, setReporter] = useState(null);
  const [error, setError] = useState("");
  const closeRef = useRef(null);

  useEffect(() => {
    let active = true;
    getIncidentReporter(authUser, incident.id)
      .then(result => { if (active) setReporter(result); })
      .catch(loadError => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, [authUser, incident.id]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = event => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div role="presentation" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,20,45,0.45)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-labelledby="reporter-dialog-title" onClick={event => event.stopPropagation()} style={{ background: WHITE, borderRadius: 12, width: "min(520px, 100%)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(10,20,45,0.3)" }}>
        <div style={{ background: NAVY, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderRadius: "12px 12px 0 0" }}>
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: 1.5, textTransform: "uppercase" }}>Reporter of {incident.reference || incident.id}</div>
            <div id="reporter-dialog-title" style={{ fontSize: 18, fontWeight: 700, color: WHITE, fontFamily: "'IBM Plex Serif',serif", marginTop: 4 }}>{reporter?.name || incident.reporter}</div>
            {reporter && <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>{reporter.email}</div>}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close reporter profile" style={{ background: "none", border: 0, color: WHITE, cursor: "pointer", padding: 4 }}><X size={20} aria-hidden="true" /></button>
        </div>
        <div style={{ padding: "16px 18px" }}>
          {error ? <p role="alert" style={{ color: RED, fontSize: 13 }}>{error}</p>
            : !reporter ? <p role="status" style={{ color: SL, fontSize: 13 }}>Loading profile…</p>
              : (
                <>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                    {reporter.emailVerified && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", background: GREENL, color: GREEN, borderRadius: 4, fontSize: 11, fontWeight: 700 }}><BadgeCheck size={13} aria-hidden="true" /> Verified UMP email</span>}
                    {reporter.status !== "active" && <span style={{ padding: "3px 9px", background: `${RED}14`, color: RED, borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{reporter.status === "banned" ? `Banned until ${formatDate(reporter.suspendedUntil)}` : "Account disabled"}</span>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      ["Role", ROLE_LABEL[reporter.portal] || reporter.role || "—"],
                      ["Reports filed", reporter.incidentsReported],
                      ["Faculty", reporter.faculty || "—"],
                      ["Department", reporter.department || "—"],
                      ["Year of study", reporter.year || "—"],
                      ["Member since", formatDate(reporter.createdAt)],
                      ["Last sign-in", formatDate(reporter.lastSignInAt)],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background: PAPER, borderRadius: 6, padding: "8px 10px" }}>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: MID, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: NK, marginTop: 3 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: MID, textTransform: "uppercase", letterSpacing: 1, margin: "16px 0 0" }}>Emergency contacts</div>
                  <IncidentEmergencyContacts incident={incident} user={authUser} />
                  <p style={{ fontSize: 11, color: MID, marginTop: 14 }}>Opening this profile and its emergency contacts is recorded on the incident timeline.</p>
                </>
              )}
        </div>
      </div>
    </div>
  );
}

// Shows who filed a report. Anonymous reports are labelled as such; reports from
// verified accounts show the reporter's name and, for admins, a profile link.
export default function ReporterInfo({ incident, authUser, canViewProfile = false, compact = false }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  if (incident.isAnonymous) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: compact ? "1px 7px" : "3px 9px", background: PAPER, color: SL, borderRadius: 4, fontSize: compact ? 10.5 : 12, fontWeight: 700 }}>
        <EyeOff size={compact ? 12 : 14} aria-hidden="true" /> Anonymous{incident.isSOS ? " SOS" : " report"}
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: compact ? 11.5 : 13, fontWeight: 600, color: NK }}>
        <UserRound size={compact ? 12 : 14} aria-hidden="true" /> {incident.reporter}
        <BadgeCheck size={compact ? 12 : 14} color={GREEN} aria-label="Verified account" />
      </span>
      {canViewProfile && !compact && (
        <button type="button" onClick={() => setOpen(true)} style={{ padding: "4px 10px", border: `1px solid ${BD}`, borderRadius: 5, background: WHITE, color: NAVY, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>View profile</button>
      )}
      {open && <ReporterProfileDialog incident={incident} authUser={authUser} onClose={close} />}
    </span>
  );
}
