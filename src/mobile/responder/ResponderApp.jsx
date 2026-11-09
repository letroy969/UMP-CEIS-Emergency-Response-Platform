import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  History,
  LifeBuoy,
  LogOut,
  Map as MapIcon,
  Moon,
  Navigation,
  Phone,
  Power,
  Siren,
  Undo2,
} from "lucide-react";
import { INC_TYPES, PRIORITY, STATUS_LABEL } from "../../constants.js";
import { claimSOS, releaseIncident, subscribeIncidents, subscribeOpenSOS, updateIncident } from "../../incidentApi.js";
import { useResponderLocation } from "../../responder/useResponderLocation.js";
import { formatDistance, navigationSummary, navigationTarget } from "../../maps/navigation.js";
import ResponderMap from "../../components/responder/ResponderMap.jsx";
import NavigationPanel from "../../components/responder/NavigationPanel.jsx";
import IncidentUpdates from "../../components/responder/IncidentUpdates.jsx";
import IncidentEvidenceList from "../../components/IncidentEvidenceList.jsx";
import IncidentEmergencyContacts from "../../components/IncidentEmergencyContacts.jsx";
import IncidentMedicalInfo from "../../components/IncidentMedicalInfo.jsx";
import { EMERGENCY_NUMBERS } from "../data.js";
import { AppearancePage, EmergencyNumbersPage, NotificationsPage, PrivacyPage } from "../SharedPages.jsx";
import { Dock, Drawer, DrawerItem, Page, Sheet, StatusSteps, TopBar } from "../ui.jsx";

const CLOSED = ["RESOLVED", "CLOSED"];
const STEPS = ["TEAM_DISPATCHED", "ACKNOWLEDGED", "ON_SCENE", "RESOLVED"];
const STEP_LABELS = { TEAM_DISPATCHED: "Dispatched", ACKNOWLEDGED: "On the way", ON_SCENE: "On scene", RESOLVED: "Resolved" };
const NEXT = { TEAM_DISPATCHED: "ACKNOWLEDGED", ACKNOWLEDGED: "ON_SCENE", ON_SCENE: "RESOLVED" };
const NEXT_LABEL = { ACKNOWLEDGED: "Acknowledge — I'm on my way", ON_SCENE: "I'm on scene", RESOLVED: "Mark resolved" };

const title = incident => `${incident.isSOS ? "SOS" : INC_TYPES[incident.type]?.label || "Incident"} · ${incident.loc}`;

function Distance({ incident, position }) {
  const summary = navigationSummary(position, navigationTarget(incident));
  if (!summary) return null;
  return <span className="m-chip m-chip--tint"><Navigation size={12} aria-hidden="true" />{summary.arrived ? "Here" : `${formatDistance(summary.meters)} ${summary.direction}`}</span>;
}

function IncidentCard({ incident, position, onOpen, action = null }) {
  const priority = PRIORITY[incident.priority];
  return (
    <article className="m-card" style={{ borderLeft: `5px solid ${incident.isSOS ? "var(--m-red)" : priority?.color || "var(--m-tint)"}` }}>
      <button type="button" onClick={onOpen} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", border: 0, background: "none", padding: 0, textAlign: "left", color: "var(--m-text)", cursor: "pointer" }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="m-muted" style={{ display: "block" }}>{incident.reference} · {incident.time}</span>
          <span style={{ display: "block", fontWeight: 700, fontSize: 16.5, margin: "2px 0 6px" }}>{title(incident)}</span>
          <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {incident.isSOS && <span className="m-chip m-chip--red">SOS</span>}
            <span className="m-chip" style={{ color: priority?.color }}>{incident.priority}</span>
            <span className="m-chip">{STATUS_LABEL[incident.status]}</span>
            <Distance incident={incident} position={position} />
          </span>
        </span>
        <ChevronRight size={18} className="m-row-chevron" aria-hidden="true" />
      </button>
      {action}
    </article>
  );
}

