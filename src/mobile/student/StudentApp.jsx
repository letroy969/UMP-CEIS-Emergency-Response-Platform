import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BookHeart,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  HeartPulse,
  House,
  LifeBuoy,
  LogOut,
  Map as MapIcon,
  Megaphone,
  Moon,
  Phone,
  ShieldCheck,
  Siren,
  SquarePen,
  UserRound,
  Users,
} from "lucide-react";
import { INC_TYPES } from "../../constants.js";
import { getCheckin, subscribeIncidents } from "../../incidentApi.js";
import CampusMap from "../../components/CampusMap.jsx";
import { EMERGENCY_NUMBERS } from "../data.js";
import { AppearancePage, CampusAlertsPage, EmergencyNumbersPage, FirstAidHost, NotificationsPage, PrivacyPage } from "../SharedPages.jsx";
import { Dock, Drawer, DrawerItem, TopBar } from "../ui.jsx";
import NewReportSheet from "./NewReportSheet.jsx";
import SOSSheet from "./SOSSheet.jsx";
import ReportDetailPage from "./ReportDetailPage.jsx";
import { CheckinPage, EmergencyContactsPage, MedicalPage, PersonalDetailsPage } from "./ProfilePages.jsx";
import { isClosed, reportStatusChip } from "./reportStatus.js";

function ReportCard({ report, onOpen }) {
  const type = INC_TYPES[report.type];
  const Icon = type?.icon || FileText;
  const chip = reportStatusChip(report.status);
  return (
    <button type="button" className="m-card" onClick={onOpen} style={{ display: "flex", gap: 12, alignItems: "center", width: "100%", border: 0, textAlign: "left", color: "var(--m-text)", cursor: "pointer" }}>
      <span className="m-row-icon" style={{ width: 40, height: 40, borderRadius: 11, background: report.isSOS ? "var(--m-red)" : type?.color || "var(--m-tint)" }}>
        {report.isSOS ? <b style={{ fontSize: 11 }}>SOS</b> : <Icon size={20} aria-hidden="true" />}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 600, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{report.isSOS ? "SOS alert" : type?.label || "Incident"} · {report.loc}</span>
        <span className="m-muted" style={{ display: "block" }}>{report.reference} · {report.createdAt ? new Date(report.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) : ""} {report.time}</span>
      </span>
      <span className={chip.className}>{chip.label}</span>
      <ChevronRight size={18} className="m-row-chevron" aria-hidden="true" />
    </button>
  );
}

