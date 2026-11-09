import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { Eye, EyeOff, LoaderCircle, Monitor } from "lucide-react";
import "./mobile.css";
import { LOGO } from "../constants.js";
import { auth } from "../lib/firebase.js";
import Signup from "../auth/Signup.jsx";
import { isRegistrationInProgress, isValidEmail, loadAppUser, requestPasswordReset, signInUser, signOutUser } from "../auth/firebaseAuth.js";
import { useAccountTheme, useToasts } from "./hooks.js";
import { Sheet, Toasts } from "./ui.jsx";
import StudentApp from "./student/StudentApp.jsx";
import ResponderApp from "./responder/ResponderApp.jsx";

const PHONE_PORTALS = ["student", "staff", "responder"];

function portalOf(user) {
  return user?.roles?.[0] || user?.portal || null;
}

function Brand() {
  return (
    <div style={{ textAlign: "center", color: "#fff", marginBottom: 26 }}>
      {/* The logo image is a wide navy banner with the crest in the middle, so it is
          cropped to the crest and shown on a matching rounded badge. */}
      <div style={{ display: "inline-block", background: "#1D2155", borderRadius: 18, overflow: "hidden", marginBottom: 14, border: ".5px solid rgba(255,255,255,.14)", boxShadow: "0 10px 30px rgba(0,0,0,.3)" }}>
        <img src={LOGO} alt="University of Mpumalanga" style={{ display: "block", width: 220, height: 76, objectFit: "cover", transform: "scale(1.6)", transformOrigin: "50% 30%" }} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -.5 }}>UMP CEIS</div>
      <div style={{ fontSize: 14, opacity: .7, marginTop: 2 }}>Campus Emergency Intelligence System</div>
    </div>
  );
}

const authBackground = {
  minHeight: "100dvh",
  padding: "calc(env(safe-area-inset-top, 0px) + 40px) 20px calc(env(safe-area-inset-bottom, 0px) + 24px)",
  background: "radial-gradient(120% 60% at 0% 0%, rgba(80,120,255,.35), transparent 60%), radial-gradient(90% 50% at 100% 100%, rgba(212,150,14,.22), transparent 60%), linear-gradient(160deg, #101D42, #0B1230 60%, #070B1E)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const glassCard = {
  background: "rgba(255,255,255,.1)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  backdropFilter: "blur(24px) saturate(180%)",
  border: ".5px solid rgba(255,255,255,.22)",
  borderRadius: 26,
  padding: 20,
  color: "#fff",
  boxShadow: "0 20px 50px rgba(0,0,0,.35)",
};

const darkInput = { background: "rgba(255,255,255,.1)", border: ".5px solid rgba(255,255,255,.25)", color: "#fff" };