export default function ResponderApp({ user, authUser, onSignOut, toast }) {
  const [tab, setTab] = useState("assignments");
  const [menuOpen, setMenuOpen] = useState(false);
  const [page, setPage] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [mapSelectedId, setMapSelectedId] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [incidents, setIncidents] = useState([]);
  const [openSOS, setOpenSOS] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [reason, setReason] = useState("");
  const knownIds = useRef(null);

  const active = useMemo(() => incidents.filter(incident => !CLOSED.includes(incident.status)), [incidents]);
  const history = useMemo(() => incidents.filter(incident => CLOSED.includes(incident.status)), [incidents]);
  const selected = incidents.find(incident => incident.id === selectedId) || null;
  const mapSelected = [...active, ...openSOS].find(incident => incident.id === mapSelectedId) || null;
  const navIncident = navOpen ? selected || mapSelected : null;

  const { onDuty, setOnDuty, position, error: locationError, lastSyncAt, syncError } = useResponderLocation(authUser, {
    navigating: Boolean(selected) || tab !== "assignments" || active.length > 0 || navOpen,
    busy: active.length > 0,
  });

  useEffect(() => subscribeOpenSOS(authUser, rows => setOpenSOS(rows.filter(row => row.status === "NEW")), issue => setError(issue.message)), [authUser]);

  useEffect(() => subscribeIncidents(authUser, rows => {
    const activeRows = rows.filter(row => !CLOSED.includes(row.status));
    if (knownIds.current) {
      const fresh = activeRows.find(row => !knownIds.current.has(row.id));
      if (fresh) {
        toast({
          title: "New assignment",
          body: `${fresh.reference} · ${fresh.loc}`,
          urgent: true,
          action: { label: "Open", onClick: () => { setTab("assignments"); setSelectedId(fresh.id); } },
        });
      }
    }
    knownIds.current = new Set(rows.map(row => row.id));
    setIncidents(rows);
  }, issue => setError(issue.message)), [authUser, toast]);

  async function advance(incident, status) {
    setBusyId(incident.id);
    setError("");
    try {
      await updateIncident(authUser, { id: incident.id, status });
    } catch (issue) {
      setError(issue.message);
    } finally {
      setBusyId("");
    }
  }

  async function arrive(incident) {
    if (incident.status === "TEAM_DISPATCHED") await advance(incident, "ACKNOWLEDGED");
    await advance(incident, "ON_SCENE");
  }

  async function accept(incident) {
    setBusyId(incident.id);
    setError("");
    try {
      await claimSOS(authUser, incident.id);
      knownIds.current?.add(incident.id);
      setTab("assignments");
      setSelectedId(incident.id);
      setMapSelectedId(null);
      setNavOpen(true);
    } catch (issue) {
      setError(issue.message);
    } finally {
      setBusyId("");
    }
  }

  async function handBack() {
    if (!selected) return;
    setBusyId(selected.id);
    setError("");
    try {
      await releaseIncident(authUser, selected.id, reason.trim());
      setReleaseOpen(false);
      setReason("");
      setSelectedId(null);
      toast({ title: "Incident handed back", body: "The admin team has been alerted to redispatch it." });
    } catch (issue) {
      setError(issue.message);
    } finally {
      setBusyId("");
    }
  }

  function signOut() {
    setMenuOpen(false);
    if (onDuty) setOnDuty(false);
    onSignOut();
  }

  const sortedSOS = useMemo(() => [...openSOS].sort((a, b) =>
    (navigationSummary(position, navigationTarget(a))?.meters ?? Infinity) - (navigationSummary(position, navigationTarget(b))?.meters ?? Infinity)), [openSOS, position]);

  const showDetail = tab === "assignments" && selected;
  const next = selected ? NEXT[selected.status] : null;
  const canNavigate = (showDetail && !CLOSED.includes(selected.status) && navigationTarget(selected)) || (tab === "map" && mapSelected && navigationTarget(mapSelected));

  return (
    <>
      <TopBar
        title={showDetail ? selected.reference : tab === "assignments" ? "Assignments" : tab === "sos" ? "Open SOS" : "Live map"}
        onMenu={showDetail ? undefined : () => setMenuOpen(true)}
        onBack={showDetail ? () => setSelectedId(null) : undefined}
        right={<span className={`m-chip ${onDuty ? "m-chip--green" : ""}`}>{onDuty ? "On duty" : "Off duty"}</span>}
      />

      <main className="m-screen">
        {!showDetail && (
          <div className={`m-alert ${onDuty ? "m-alert--ok" : "m-alert--info"}`} role="status" style={{ marginBottom: 12, fontSize: 14 }}>
            {onDuty
              ? (active.length ? "On duty · busy — admins can dispatch you; auto-dispatch skips you." : "On duty · sharing your location for SOS auto-dispatch.")
              : "Off duty · tap the power button to go on duty and share your location."}
            {onDuty && <span style={{ display: "block", opacity: .8, fontSize: 13 }}>{syncError ? `⚠ ${syncError}` : lastSyncAt ? `Updated ${lastSyncAt.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}` : "Waiting for GPS…"}</span>}
          </div>
        )}
        {locationError && <div className="m-alert m-alert--warn" role="alert" style={{ marginBottom: 12 }}>{locationError}</div>}
        {error && <div className="m-alert m-alert--error" role="alert" style={{ marginBottom: 12 }}>{error}</div>}

        {tab === "assignments" && !selected && (
          active.length === 0 ? (
            <div className="m-card" style={{ textAlign: "center" }}>
              <CheckCircle2 size={36} color="var(--m-green)" aria-hidden="true" />
              <p style={{ margin: "8px 0 4px", fontWeight: 600 }}>No active assignments</p>
              <p className="m-muted" style={{ margin: 0 }}>{openSOS.length ? `${openSOS.length} open SOS need a responder.` : onDuty ? "You'll be alerted when you're dispatched." : "Go on duty to be dispatched."}</p>
              {openSOS.length > 0 && <button type="button" className="m-btn m-btn--danger m-btn--small" style={{ marginTop: 12 }} onClick={() => setTab("sos")}>View open SOS</button>}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {active.map(incident => <IncidentCard key={incident.id} incident={incident} position={position} onOpen={() => setSelectedId(incident.id)} />)}
            </div>
          )
        )}

        {showDetail && (
          <>
            <div className="m-card" style={{ marginBottom: 12, borderLeft: `5px solid ${selected.isSOS ? "var(--m-red)" : PRIORITY[selected.priority]?.color}` }}>
              <div className="m-muted">{selected.time} · {selected.isAnonymous ? "Anonymous report" : `Reported by ${selected.reporter}`}</div>
              <h1 style={{ fontSize: 22, margin: "4px 0 8px", lineHeight: 1.2 }}>{title(selected)}</h1>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {selected.isSOS && <span className="m-chip m-chip--red">SOS</span>}
                <span className="m-chip" style={{ color: PRIORITY[selected.priority]?.color }}>{selected.priority} · {PRIORITY[selected.priority]?.label}</span>
                <Distance incident={selected} position={position} />
              </div>
              <StatusSteps steps={STEPS} labels={STEP_LABELS} current={selected.status === "CLOSED" ? "RESOLVED" : selected.status} />
              {next ? (
                <button type="button" className={`m-btn m-btn--block ${next === "RESOLVED" ? "m-btn--success" : "m-btn--brand"}`} style={{ marginTop: 10 }} disabled={busyId === selected.id} onClick={() => advance(selected, next)}>
                  {busyId === selected.id ? "Updating…" : NEXT_LABEL[next]}
                </button>
              ) : <div className="m-alert m-alert--ok" style={{ marginTop: 10 }}>Resolved</div>}
            </div>

            {!CLOSED.includes(selected.status) && navigationTarget(selected) && (
              <button type="button" className="m-card" onClick={() => setNavOpen(true)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", border: 0, textAlign: "left", color: "var(--m-text)", cursor: "pointer", marginBottom: 12 }}>
                <span className="m-row-icon" style={{ width: 44, height: 44, borderRadius: 12, background: "var(--m-tint)" }}><Navigation size={22} aria-hidden="true" /></span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontWeight: 700 }}>Navigate to incident</span>
                  <span className="m-muted">{(() => { const s = navigationSummary(position, navigationTarget(selected)); return s ? `${formatDistance(s.meters)} ${s.direction} · ≈${s.walkMinutes} min walk` : "Live map, arrow and directions"; })()}</span>
                </span>
                <ChevronRight size={18} className="m-row-chevron" aria-hidden="true" />
              </button>
            )}

            {selected.desc && <div className="m-card" style={{ marginBottom: 12, whiteSpace: "pre-wrap", fontSize: 15.5 }}>{selected.desc}</div>}

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {EMERGENCY_NUMBERS.slice(0, 2).map(item => (
                <a key={item.key} href={item.href} className={`m-btn m-btn--small ${item.key === "ems" ? "m-btn--danger" : "m-btn--plain"}`} style={{ flex: 1 }}><Phone size={15} aria-hidden="true" />{item.key === "ems" ? "EMS 10177" : "Campus Security"}</a>
              ))}
            </div>

            <div className="m-card m-embed" style={{ marginBottom: 12 }}>
              <IncidentEvidenceList incident={selected} user={authUser} />
              <IncidentEmergencyContacts incident={selected} user={authUser} />
              <IncidentMedicalInfo incident={selected} user={authUser} />
              <IncidentUpdates incident={selected} user={authUser} />
            </div>

            {["TEAM_DISPATCHED", "ACKNOWLEDGED"].includes(selected.status) && (
              <button type="button" className="m-btn m-btn--plain m-btn--block" onClick={() => setReleaseOpen(true)}><Undo2 size={17} aria-hidden="true" />Can&apos;t attend? Hand back</button>
            )}
          </>
        )}

        {tab === "sos" && (
          sortedSOS.length === 0 ? <div className="m-card m-muted" style={{ textAlign: "center", fontSize: 15 }}>No open SOS alerts right now.</div> : (
            <div style={{ display: "grid", gap: 10 }}>
              {sortedSOS.map(incident => (
                <IncidentCard key={incident.id} incident={incident} position={position}
                  onOpen={() => { setMapSelectedId(incident.id); setTab("map"); }}
                  action={(
                    <>
                      <button type="button" className="m-btn m-btn--danger m-btn--block" style={{ marginTop: 12 }} disabled={busyId === incident.id} onClick={() => accept(incident)}>{busyId === incident.id ? "Accepting…" : "Accept & navigate"}</button>
                      <div className="m-embed" style={{ marginTop: 6 }}>
                        <IncidentEmergencyContacts incident={incident} user={authUser} />
                        <IncidentMedicalInfo incident={incident} user={authUser} />
                      </div>
                    </>
                  )} />
              ))}
            </div>
          )
        )}

        {tab === "map" && (
          <>
            <div className="m-embed" style={{ borderRadius: 18, overflow: "hidden" }}>
              <ResponderMap incidents={[...active, ...openSOS]} selectedId={mapSelectedId} onSelect={setMapSelectedId} position={position} height="calc(100dvh - 330px)" />
            </div>
            {mapSelected ? (
              <div className="m-card" style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700 }}>{title(mapSelected)}</div>
                <div style={{ display: "flex", gap: 6, margin: "6px 0 10px", flexWrap: "wrap" }}><Distance incident={mapSelected} position={position} /><span className="m-chip">{mapSelected.reference}</span></div>
                {active.some(incident => incident.id === mapSelected.id)
                  ? <button type="button" className="m-btn m-btn--brand m-btn--block" onClick={() => { setTab("assignments"); setSelectedId(mapSelected.id); }}>Open incident</button>
                  : <button type="button" className="m-btn m-btn--danger m-btn--block" disabled={busyId === mapSelected.id} onClick={() => accept(mapSelected)}>{busyId === mapSelected.id ? "Accepting…" : "Accept this SOS"}</button>}
              </div>
            ) : <p className="m-muted" style={{ margin: "10px 6px 0" }}>Tap a marker for distance and directions. Blue is you.</p>}
          </>
        )}
      </main>

      <Dock
        tabs={[
          { key: "assignments", label: "Assignments", icon: <ClipboardList size={22} aria-hidden="true" />, badge: active.length },
          { key: "sos", label: "Open SOS", icon: <Siren size={22} aria-hidden="true" />, badge: openSOS.length },
          { key: "map", label: "Live map", icon: <MapIcon size={22} aria-hidden="true" /> },
        ]}
        active={tab}
        onTab={key => { setTab(key); if (key !== "assignments") setSelectedId(null); window.scrollTo(0, 0); }}
        orb={{
          label: onDuty ? "On duty — tap to go off duty" : "Off duty — tap to go on duty",
          pressed: onDuty,
          icon: <Power size={26} color={onDuty ? "#fff" : "var(--m-text)"} aria-hidden="true" />,
          style: onDuty ? { background: "var(--m-green)" } : undefined,
          onClick: () => setOnDuty(!onDuty),
        }}
        fab={canNavigate ? { label: "Navigate to incident", icon: <Navigation size={23} color="var(--m-tint)" aria-hidden="true" />, onClick: () => setNavOpen(true) } : null}
      />

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} header={<div><div style={{ fontSize: 20, fontWeight: 700 }}>{user.name}</div><div className="m-muted">Responder · {user.email}</div></div>}>
        <DrawerItem icon={<History size={17} />} color="#1A2766" label={`Assignment history (${history.length})`} onClick={() => { setMenuOpen(false); setPage("history"); }} />
        <div className="m-drawer-sep" />
        <DrawerItem icon={<Bell size={17} />} color="#FF3B30" label="Notifications" onClick={() => { setMenuOpen(false); setPage("notifications"); }} />
        <DrawerItem icon={<Moon size={17} />} color="#5856D6" label="Appearance" onClick={() => { setMenuOpen(false); setPage("appearance"); }} />
        <DrawerItem icon={<Phone size={17} />} color="#34C759" label="Emergency numbers" onClick={() => { setMenuOpen(false); setPage("numbers"); }} />
        <DrawerItem icon={<LifeBuoy size={17} />} color="#8E8E93" label="Privacy & security" onClick={() => { setMenuOpen(false); setPage("privacy"); }} />
        <div className="m-drawer-sep" />
        <DrawerItem icon={<LogOut size={17} />} color="var(--m-red)" label="Sign out" danger onClick={signOut} />
      </Drawer>

      {page === "history" && (
        <Page title="Assignment history" onBack={() => setPage(null)}>
          {history.length === 0 ? <div className="m-card m-muted" style={{ textAlign: "center" }}>No resolved assignments yet.</div> : (
            <div className="m-group">
              {history.map(incident => {
                const minutes = incident.dispatchedAt && incident.resolvedAt ? Math.max(0, Math.round((new Date(incident.resolvedAt) - new Date(incident.dispatchedAt)) / 60000)) : null;
                return (
                  <div key={incident.id} className="m-row" style={{ cursor: "default" }}>
                    <span className="m-row-main">
                      <span className="m-row-label">{title(incident)}</span>
                      <span className="m-row-detail" style={{ display: "block" }}>{incident.reference} · {incident.createdAt ? new Date(incident.createdAt).toLocaleDateString("en-ZA") : ""}{minutes != null ? ` · ${minutes} min to resolve` : ""}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Page>
      )}
      {page === "notifications" && <NotificationsPage authUser={authUser} onBack={() => setPage(null)} />}
      {page === "appearance" && <AppearancePage onBack={() => setPage(null)} />}
      {page === "numbers" && <EmergencyNumbersPage onBack={() => setPage(null)} />}
      {page === "privacy" && <PrivacyPage user={user} onBack={() => setPage(null)} onSignOut={signOut} note="Going off duty stops sharing your location. Signing out takes you off duty." />}

      <Sheet open={Boolean(navIncident)} onClose={() => setNavOpen(false)} title="Navigate" full>
        {navIncident && (
          <>
            <div className="m-embed" style={{ borderRadius: 18, overflow: "hidden", marginBottom: 12 }}>
              <ResponderMap incidents={[navIncident]} selectedId={navIncident.id} position={position} height="42dvh" />
            </div>
            <div className="m-embed">
              <NavigationPanel incident={navIncident} position={position} locationError={locationError} arriving={busyId === navIncident.id}
                onArrive={() => { arrive(navIncident); setNavOpen(false); }} />
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={releaseOpen} onClose={() => setReleaseOpen(false)} title="Hand back incident">
        <p style={{ margin: "0 0 12px", color: "var(--m-text-2)" }}>Admins are alerted to redispatch it{selected?.isSOS ? ", and the SOS reopens for other responders" : ""}.</p>
        <label className="m-field">
          <span className="m-field-label">Why can&apos;t you attend?</span>
          <textarea className="m-input" maxLength={300} value={reason} onChange={event => setReason(event.target.value)} placeholder="e.g. Vehicle breakdown, already handling another emergency" />
        </label>
        <button type="button" className="m-btn m-btn--danger m-btn--block" disabled={reason.trim().length < 3 || busyId === selected?.id} onClick={handBack}>{busyId === selected?.id ? "Handing back…" : "Hand back"}</button>
      </Sheet>
    </>
  );
}
