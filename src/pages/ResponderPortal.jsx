import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BellRing, CheckCircle2, ClipboardList, History, Map as MapIcon, Navigation, Phone, Siren, Undo2 } from "lucide-react";
import { NAVY, RED, REDL, GREEN, GREENL, GOLD, WHITE, PAPER, PAPER2, BD, NK, SL, MID, ORANGE, ORANGEL, LOGO, INC_TYPES, PRIORITY, STATUS_LABEL } from "../constants.js";
import { STYLES } from "./portalStyles.js";
import { claimSOS, releaseIncident, subscribeIncidents, subscribeOpenSOS, updateIncident } from "../incidentApi.js";
import IncidentEvidenceList from "../components/IncidentEvidenceList.jsx";
import IncidentEmergencyContacts from "../components/IncidentEmergencyContacts.jsx";
import IncidentMedicalInfo from "../components/IncidentMedicalInfo.jsx";
import PushNotificationsButton from "../components/PushNotificationsButton.jsx";
import ResponderMap from "../components/responder/ResponderMap.jsx";
import NavigationPanel from "../components/responder/NavigationPanel.jsx";
import IncidentUpdates from "../components/responder/IncidentUpdates.jsx";
import { useResponderLocation } from "../responder/useResponderLocation.js";
import { formatDistance, navigationSummary, navigationTarget } from "../maps/navigation.js";

const RESPONDER_PORTAL_BACKGROUND = new URL("../../Responder Background/Responderbackground.jpg", import.meta.url).href;
const CLOSED = ["RESOLVED", "CLOSED"];
const STEPS = ["TEAM_DISPATCHED", "ACKNOWLEDGED", "ON_SCENE", "RESOLVED"];
const NEXT = { TEAM_DISPATCHED: "ACKNOWLEDGED", ACKNOWLEDGED: "ON_SCENE", ON_SCENE: "RESOLVED" };
const NEXT_LABEL = { ACKNOWLEDGED: "Acknowledge — I'm on my way", ON_SCENE: "I'm on scene", RESOLVED: "Mark resolved" };

const card = { background: WHITE, border: `1px solid ${BD}`, borderRadius: 10 };
const minutesBetween = (a, b) => (a && b ? Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000)) : null);

function DistanceChip({ incident, position }) {
  const summary = navigationSummary(position, navigationTarget(incident));
  if (!summary) return null;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 5, background: `${NAVY}10`, color: NAVY, fontSize: 11.5, fontWeight: 700 }}><Navigation size={12} aria-hidden="true" />{summary.arrived ? "Here" : `${formatDistance(summary.meters)} ${summary.direction}`}</span>;
}

function Badges({ incident }) {
  const priority = PRIORITY[incident.priority] || PRIORITY.P3;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {incident.isSOS && <span style={{ padding: "4px 8px", borderRadius: 5, background: RED, color: WHITE, fontWeight: 800, fontSize: 11.5 }}>SOS</span>}
      <span style={{ padding: "4px 8px", borderRadius: 5, background: `${priority.color}14`, color: priority.color, fontWeight: 800, fontSize: 11.5 }}>{incident.priority}</span>
      <span style={{ padding: "4px 8px", borderRadius: 5, background: PAPER2, color: NAVY, fontWeight: 700, fontSize: 11.5 }}>{STATUS_LABEL[incident.status] || incident.status}</span>
    </div>
  );
}

function StatusStepper({ status }) {
  const current = STEPS.indexOf(status === "CLOSED" ? "RESOLVED" : status);
  return (
    <ol aria-label="Response progress" style={{ display: "grid", gridTemplateColumns: `repeat(${STEPS.length}, 1fr)`, gap: 4, listStyle: "none", padding: 0, margin: "12px 0" }}>
      {STEPS.map((step, index) => {
        const done = index <= current;
        return (
          <li key={step} aria-current={index === current ? "step" : undefined} style={{ textAlign: "center" }}>
            <div style={{ height: 6, borderRadius: 4, background: done ? (index === current ? NAVY : GREEN) : BD }} />
            <div style={{ fontSize: 11, marginTop: 5, color: done ? NK : MID, fontWeight: index === current ? 800 : 500 }}>{STATUS_LABEL[step]}</div>
          </li>
        );
      })}
    </ol>
  );
}