export function SignIn({ onSignedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("signin"); // signin | choose-role | signup
  const [signupRole, setSignupRole] = useState("student");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetMessage, setResetMessage] = useState({ kind: "", text: "" });

  async function submit(event) {
    event.preventDefault();
    if (!isValidEmail(email) || !password) { setError("Enter your email address and password."); return; }
    setBusy(true);
    setError("");
    try {
      const result = await signInUser(email, password);
      const portal = portalOf(result.user);
      if (!portal) {
        await signOutUser();
        const requested = result.user.requestedRole;
        setError(result.user.roleRequestStatus === "pending" && requested
          ? `Your ${requested} access request is waiting for administrator approval.`
          : result.user.roleRequestStatus === "rejected" && requested
            ? `Your ${requested} access request was not approved. Contact a CEIS administrator if this is a mistake.`
            : "This account has no CEIS portal assigned yet. Contact a CEIS administrator.");
        return;
      }
      onSignedIn({ ...result, user: { ...result.user, portal, role: portal, access: portal } });
    } catch (signInError) {
      setError(signInError.message || "We could not sign you in. Check your details.");
    } finally {
      setBusy(false);
    }
  }

  async function sendReset(event) {
    event.preventDefault();
    if (!isValidEmail(email)) { setResetMessage({ kind: "error", text: "Enter a valid email address." }); return; }
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setResetMessage({ kind: "ok", text: "If an account exists for that address, a reset link is on its way. Check your inbox and spam folder." });
    } catch (resetError) {
      setResetMessage({ kind: "error", text: resetError.message || "Could not send a reset email." });
    } finally {
      setBusy(false);
    }
  }

  if (view === "signup") {
    return (
      <div style={authBackground}>
        <div className="m-embed"><Signup role={signupRole} onBack={() => setView("signin")} /></div>
      </div>
    );
  }

  return (
    <div style={authBackground}>
      <Brand />
      {view === "choose-role" ? (
        <div style={glassCard}>
          <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 4 }}>Create an account</div>
          <p style={{ fontSize: 14, opacity: .75, margin: "0 0 14px" }}>Who are you?</p>
          {[["student", "Student", "9-digit student number @ump.ac.za"], ["staff", "Staff", "Your @ump.ac.za staff email"], ["responder", "Responder", "Any email · needs admin approval"]].map(([role, label, hint]) => (
            <button key={role} type="button" onClick={() => { setSignupRole(role); setView("signup"); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "14px 16px", marginBottom: 10, borderRadius: 16, border: ".5px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.08)", color: "#fff", cursor: "pointer" }}>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 13.5, opacity: .7 }}>{hint}</div>
            </button>
          ))}
          <button type="button" className="m-btn m-btn--block" onClick={() => setView("signin")} style={{ background: "transparent", color: "#fff", minHeight: 44 }}>Back to sign in</button>
        </div>
      ) : (
        <form onSubmit={submit} style={glassCard}>
          <label className="m-field">
            <span className="m-field-label" style={{ color: "rgba(255,255,255,.75)" }}>Email</span>
            <input className="m-input" style={darkInput} type="email" autoComplete="username" inputMode="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="230021646@ump.ac.za" required />
          </label>
          <label className="m-field">
            <span className="m-field-label" style={{ color: "rgba(255,255,255,.75)" }}>Password</span>
            <span style={{ position: "relative", display: "block" }}>
              <input className="m-input" style={{ ...darkInput, paddingRight: 48 }} type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
              <button type="button" className="m-icon-btn" style={{ position: "absolute", right: 2, top: 2, color: "#fff" }} aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)}>
                {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
              </button>
            </span>
          </label>
          {error && <div className="m-alert" role="alert" style={{ background: "rgba(255,90,78,.2)", color: "#FFD6D2", marginBottom: 12 }}>{error}</div>}
          <button type="submit" className="m-btn m-btn--block" disabled={busy} style={{ background: "#fff", color: "#101D42" }}>
            {busy ? <><LoaderCircle size={18} className="m-spin" aria-hidden="true" />Signing in…</> : "Sign in"}
          </button>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
            <button type="button" onClick={() => { setResetMessage({ kind: "", text: "" }); setResetOpen(true); }} style={{ border: 0, background: "none", color: "#fff", opacity: .85, fontSize: 15, padding: 8, cursor: "pointer" }}>Forgot password?</button>
            <button type="button" onClick={() => setView("choose-role")} style={{ border: 0, background: "none", color: "#fff", fontWeight: 600, fontSize: 15, padding: 8, cursor: "pointer" }}>Create account</button>
          </div>
          <p style={{ fontSize: 12.5, opacity: .6, textAlign: "center", margin: "12px 0 0" }}>For students, staff and responders. Administrators use the CEIS website.</p>
        </form>
      )}

      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} title="Reset password">
        <form onSubmit={sendReset}>
          <label className="m-field">
            <span className="m-field-label">Email</span>
            <input className="m-input" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required />
          </label>
          {resetMessage.text && <div className={`m-alert m-alert--${resetMessage.kind}`} role="status" style={{ marginBottom: 12 }}>{resetMessage.text}</div>}
          <button type="submit" className="m-btn m-btn--primary m-btn--block" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
        </form>
      </Sheet>
    </div>
  );
}