export default function StudentApp({ user, authUser, onSignOut, onUserUpdated, toast }) {
  const [tab, setTab] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [page, setPage] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [firstAid, setFirstAid] = useState(null);
  const [reports, setReports] = useState([]);
  const [reportsError, setReportsError] = useState("");
  const [reportFilter, setReportFilter] = useState("active");
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [safeStatus, setSafeStatus] = useState(null);

  // Live list of this person's own reports (status changes appear instantly).
  useEffect(() => subscribeIncidents(authUser, rows => { setReports(rows); setReportsError(""); }, error => setReportsError(error.message)), [authUser]);

  useEffect(() => {
    getCheckin(authUser).then(checkin => setSafeStatus(checkin?.status || null)).catch(() => {});
  }, [authUser]);

  const active = useMemo(() => reports.filter(report => !isClosed(report.status)), [reports]);
  const past = useMemo(() => reports.filter(report => isClosed(report.status)), [reports]);
  const selectedReport = reports.find(report => report.id === selectedReportId) || null;
  const firstName = (user.name || "").split(" ")[0] || "there";

  function openPage(key) {
    setMenuOpen(false);
    setPage(key);
  }

  if (firstAid) return <FirstAidHost page={firstAid} onClose={() => setFirstAid(null)} />;

  const MENU = [
    ["personal", <UserRound key="i" size={17} />, "#1A2766", "Personal details"],
    ["contacts", <Users key="i" size={17} />, "#FF3B30", "Emergency contacts"],
    ["medical", <HeartPulse key="i" size={17} />, "#FF2D55", "Medical & accessibility"],
    ["checkin", <ShieldCheck key="i" size={17} />, "#34C759", "Safety check-in"],
    ["firstaid", <BookHeart key="i" size={17} />, "#FF9500", "First aid guides"],
    ["alerts", <Megaphone key="i" size={17} />, "#AF52DE", "Campus alerts"],
  ];
  const SETTINGS = [
    ["notifications", <Bell key="i" size={17} />, "#FF3B30", "Notifications"],
    ["appearance", <Moon key="i" size={17} />, "#5856D6", "Appearance"],
    ["numbers", <Phone key="i" size={17} />, "#34C759", "Emergency numbers"],
    ["privacy", <LifeBuoy key="i" size={17} />, "#8E8E93", "Privacy & security"],
  ];

  return (
    <>
      <TopBar
        title={tab === "home" ? "UMP CEIS" : tab === "reports" ? "My reports" : "Campus map"}
        onMenu={() => setMenuOpen(true)}
        right={safeStatus ? <span className={`m-chip ${safeStatus === "safe" ? "m-chip--green" : "m-chip--red"}`}>{safeStatus === "safe" ? "Safe" : "Help"}</span> : null}
      />

      {tab === "home" && (
        <main className="m-screen">
          <h1 className="m-large-title">Hi, {firstName}</h1>
          <p className="m-subtitle">{user.portal === "staff" ? "Staff" : "Student"} · University of Mpumalanga</p>

          <button type="button" className="m-card" onClick={() => setSosOpen(true)} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", border: 0, textAlign: "left", cursor: "pointer", background: "linear-gradient(135deg, #E5483C, #B42318)", color: "#fff", marginBottom: 12 }}>
            <span style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,.18)", display: "grid", placeItems: "center", flexShrink: 0 }}><Siren size={26} aria-hidden="true" /></span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 18, fontWeight: 700 }}>Emergency SOS</span>
              <span style={{ display: "block", fontSize: 14, opacity: .92 }}>Send your location to campus responders</span>
            </span>
            <ChevronRight size={20} aria-hidden="true" />
          </button>

          <div className="m-card" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              {safeStatus === "help" ? <LifeBuoy size={22} color="var(--m-red)" aria-hidden="true" /> : <CheckCircle2 size={22} color={safeStatus === "safe" ? "var(--m-green)" : "var(--m-text-3)"} aria-hidden="true" />}
              <span style={{ fontWeight: 600, flex: 1 }}>{safeStatus === "safe" ? "You're marked safe" : safeStatus === "help" ? "You asked for help" : "Safety check-in"}</span>
              <button type="button" className="m-btn m-btn--small m-btn--tinted" onClick={() => openPage("checkin")}>Update</button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {EMERGENCY_NUMBERS.map(item => (
                <a key={item.key} href={item.href} className="m-btn m-btn--small m-btn--plain" style={{ flex: 1, flexDirection: "column", gap: 2, minHeight: 58, padding: "6px 4px" }} aria-label={`Call ${item.label}, ${item.number}`}>
                  <Phone size={16} color={item.color} aria-hidden="true" />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{item.key === "ems" ? "EMS" : item.key === "security" ? "Security" : "Clinic"}</span>
                </a>
              ))}
            </div>
          </div>

          <h2 className="m-section-title">Your active reports</h2>
          {reportsError && <div className="m-alert m-alert--warn">{reportsError}</div>}
          {active.length === 0 ? (
            <div className="m-card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="m-muted" style={{ flex: 1, fontSize: 15 }}>No open reports. If something happens, report it in a few taps.</span>
              <button type="button" className="m-btn m-btn--small m-btn--primary" onClick={() => setReportOpen(true)}>Report</button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {active.slice(0, 3).map(report => <ReportCard key={report.id} report={report} onOpen={() => setSelectedReportId(report.id)} />)}
              {active.length > 3 && <button type="button" className="m-btn m-btn--tinted m-btn--block" onClick={() => setTab("reports")}>See all {active.length}</button>}
            </div>
          )}

          <h2 className="m-section-title">Help & guidance</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              ["First aid guides", <BookHeart key="i" size={22} color="#FF9500" aria-hidden="true" />, () => setFirstAid("firstaid")],
              ["Medical triage", <HeartPulse key="i" size={22} color="#FF2D55" aria-hidden="true" />, () => setFirstAid("triage")],
              ["Campus alerts", <Megaphone key="i" size={22} color="#AF52DE" aria-hidden="true" />, () => openPage("alerts")],
              ["Emergency contacts", <Users key="i" size={22} color="#FF3B30" aria-hidden="true" />, () => openPage("contacts")],
            ].map(([label, icon, onClick]) => (
              <button key={label} type="button" className="m-card" onClick={onClick} style={{ border: 0, textAlign: "left", cursor: "pointer", color: "var(--m-text)", display: "grid", gap: 8, minHeight: 92 }}>
                {icon}
                <span style={{ fontWeight: 600, fontSize: 15 }}>{label}</span>
              </button>
            ))}
          </div>
        </main>
      )}

      {tab === "reports" && (
        <main className="m-screen">
          <div className="m-segmented" role="group" aria-label="Filter reports" style={{ marginBottom: 14 }}>
            <button type="button" aria-pressed={reportFilter === "active"} onClick={() => setReportFilter("active")}>Active ({active.length})</button>
            <button type="button" aria-pressed={reportFilter === "past"} onClick={() => setReportFilter("past")}>Resolved ({past.length})</button>
          </div>
          {reportsError && <div className="m-alert m-alert--warn">{reportsError}</div>}
          {(reportFilter === "active" ? active : past).length === 0 ? (
            <div className="m-card m-muted" style={{ textAlign: "center", fontSize: 15 }}>{reportFilter === "active" ? "No open reports." : "No resolved reports yet."}</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {(reportFilter === "active" ? active : past).map(report => <ReportCard key={report.id} report={report} onOpen={() => setSelectedReportId(report.id)} />)}
            </div>
          )}
        </main>
      )}

      {tab === "map" && (
        <main className="m-screen m-map-tab">
          <div className="m-embed"><CampusMap incidents={reports} /></div>
        </main>
      )}

      <Dock
        tabs={[
          { key: "home", label: "Home", icon: <House size={22} aria-hidden="true" /> },
          { key: "reports", label: "Reports", icon: <ClipboardList size={22} aria-hidden="true" />, badge: active.length },
          { key: "map", label: "Map", icon: <MapIcon size={22} aria-hidden="true" /> },
        ]}
        active={tab}
        onTab={key => { setTab(key); window.scrollTo(0, 0); }}
        orb={{ label: "Emergency SOS", icon: <Siren size={28} color="var(--m-red)" aria-hidden="true" />, onClick: () => setSosOpen(true) }}
        fab={{ label: "New report", icon: <SquarePen size={23} aria-hidden="true" />, onClick: () => setReportOpen(true) }}
      />

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} header={
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{user.name}</div>
          <div className="m-muted">{user.email}</div>
        </div>
      }>
        {MENU.map(([key, icon, color, label]) => (
          <DrawerItem key={key} icon={icon} color={color} label={label} onClick={() => {
            if (key !== "firstaid") { openPage(key); return; }
            setMenuOpen(false);
            setFirstAid("firstaid");
          }} />
        ))}
        <div className="m-drawer-sep" />
        {SETTINGS.map(([key, icon, color, label]) => <DrawerItem key={key} icon={icon} color={color} label={label} onClick={() => openPage(key)} />)}
        <div className="m-drawer-sep" />
        <DrawerItem icon={<LogOut size={17} />} color="var(--m-red)" label="Sign out" danger onClick={() => { setMenuOpen(false); onSignOut(); }} />
      </Drawer>

      {page === "personal" && <PersonalDetailsPage user={user} authUser={authUser} onBack={() => setPage(null)} onUserUpdated={onUserUpdated} />}
      {page === "contacts" && <EmergencyContactsPage authUser={authUser} onBack={() => setPage(null)} />}
      {page === "medical" && <MedicalPage authUser={authUser} onBack={() => setPage(null)} />}
      {page === "checkin" && <CheckinPage authUser={authUser} onBack={() => setPage(null)} onStatusChange={setSafeStatus} />}
      {page === "alerts" && <CampusAlertsPage onBack={() => setPage(null)} />}
      {page === "notifications" && <NotificationsPage authUser={authUser} onBack={() => setPage(null)} />}
      {page === "appearance" && <AppearancePage onBack={() => setPage(null)} />}
      {page === "numbers" && <EmergencyNumbersPage onBack={() => setPage(null)} />}
      {page === "privacy" && <PrivacyPage user={user} onBack={() => setPage(null)} onSignOut={onSignOut} />}
      {selectedReport && <ReportDetailPage report={selectedReport} authUser={authUser} onBack={() => setSelectedReportId(null)} />}

      <NewReportSheet open={reportOpen} onClose={() => setReportOpen(false)} authUser={authUser} onOpenTriage={() => setFirstAid("triage")}
        onSubmitted={incident => toast({ title: "Report sent", body: `${incident.reference} is with the admin team.` })} />
      <SOSSheet open={sosOpen} onClose={() => setSosOpen(false)} authUser={authUser} />
    </>
  );
}