function IncidentDetail({ incident, user, position, locationError, onBack, onAdvance, updating, onRelease }) {
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [releasing, setReleasing] = useState(false);
  const next = NEXT[incident.status];
  const canRelease = ["TEAM_DISPATCHED", "ACKNOWLEDGED"].includes(incident.status);

  async function arrive() {
    if (incident.status === "TEAM_DISPATCHED") await onAdvance(incident, "ACKNOWLEDGED");
    await onAdvance(incident, "ON_SCENE");
  }

  async function release() {
    setReleasing(true);
    const ok = await onRelease(incident, reason.trim());
    setReleasing(false);
    if (ok) { setReleaseOpen(false); setReason(""); }
  }

  return (
    <article style={{ ...card, padding: 18, borderLeft: `5px solid ${incident.isSOS ? RED : PRIORITY[incident.priority]?.color || NAVY}` }}>
      <button type="button" onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 5, border: 0, background: "none", color: NAVY, fontWeight: 700, cursor: "pointer", padding: 0, marginBottom: 10 }}><ArrowLeft size={16} aria-hidden="true" />All assignments</button>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, color: MID, fontFamily: "'IBM Plex Mono',monospace" }}>{incident.reference || incident.id} · reported {incident.time}</div>
          <h2 style={{ fontSize: 20, color: NK, margin: "4px 0" }}>{incident.isSOS ? "SOS" : INC_TYPES[incident.type]?.label || "Incident"} — {incident.loc}</h2>
          <div style={{ fontSize: 12.5, color: SL }}>{incident.isAnonymous ? "Anonymous report" : `Reported by ${incident.reporter} (verified account)`}</div>
        </div>
        <Badges incident={incident} />
      </div>

      <StatusStepper status={incident.status} />
      {next && (
        <button type="button" disabled={updating} onClick={() => onAdvance(incident, next)} style={{ width: "100%", padding: "13px 16px", background: next === "RESOLVED" ? GREEN : NAVY, color: WHITE, border: 0, borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: updating ? "wait" : "pointer", opacity: updating ? 0.65 : 1 }}>
          {updating ? "Updating…" : NEXT_LABEL[next]}
        </button>
      )}
      {!next && <div style={{ display: "flex", alignItems: "center", gap: 6, padding: 10, background: GREENL, borderRadius: 7, color: GREEN, fontWeight: 700, fontSize: 13 }}><CheckCircle2 size={16} aria-hidden="true" />Resolved{incident.resolvedAt ? ` at ${new Date(incident.resolvedAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}` : ""}</div>}

      <p style={{ color: NK, fontSize: 14, lineHeight: 1.6, margin: "14px 0 6px" }}>{incident.desc || "No additional description supplied."}</p>

      {!CLOSED.includes(incident.status) && (
        <div className="ceis-responder-nav" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)", gap: 12, margin: "12px 0" }}>
          <ResponderMap incidents={[incident]} selectedId={incident.id} position={position} height={300} />
          <NavigationPanel incident={incident} position={position} locationError={locationError} onArrive={arrive} arriving={updating} />
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0" }}>
        <a href="tel:+27130020010" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 11px", border: `1px solid ${BD}`, borderRadius: 6, color: NAVY, fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}><Phone size={14} aria-hidden="true" />Campus Security</a>
        <a href="tel:10177" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 11px", border: `1px solid ${RED}55`, borderRadius: 6, color: RED, fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}><Phone size={14} aria-hidden="true" />EMS 10177</a>
      </div>

      <IncidentEvidenceList incident={incident} user={user} />
      <IncidentEmergencyContacts incident={incident} user={user} />
      <IncidentMedicalInfo incident={incident} user={user} />
      <IncidentUpdates incident={incident} user={user} />

      {canRelease && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${BD}` }}>
          {!releaseOpen ? (
            <button type="button" onClick={() => setReleaseOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 5, border: 0, background: "none", color: MID, fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 0 }}><Undo2 size={14} aria-hidden="true" />Can&apos;t attend? Hand this incident back</button>
          ) : (
            <div style={{ padding: 12, background: ORANGEL, borderRadius: 8 }}>
              <label htmlFor="release-reason" style={{ fontSize: 12.5, fontWeight: 700, color: NK }}>Why can&apos;t you attend? Admins are alerted to redispatch{incident.isSOS ? " and the SOS reopens for other responders" : ""}.</label>
              <textarea id="release-reason" value={reason} onChange={event => setReason(event.target.value)} maxLength={300} rows={2} style={{ display: "block", width: "100%", margin: "6px 0 8px", padding: "8px 10px", border: `1px solid ${BD}`, borderRadius: 6, fontFamily: "inherit", fontSize: 13 }} placeholder="e.g. Vehicle breakdown, already handling another emergency" />
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={release} disabled={releasing || reason.trim().length < 3} style={{ padding: "8px 13px", background: ORANGE, color: WHITE, border: 0, borderRadius: 6, fontWeight: 800, cursor: "pointer", opacity: releasing || reason.trim().length < 3 ? 0.55 : 1 }}>{releasing ? "Handing back…" : "Hand back"}</button>
                <button type="button" onClick={() => setReleaseOpen(false)} style={{ padding: "8px 13px", background: WHITE, color: NK, border: `1px solid ${BD}`, borderRadius: 6, fontWeight: 700, cursor: "pointer" }}>Keep it</button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function ResponderPortal({ user, authUser, onLogout }) {
  const [tab, setTab] = useState("active");
  const [selectedId, setSelectedId] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [openSOS, setOpenSOS] = useState([]);
  const [sosError, setSosError] = useState("");
  const [claimingId, setClaimingId] = useState("");
  const [newAssignment, setNewAssignment] = useState(null);
  const knownIds = useRef(null);

  const activeIncidents = useMemo(() => incidents.filter(incident => !CLOSED.includes(incident.status)), [incidents]);
  const history = useMemo(() => incidents.filter(incident => CLOSED.includes(incident.status)), [incidents]);
  const selected = incidents.find(incident => incident.id === selectedId) || openSOS.find(incident => incident.id === selectedId) || null;
  const needsPosition = Boolean(selected) || tab === "map" || (tab === "sos" && openSOS.length > 0) || (tab === "active" && activeIncidents.length > 0);
  const { onDuty, setOnDuty, position, error: locationError, lastSyncAt, syncError } = useResponderLocation(authUser, {
    navigating: needsPosition,
    busy: activeIncidents.length > 0,
  });

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeOpenSOS(
      authUser,
      rows => { if (active) { setOpenSOS(rows.filter(row => row.status === "NEW")); setSosError(""); } },
      issue => { if (active) setSosError(issue.message); },
    );
    return () => { active = false; unsubscribe(); };
  }, [authUser]);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeIncidents(
      authUser,
      rows => {
        if (!active) return;
        // Announce assignments that arrive while the portal is open.
        const activeRows = rows.filter(row => !CLOSED.includes(row.status));
        if (knownIds.current) {
          const fresh = activeRows.find(row => !knownIds.current.has(row.id));
          if (fresh) setNewAssignment(fresh);
        }
        knownIds.current = new Set(rows.map(row => row.id));
        setIncidents(rows);
        setLoading(false);
      },
      issue => { if (active) { setError(issue.message); setLoading(false); } },
    );
    return () => { active = false; unsubscribe(); };
  }, [authUser]);

  async function advanceIncident(incident, status) {
    setUpdatingId(incident.id);
    setError("");
    try {
      await updateIncident(authUser, { id: incident.id, status });
    } catch (issue) {
      setError(issue.message);
    } finally {
      setUpdatingId("");
    }
  }

  async function acceptSOS(incident) {
    setClaimingId(incident.id);
    setSosError("");
    try {
      await claimSOS(authUser, incident.id);
      knownIds.current?.add(incident.id); // it's ours; no "new assignment" banner
      setSelectedId(incident.id);
      setTab("active");
    } catch (issue) {
      setSosError(issue.message);
    } finally {
      setClaimingId("");
    }
  }

  async function handBack(incident, reason) {
    setError("");
    try {
      await releaseIncident(authUser, incident.id, reason);
      setSelectedId(null);
      return true;
    } catch (issue) {
      setError(issue.message);
      return false;
    }
  }

  function openIncident(id) {
    setSelectedId(id);
    setNewAssignment(null);
    if (incidents.some(incident => incident.id === id)) setTab("active");
  }

  async function signOut() {
    if (onDuty) setOnDuty(false);
    onLogout();
  }

  const resolvedToday = history.filter(incident => incident.resolvedAt && new Date(incident.resolvedAt).toDateString() === new Date().toDateString()).length;
  const sortedSOS = useMemo(() => [...openSOS].sort((a, b) => {
    const da = navigationSummary(position, navigationTarget(a))?.meters ?? Infinity;
    const db = navigationSummary(position, navigationTarget(b))?.meters ?? Infinity;
    return da - db;
  }), [openSOS, position]);

  const TABS = [
    ["active", ClipboardList, `My assignments (${activeIncidents.length})`],
    ["sos", Siren, `Open SOS (${openSOS.length})`],
    ["map", MapIcon, "Live map"],
    ["history", History, "History"],
  ];

  return (
    <main className="student-portal-shell" style={{ minHeight: "100vh", background: "transparent", fontFamily: "'IBM Plex Sans',sans-serif" }}>
      <style>{STYLES}{`.ceis-responder-nav{}@media(max-width:820px){.ceis-responder-nav{grid-template-columns:1fr!important}}`}</style>
      <div className="student-portal-background" aria-hidden="true"><img src={RESPONDER_PORTAL_BACKGROUND} alt="" /><div /></div>

      <header style={{ background: NAVY, borderBottom: `3px solid ${GOLD}`, color: WHITE, position: "sticky", top: 0, zIndex: 500 }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "10px 4%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={LOGO} alt="UMP" style={{ height: 34, objectFit: "contain", mixBlendMode: "lighten" }} />
            <div><div style={{ fontSize: 10, color: "rgba(255,255,255,.58)", letterSpacing: 1.5, textTransform: "uppercase" }}>Responder workspace</div><div style={{ fontSize: 15, fontWeight: 700 }}>{user.name}</div></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setOnDuty(!onDuty)} aria-pressed={onDuty} title={onDuty ? "You are visible to dispatch. Click to go off duty." : "Go on duty to receive SOS auto-dispatch and appear as available."} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 999, border: 0, background: onDuty ? GREEN : "rgba(255,255,255,.12)", color: WHITE, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
              <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: onDuty ? "#B8F5C9" : "rgba(255,255,255,.5)", boxShadow: onDuty ? "0 0 0 3px rgba(184,245,201,.35)" : "none" }} />
              {onDuty ? "On duty" : "Off duty"}
            </button>
            <PushNotificationsButton user={authUser} compact />
            <button type="button" onClick={signOut} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.18)", color: WHITE, borderRadius: 5, padding: "8px 13px", cursor: "pointer" }}>Sign out</button>
          </div>
        </div>
        <nav aria-label="Responder sections" style={{ background: WHITE, borderBottom: `1px solid ${BD}` }}>
          <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 4%", display: "flex", overflowX: "auto" }}>
            {TABS.map(([key, Icon, label]) => (
              <button key={key} type="button" onClick={() => { setTab(key); if (key !== "active" && key !== "map") setSelectedId(null); }} aria-current={tab === key ? "page" : undefined} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "11px 14px", background: "none", border: 0, borderBottom: `2px solid ${tab === key ? RED : "transparent"}`, color: tab === key ? RED : SL, fontWeight: tab === key ? 800 : 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
                <Icon size={16} aria-hidden="true" />{label}
                {key === "sos" && openSOS.length > 0 && <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: RED, animation: "blink 1.5s infinite" }} />}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 4% 60px" }}>
        {/* Duty status strip: tells the responder exactly how dispatch sees them. */}
        <div role="status" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 14px", borderRadius: 8, marginBottom: 14, background: onDuty ? GREENL : PAPER, border: `1px solid ${onDuty ? `${GREEN}40` : BD}`, fontSize: 13, color: NK }}>
          {onDuty ? (
            <>
              <strong style={{ color: GREEN }}>On duty.</strong>
              {activeIncidents.length > 0 ? "You're busy with an assignment, so SOS auto-dispatch will skip you; admins can still dispatch you." : "Sharing your location — you can be auto-dispatched to the nearest SOS."}
              <span style={{ color: MID }}>{syncError ? `⚠ ${syncError}` : lastSyncAt ? `Last update ${lastSyncAt.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}` : "Waiting for GPS…"}</span>
            </>
          ) : (
            <><strong>Off duty.</strong> Admins see you as unavailable and SOS auto-dispatch skips you. Your location is not shared. <button type="button" onClick={() => setOnDuty(true)} style={{ border: 0, background: "none", color: NAVY, fontWeight: 800, cursor: "pointer", textDecoration: "underline", padding: 0 }}>Go on duty</button></>
          )}
          {locationError && <span style={{ color: RED, flexBasis: "100%" }}>{locationError}</span>}
        </div>

        {newAssignment && (
          <div role="alert" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", padding: "12px 14px", marginBottom: 14, borderRadius: 8, background: REDL, border: `1px solid ${RED}40` }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: NK }}><BellRing size={18} color={RED} aria-hidden="true" /><strong>New assignment:</strong> {newAssignment.reference} · {newAssignment.loc}</span>
            <span style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => openIncident(newAssignment.id)} style={{ padding: "8px 13px", background: RED, color: WHITE, border: 0, borderRadius: 6, fontWeight: 800, cursor: "pointer" }}>Open & navigate</button>
              <button type="button" onClick={() => setNewAssignment(null)} style={{ padding: "8px 13px", background: WHITE, color: NK, border: `1px solid ${BD}`, borderRadius: 6, fontWeight: 700, cursor: "pointer" }}>Dismiss</button>
            </span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
          {[["Active assignments", activeIncidents.length, NAVY], ["Open SOS nearby", openSOS.length, RED], ["Resolved today", resolvedToday, GREEN], ["Total handled", history.length, MID]].map(([label, value, color]) => (
            <div key={label} style={{ ...card, padding: "12px 14px", borderTop: `3px solid ${color}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: MID, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: NK, fontFamily: "'IBM Plex Mono',monospace" }}>{value}</div>
            </div>
          ))}
        </div>

        {error && <div role="alert" style={{ background: REDL, color: RED, padding: 12, borderRadius: 7, marginBottom: 14 }}>{error}</div>}

        {tab === "active" && (
          selected && incidents.some(incident => incident.id === selected.id) ? (
            <IncidentDetail
              key={selected.id}
              incident={selected}
              user={authUser}
              position={position}
              locationError={locationError}
              onBack={() => setSelectedId(null)}
              onAdvance={advanceIncident}
              updating={updatingId === selected.id}
              onRelease={handBack}
            />
          ) : loading ? <div role="status" style={{ padding: 24, textAlign: "center", color: SL }}>Loading your assignments…</div>
            : activeIncidents.length === 0 ? (
              <div style={{ ...card, padding: 32, textAlign: "center", color: SL }}>
                No active assignments. {openSOS.length > 0 ? <button type="button" onClick={() => setTab("sos")} style={{ border: 0, background: "none", color: RED, fontWeight: 800, cursor: "pointer", textDecoration: "underline" }}>{openSOS.length} open SOS need a responder</button> : onDuty ? "You'll be alerted when you're dispatched." : "Go on duty to be dispatched."}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {activeIncidents.map(incident => (
                  <button key={incident.id} type="button" onClick={() => openIncident(incident.id)} className="ceis-icon-action" style={{ ...card, textAlign: "left", padding: 16, cursor: "pointer", borderLeft: `5px solid ${incident.isSOS ? RED : PRIORITY[incident.priority]?.color || NAVY}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "start" }}>
                      <div>
                        <div style={{ fontSize: 11, color: MID, fontFamily: "'IBM Plex Mono',monospace" }}>{incident.reference || incident.id} · {incident.time}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: NK, margin: "3px 0" }}>{incident.isSOS ? "SOS" : INC_TYPES[incident.type]?.label || "Incident"} — {incident.loc}</div>
                        <div style={{ fontSize: 12.5, color: SL }}>{(incident.desc || "No description").slice(0, 120)}</div>
                      </div>
                      <div style={{ display: "grid", gap: 6, justifyItems: "end" }}><Badges incident={incident} /><DistanceChip incident={incident} position={position} /></div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 800, color: NAVY }}>Next: {NEXT_LABEL[NEXT[incident.status]] || "—"} →</div>
                  </button>
                ))}
              </div>
            )
        )}

        {tab === "sos" && (
          <section aria-label="Open SOS alerts">
            <p style={{ fontSize: 13, color: SL, marginBottom: 12 }}>SOS alerts no responder has accepted yet, nearest first. Accepting assigns it to you, alerts the admin team and tells the person you&apos;re on the way.</p>
            {sosError && <div role="alert" style={{ background: REDL, color: RED, padding: 10, borderRadius: 6, marginBottom: 10, fontSize: 13 }}>{sosError}</div>}
            {sortedSOS.length === 0 ? <div style={{ ...card, padding: 28, textAlign: "center", color: SL }}>No open SOS alerts right now.</div> : (
              <div style={{ display: "grid", gap: 10 }}>
                {sortedSOS.map(incident => (
                  <article key={incident.id} style={{ ...card, padding: 16, borderLeft: `5px solid ${RED}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "start" }}>
                      <div>
                        <div style={{ fontSize: 11, color: MID, fontFamily: "'IBM Plex Mono',monospace" }}>{incident.reference || incident.id} · {incident.time}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: NK, margin: "3px 0" }}>SOS — {incident.isAnonymous ? "Anonymous" : incident.reporter}</div>
                        <div style={{ fontSize: 12.5, color: SL }}>{incident.loc}</div>
                      </div>
                      <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                        <DistanceChip incident={incident} position={position} />
                        <button type="button" disabled={claimingId === incident.id} onClick={() => acceptSOS(incident)} style={{ padding: "11px 16px", background: RED, color: WHITE, border: 0, borderRadius: 6, fontWeight: 800, cursor: claimingId === incident.id ? "wait" : "pointer", opacity: claimingId === incident.id ? 0.65 : 1 }}>{claimingId === incident.id ? "Accepting…" : "Accept & navigate"}</button>
                        <button type="button" onClick={() => { setSelectedId(incident.id); setTab("map"); }} style={{ border: 0, background: "none", color: NAVY, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Show on map</button>
                      </div>
                    </div>
                    <IncidentEmergencyContacts incident={incident} user={authUser} />
                    <IncidentMedicalInfo incident={incident} user={authUser} />
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "map" && (
          <section aria-label="Live map">
            <p style={{ fontSize: 13, color: SL, marginBottom: 10 }}>Your position (blue), your assignments and open SOS alerts. Select a marker for live guidance.</p>
            <ResponderMap incidents={[...activeIncidents, ...openSOS]} selectedId={selectedId} onSelect={setSelectedId} position={position} height={460} />
            {selected && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  <strong style={{ color: NK }}>{selected.reference} · {selected.loc}</strong>
                  {incidents.some(incident => incident.id === selected.id)
                    ? <button type="button" onClick={() => setTab("active")} style={{ padding: "7px 12px", background: NAVY, color: WHITE, border: 0, borderRadius: 6, fontWeight: 700, cursor: "pointer" }}>Open incident</button>
                    : <button type="button" onClick={() => acceptSOS(selected)} disabled={claimingId === selected.id} style={{ padding: "7px 12px", background: RED, color: WHITE, border: 0, borderRadius: 6, fontWeight: 800, cursor: "pointer" }}>{claimingId === selected.id ? "Accepting…" : "Accept this SOS"}</button>}
                </div>
                <NavigationPanel incident={selected} position={position} locationError={locationError} onArrive={() => advanceIncident(selected, selected.status === "TEAM_DISPATCHED" ? "ACKNOWLEDGED" : "ON_SCENE")} arriving={updatingId === selected.id} />
              </div>
            )}
          </section>
        )}

        {tab === "history" && (
          history.length === 0 ? <div style={{ ...card, padding: 28, textAlign: "center", color: SL }}>No resolved assignments yet.</div> : (
            <div style={{ ...card, overflow: "hidden" }}>
              {history.map(incident => (
                <div key={incident.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", padding: "12px 16px", borderBottom: `1px solid ${BD}` }}>
                  <div>
                    <div style={{ fontSize: 11, color: MID, fontFamily: "'IBM Plex Mono',monospace" }}>{incident.reference} · {incident.createdAt ? new Date(incident.createdAt).toLocaleDateString("en-ZA") : ""}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: NK }}>{incident.isSOS ? "SOS" : INC_TYPES[incident.type]?.label || "Incident"} — {incident.loc}</div>
                  </div>
                  <div style={{ fontSize: 12, color: SL, textAlign: "right" }}>
                    <div>Dispatched → resolved: <strong>{minutesBetween(incident.dispatchedAt, incident.resolvedAt) ?? "—"} min</strong></div>
                    <div>{STATUS_LABEL[incident.status]}</div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </section>
    </main>
  );
}