function AdminOnWeb({ user, onSignOut }) {
  return (
    <div style={authBackground}>
      <Brand />
      <div style={glassCard}>
        <Monitor size={34} aria-hidden="true" />
        <div style={{ fontSize: 20, fontWeight: 700, margin: "10px 0 6px" }}>Use the CEIS website for admin work</div>
        <p style={{ fontSize: 15, opacity: .8, margin: "0 0 16px" }}>Signed in as {user.email}. The Admin Portal (dispatch, analytics, users and audit log) is designed for a larger screen. Open CEIS in Safari or on a computer.</p>
        <button type="button" className="m-btn m-btn--block" style={{ background: "#fff", color: "#101D42" }} onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  );
}

export default function MobileApp() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = session?.user || null;
  const portal = portalOf(user);
  // Stable object for the hooks below; only changes when the signed-in person changes.
  const authUser = user ? { ...user, role: portal, access: portal, portal } : null;
  const authKey = authUser ? `${authUser.uid}:${portal}` : "";
  const [stableAuthUser, setStableAuthUser] = useState(null);
  useEffect(() => { setStableAuthUser(authUser); }, [authKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useAccountTheme(stableAuthUser && PHONE_PORTALS.includes(portal) ? stableAuthUser : null);
  const { toasts, show, dismiss } = useToasts(stableAuthUser && PHONE_PORTALS.includes(portal) ? stableAuthUser : null);

  // Same session rules as the website: verified email and one approved portal role.
  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      if (isRegistrationInProgress()) { if (active) setLoading(false); return; }
      if (!firebaseUser) { if (active) { setSession(null); setLoading(false); } return; }
      try {
        await firebaseUser.reload();
        if (auth.currentUser?.uid !== firebaseUser.uid) return;
        if (!firebaseUser.emailVerified) { await signOutUser(); return; }
        const loaded = await loadAppUser(firebaseUser);
        if (auth.currentUser?.uid !== firebaseUser.uid) return;
        if (!loaded.roles.length) { await signOutUser(); return; }
        if (active) setSession({ user: loaded, firebaseUser });
      } catch (error) {
        console.error("Firebase session could not be loaded", error);
        if (active) setSession(null);
      } finally {
        if (active) setLoading(false);
      }
    }, error => {
      console.error("Firebase authentication state failed", error);
      if (active) { setSession(null); setLoading(false); }
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  async function signOut() {
    await signOutUser().catch(() => {});
    setSession(null);
  }

  function updateUser(profile) {
    setSession(current => (current ? { ...current, user: { ...current.user, ...profile } } : current));
  }

  let content;
  if (loading) {
    content = <div style={{ ...authBackground, alignItems: "center" }} role="status" aria-label="Loading"><Brand /><LoaderCircle size={28} color="#fff" className="m-spin" aria-hidden="true" /></div>;
  } else if (!user || !stableAuthUser || stableAuthUser.uid !== user.uid) {
    content = !user ? <SignIn onSignedIn={setSession} /> : <div style={authBackground} role="status" aria-label="Loading" />;
  } else if (portal === "admin") {
    content = <AdminOnWeb user={user} onSignOut={signOut} />;
  } else if (portal === "responder") {
    content = <ResponderApp user={{ ...user, portal }} authUser={stableAuthUser} onSignOut={signOut} toast={show} />;
  } else {
    content = <StudentApp user={{ ...user, portal }} authUser={stableAuthUser} onSignOut={signOut} onUserUpdated={updateUser} toast={show} />;
  }

  return (
    <div className="m-app">
      {content}
      <Toasts items={toasts} onDismiss={dismiss} />
    </div>
  );
}
