import { useEffect, useState } from "react";
import { ArrowLeft, BellRing, CheckCircle2, KeyRound, LogOut, Mail, Megaphone, Moon, Phone, Share, Sun } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../lib/firebase.js";
import { setTheme, useTheme } from "../theme.js";
import PushNotificationsButton from "../components/PushNotificationsButton.jsx";
import LandingSite from "../LandingSite.jsx";
import { EMERGENCY_NUMBERS, subscribeCampusAlerts } from "./data.js";
import { Group, Page, Row } from "./ui.jsx";

export function AppearancePage({ onBack }) {
  const theme = useTheme();
  return (
    <Page title="Appearance" onBack={onBack}>
      <div className="m-card">
        <div className="m-segmented" role="group" aria-label="Appearance">
          <button type="button" aria-pressed={theme === "light"} onClick={() => setTheme("light")}><Sun size={16} aria-hidden="true" style={{ verticalAlign: -3, marginRight: 6 }} />Light</button>
          <button type="button" aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}><Moon size={16} aria-hidden="true" style={{ verticalAlign: -3, marginRight: 6 }} />Dark</button>
        </div>
        <p className="m-muted" style={{ margin: "12px 4px 0" }}>Light is the default. Your choice is saved to your account and follows you to other devices.</p>
      </div>
    </Page>
  );
}

export function NotificationsPage({ authUser, onBack }) {
  return (
    <Page title="Notifications" onBack={onBack}>
      <div className="m-card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span className="m-row-icon" style={{ background: "var(--m-red)" }}><BellRing size={18} aria-hidden="true" /></span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Emergency alerts on this iPhone</div>
            <p className="m-muted" style={{ margin: "4px 0 12px" }}>SOS updates, responder dispatch, report status changes and campus alerts — even when CEIS is closed.</p>
          </div>
        </div>
        <div className="m-embed"><PushNotificationsButton user={authUser} variant="light" showBanners={false} /></div>
      </div>
      <Group title="If alerts don't arrive" footer="iPhone only delivers web alerts to apps opened from the Home Screen (iOS 16.4 or later).">
        <Row icon={<Share size={17} aria-hidden="true" />} color="#5856D6" label="Open CEIS from the Home Screen icon" detail="Not from Safari" />
        <Row icon={<BellRing size={17} aria-hidden="true" />} color="#FF9500" label="Settings › Notifications › UMP CEIS" detail="Make sure Allow Notifications is on" />
      </Group>
    </Page>
  );
}

export function EmergencyNumbersPage({ onBack }) {
  return (
    <Page title="Emergency numbers" onBack={onBack}>
      <Group footer="Tapping a number starts a phone call. Opening the call does not confirm it connected.">
        {EMERGENCY_NUMBERS.map(item => (
          <Row key={item.key} icon={<Phone size={17} aria-hidden="true" />} color={item.color} label={item.label} detail={item.number} href={item.href} trailing={<span className="m-chip m-chip--tint">Call</span>} />
        ))}
      </Group>
    </Page>
  );
}

export function PrivacyPage({ user, onBack, onSignOut, note }) {
  const [status, setStatus] = useState({ kind: "", text: "" });
  const [sending, setSending] = useState(false);
  const verified = auth.currentUser?.emailVerified === true;

  async function reset() {
    setSending(true);
    setStatus({ kind: "", text: "" });
    try {
      await sendPasswordResetEmail(auth, user.email);
      setStatus({ kind: "ok", text: "Password reset email sent. Check your inbox and spam folder." });
    } catch (error) {
      setStatus({ kind: "error", text: error.message || "Could not send a password reset email." });
    } finally {
      setSending(false);
    }
  }

  return (
    <Page title="Privacy & security" onBack={onBack}>
      <Group title="Account">
        <Row icon={<Mail size={17} aria-hidden="true" />} color="#1A2766" label={user.email} detail={verified ? "Verified email" : "Email not verified"} trailing={verified ? <CheckCircle2 size={18} color="var(--m-green)" aria-hidden="true" /> : null} />
        <Row icon={<KeyRound size={17} aria-hidden="true" />} color="#FF9500" label={sending ? "Sending…" : "Send password reset email"} onClick={sending ? undefined : reset} chevron={false} />
      </Group>
      {status.text && <div className={`m-alert m-alert--${status.kind}`} role="status" style={{ marginTop: 10 }}>{status.text}</div>}
      {note && <p className="m-muted" style={{ margin: "14px 8px" }}>{note}</p>}
      <Group>
        <Row icon={<LogOut size={17} aria-hidden="true" />} color="var(--m-red)" label="Sign out" onClick={onSignOut} chevron={false} danger />
      </Group>
    </Page>
  );
}

export function CampusAlertsPage({ onBack }) {
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => subscribeCampusAlerts(setAlerts, issue => setError(issue.message)), []);
  return (
    <Page title="Campus alerts" onBack={onBack}>
      {error && <div className="m-alert m-alert--warn" role="alert">{error}</div>}
      {!error && alerts === null && <p className="m-muted" role="status">Loading alerts…</p>}
      {alerts?.length === 0 && <div className="m-card m-muted" style={{ textAlign: "center" }}>No campus alerts have been sent.</div>}
      <div style={{ display: "grid", gap: 10 }}>
        {alerts?.map(alert => (
          <article key={alert.id} className="m-card">
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span className="m-row-icon" style={{ background: "var(--m-orange)" }}><Megaphone size={17} aria-hidden="true" /></span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{alert.title}</div>
                <div style={{ fontSize: 15, color: "var(--m-text-2)", margin: "3px 0", whiteSpace: "pre-wrap" }}>{alert.body}</div>
                <div className="m-muted">{alert.createdAt ? alert.createdAt.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" }) : ""}</div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Page>
  );
}

// The website's first-aid guides and medical triage, shown full screen inside
// the app with a floating way back.
export function FirstAidHost({ page, onClose }) {
  useEffect(() => {
    window.scrollTo(0, 0);
    return () => window.scrollTo(0, 0);
  }, []);
  return (
    <div className="m-landing-host">
      <LandingSite initialPage={page} onAccessSystem={onClose} />
      <button type="button" className="m-landing-back m-glass" onClick={onClose}><ArrowLeft size={18} aria-hidden="true" />Back to CEIS</button>
    </div>
  );
}
