import { useCallback, useEffect, useState } from "react";
import {
  Accessibility,
  ArrowDown,
  ArrowUp,
  BellRing,
  CheckCircle2,
  CircleUserRound,
  ClipboardCheck,
  Eye,
  FileText,
  LockKeyhole,
  MapPin,
  Plus,
  Save,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../lib/firebase.js";
import PushNotificationsButton from "../components/PushNotificationsButton.jsx";
import {
  getSafetyPreferences,
  listEmergencyContacts,
  removeEmergencyContact,
  reorderEmergencyContacts,
  saveEmergencyContact,
  saveSafetyPreferences,
  saveStudentProfile,
} from "../auth/studentProfile.js";
import { GREEN, GREENL, NAVY, RED, REDL, WHITE, PAPER, BD, NK, SL, MID } from "../constants.js";

const SECTIONS = [
  { id: "personal", title: "Personal details", description: "Your details and campus affiliation", Icon: UserRound },
  { id: "contacts", title: "Emergency contacts", description: "Trusted people to contact in an emergency", Icon: BellRing },
  { id: "medical", title: "Medical & accessibility", description: "Optional emergency support and accessibility", Icon: Accessibility },
  { id: "safety", title: "Safety preferences", description: "Location sharing and check-ins", Icon: MapPin },
  { id: "notifications", title: "Notifications", description: "Emergency updates on this device", Icon: BellRing },
  { id: "privacy", title: "Privacy & security", description: "Verification, account access and your data", Icon: LockKeyhole },
];

function messageOf(error, fallback) {
  if (error.code === "permission-denied") {
    return "Your profile update was blocked by Firestore security rules. Please try again later or contact CEIS support.";
  }
  return error.message || fallback;
}

function Field({ label, value, onChange, ...props }) {
  return (
    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: MID, marginBottom: 14 }}>
      {label}
      <input value={value} onChange={onChange} {...props}
        style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px", border: `1px solid ${BD}`, borderRadius: 6, background: WHITE, color: NK, fontSize: 14 }}/>
    </label>
  );
}

export default function StudentProfile({ user, authUser, onUserUpdated, onUnsavedChangesChange, onLogout, onBack }) {
  const [section, setSection] = useState("personal");
  const [form, setForm] = useState({
    fullName: user.name || "",
    faculty: user.faculty === "Faculty not listed" ? "" : user.faculty || "",
    department: user.dept || "",
    year: String(user.year || 1),
  });
  const [contacts, setContacts] = useState([]);
  const [preferences, setPreferences] = useState({ reducedMotion: false });
  const [contactForm, setContactForm] = useState(null);
  const [editingContact, setEditingContact] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [resetStatus, setResetStatus] = useState("");
  const profileDirty = form.fullName !== (user.name || "")
    || form.faculty !== (user.faculty === "Faculty not listed" ? "" : user.faculty || "")
    || form.department !== (user.dept || "")
    || form.year !== String(user.year || 1);
  const hasUnsavedChanges = profileDirty || contactForm !== null;

  useEffect(() => {
    onUnsavedChangesChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;
    const warnBeforeUnload = event => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

  function confirmLeave() {
    return !hasUnsavedChanges || window.confirm("You have unsaved profile changes. Leave without saving?");
  }

  function leaveProfile() {
    if (confirmLeave()) onBack();
  }

  const refreshPrivateData = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [savedContacts, savedPreferences] = await Promise.all([
        listEmergencyContacts(authUser),
        getSafetyPreferences(authUser),
      ]);
      setContacts(savedContacts);
      setPreferences({ reducedMotion: savedPreferences.reducedMotion === true });
    } catch (loadError) {
      setError(messageOf(loadError, "Could not load your private safety profile."));
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    refreshPrivateData();
  }, [refreshPrivateData]);

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const saved = await saveStudentProfile(authUser, form);
      onUserUpdated?.({
        name: saved.fullName,
        faculty: saved.faculty || "Faculty not listed",
        dept: saved.department,
        year: saved.year,
      });
      setNotice("Personal details saved.");
    } catch (saveError) {
      setError(messageOf(saveError, "Could not save your personal details."));
    } finally {
      setSaving(false);
    }
  }

  async function saveContact(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (editingContact) {
        await saveEmergencyContact(authUser, contactForm, editingContact);
      } else {
        await saveEmergencyContact(authUser, { ...contactForm, order: contacts.length });
      }
      setContactForm(null);
      setEditingContact("");
      await refreshPrivateData();
      setNotice("Emergency contact saved. CEIS does not notify this person.");
    } catch (saveError) {
      setError(messageOf(saveError, "Could not save this emergency contact."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteContact(contactId) {
    const contact = contacts.find(item => item.id === contactId);
    if (!contact || !window.confirm(`Remove ${contact.name} from your emergency contacts?`)) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await removeEmergencyContact(authUser, contactId);
      const remaining = await listEmergencyContacts(authUser);
      if (remaining.length) await reorderEmergencyContacts(authUser, remaining);
      await refreshPrivateData();
      setNotice("Emergency contact removed.");
    } catch (removeError) {
      setError(messageOf(removeError, "Could not remove this emergency contact."));
    } finally {
      setSaving(false);
    }
  }

  async function moveContact(index, offset) {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= contacts.length) return;
    const ordered = [...contacts];
    [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];
    setSaving(true);
    setError("");
    try {
      await reorderEmergencyContacts(authUser, ordered);
      setContacts(ordered);
      setNotice("Emergency contact order updated.");
    } catch (reorderError) {
      setError(messageOf(reorderError, "Could not reorder emergency contacts."));
    } finally {
      setSaving(false);
    }
  }

  async function setReducedMotion(value) {
    const updated = { reducedMotion: value };
    setPreferences(updated);
    setError("");
    try {
      await saveSafetyPreferences(authUser, updated);
      setNotice("Accessibility preference saved.");
    } catch (saveError) {
      setPreferences(previous => ({ ...previous, reducedMotion: !value }));
      setError(messageOf(saveError, "Could not save the accessibility preference."));
    }
  }

  async function requestPasswordReset() {
    setError("");
    setResetStatus("");
    try {
      await sendPasswordResetEmail(auth, authUser.email);
      setResetStatus("Password reset email sent. Check your inbox and spam folder.");
    } catch (resetError) {
      setError(messageOf(resetError, "Could not send a password reset email."));
    }
  }

  const selected = SECTIONS.find(item => item.id === section);
  const completedSetup = [
    auth.currentUser?.emailVerified === true,
    contacts.length > 0,
    Boolean(user.faculty && user.faculty !== "Faculty not listed"),
  ].filter(Boolean).length;

  return (
    <main className="ceis-profile" style={{ minHeight: "calc(100vh - 60px)", background: PAPER, padding: "28px 5% 56px", fontFamily: "'IBM Plex Sans',sans-serif" }}>
      <style>{`.ceis-profile-layout{display:grid;grid-template-columns:minmax(220px,270px) 1fr;gap:18px;align-items:start}.ceis-profile-section-nav{background:${WHITE};border:1px solid ${BD};border-radius:10px;padding:8px;display:grid;gap:4px}.ceis-contact-card{display:flex;align-items:center;gap:10px}@media(max-width:700px){.ceis-profile-layout{grid-template-columns:1fr}.ceis-profile-section-nav{grid-template-columns:repeat(2,minmax(0,1fr))}.ceis-contact-card{flex-wrap:wrap}}${preferences.reducedMotion ? ".ceis-profile *, .ceis-profile *::before, .ceis-profile *::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:0.01ms!important}" : ""}`}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <button type="button" onClick={leaveProfile} style={{ border: 0, background: "none", color: NAVY, padding: "4px 0", fontWeight: 700, cursor: "pointer", marginBottom: 14 }}>← Back to portal</button>
        <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap", background: WHITE, border: `1px solid ${BD}`, borderRadius: 12, padding: 22, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 54, height: 54, borderRadius: "50%", display: "grid", placeItems: "center", background: `${NAVY}0d`, color: NAVY }}><CircleUserRound size={30} strokeWidth={1.6} aria-hidden="true"/></div>
            <div>
              <h1 style={{ fontSize: 22, color: NK, margin: 0 }}>{user.name}</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: SL, marginTop: 5 }}>
                <span>Student account</span><span>·</span>
                <CheckCircle2 size={14} color={GREEN} aria-hidden="true"/>
                <span style={{ color: GREEN }}>{auth.currentUser?.emailVerified ? "Email verified" : "Email not verified"}</span>
              </div>
            </div>
          </div>
          <div style={{ minWidth: 230 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: MID, marginBottom: 7 }}>SAFETY SETUP · {completedSetup} OF 3</div>
            <div style={{ height: 8, borderRadius: 6, background: `${NAVY}12`, overflow: "hidden" }}>
              <div role="progressbar" aria-valuemin="0" aria-valuemax="3" aria-valuenow={completedSetup} aria-label={`${completedSetup} of 3 basic profile setup items complete`} style={{ width: `${completedSetup / 3 * 100}%`, height: "100%", background: GREEN, transition: "width .2s" }}/>
            </div>
            <div style={{ fontSize: 11, color: SL, marginTop: 6 }}>Setup checklist only — not a safety rating.</div>
          </div>
        </section>

        <div className="ceis-profile-layout">
          <nav className="ceis-profile-section-nav" aria-label="Profile sections">
            {SECTIONS.map(({ id, title, description, Icon }) => (
              <button key={id} type="button" onClick={() => { if (!confirmLeave()) return; setSection(id); setContactForm(null); setEditingContact(""); setForm({ fullName: user.name || "", faculty: user.faculty === "Faculty not listed" ? "" : user.faculty || "", department: user.dept || "", year: String(user.year || 1) }); setError(""); setNotice(""); }}
                aria-current={section === id ? "page" : undefined}
                style={{ textAlign: "left", display: "grid", gridTemplateColumns: "22px 1fr", gap: "2px 9px", alignItems: "center", border: 0, borderRadius: 7, padding: "11px 10px", cursor: "pointer", background: section === id ? `${NAVY}0c` : "transparent", color: section === id ? NAVY : SL }}>
                <Icon size={17} aria-hidden="true" style={{ gridRow: "span 2" }}/>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{title}</span>
                <span style={{ fontSize: 10.5, color: MID }}>{description}</span>
              </button>
            ))}
          </nav>

          <section aria-labelledby="profile-section-title" style={{ background: WHITE, border: `1px solid ${BD}`, borderRadius: 10, padding: 22, minHeight: 390 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, paddingBottom: 14, borderBottom: `1px solid ${BD}`, marginBottom: 18 }}>
              {selected && <selected.Icon size={20} color={NAVY} aria-hidden="true"/>}
              <div>
                <h2 id="profile-section-title" style={{ fontSize: 17, color: NK, margin: 0 }}>{selected?.title}</h2>
                <p style={{ fontSize: 12, color: SL, margin: "4px 0 0" }}>{selected?.description}</p>
              </div>
            </div>
            {error && <div role="alert" style={{ color: RED, background: REDL, borderRadius: 6, padding: 10, marginBottom: 14, fontSize: 12 }}>{error}</div>}
            {notice && <div role="status" style={{ color: GREEN, background: GREENL, borderRadius: 6, padding: 10, marginBottom: 14, fontSize: 12 }}>{notice}</div>}

            {section === "personal" && (
              <form onSubmit={saveProfile} style={{ maxWidth: 560 }}>
                <p style={{ color: SL, fontSize: 13, lineHeight: 1.6, margin: "0 0 16px" }}>Keep your university details accurate so authorized CEIS staff can identify your account when reviewing a report.</p>
                <Field label="Full name" autoComplete="name" maxLength={100} value={form.fullName} onChange={event => setForm({ ...form, fullName: event.target.value })}/>
                <Field label="University email (managed by UMP)" value={user.email || ""} readOnly/>
                <Field label="Faculty" maxLength={100} value={form.faculty} onChange={event => setForm({ ...form, faculty: event.target.value })}/>
                <Field label="Department (optional)" maxLength={100} value={form.department} onChange={event => setForm({ ...form, department: event.target.value })}/>
                <Field label="Year of study" type="number" min="1" max="8" value={form.year} onChange={event => setForm({ ...form, year: event.target.value })}/>
                <div style={{ fontSize: 12, color: MID, marginBottom: 14 }}>Campus: University of Mpumalanga · Mbombela</div>
                <button type="submit" disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: NAVY, color: WHITE, border: 0, borderRadius: 6, padding: "10px 15px", cursor: saving ? "wait" : "pointer", fontWeight: 700 }}><Save size={16} aria-hidden="true"/>{saving ? "Saving…" : "Save personal details"}</button>
              </form>
            )}

            {section === "contacts" && (
              <div>
                <div style={{ background: "#F5F7FC", border: `1px solid ${BD}`, borderRadius: 7, padding: 12, color: SL, fontSize: 12, lineHeight: 1.6, marginBottom: 16 }}>
                  Your contacts are stored in a private area visible only to your signed-in account. Adding a contact does <strong>not</strong> authorize or enable CEIS to notify them, and contacts are not currently shared with responders.
                </div>
                {loading ? <div role="status" style={{ padding: 20, color: MID }}>Loading private contacts…</div> : contacts.length === 0 ? <div style={{ padding: "18px 0", color: SL, fontSize: 13 }}>No emergency contacts added yet.</div> : (
                  <div style={{ display: "grid", gap: 9, marginBottom: 16 }}>
                    {contacts.map((contact, index) => (
                      <article key={contact.id} className="ceis-contact-card" style={{ border: `1px solid ${BD}`, borderRadius: 8, padding: 12 }}>
                        <div style={{ width: 34, height: 34, display: "grid", placeItems: "center", background: `${NAVY}0d`, color: NAVY, borderRadius: "50%" }}><UserRound size={17} aria-hidden="true"/></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: NK }}>{contact.name} {index === 0 && <span style={{ fontSize: 10, color: NAVY }}>· PRIMARY</span>}</div>
                          <div style={{ fontSize: 11.5, color: SL }}>{contact.relationship} · <a href={`tel:${contact.phone}`} style={{ color: NAVY }}>{contact.phone}</a></div>
                        </div>
                        <button type="button" aria-label={`Move ${contact.name} up`} disabled={index === 0 || saving} onClick={() => moveContact(index, -1)} style={{ border: `1px solid ${BD}`, background: WHITE, borderRadius: 5, padding: 6, color: NAVY, cursor: "pointer" }}><ArrowUp size={15}/></button>
                        <button type="button" aria-label={`Move ${contact.name} down`} disabled={index === contacts.length - 1 || saving} onClick={() => moveContact(index, 1)} style={{ border: `1px solid ${BD}`, background: WHITE, borderRadius: 5, padding: 6, color: NAVY, cursor: "pointer" }}><ArrowDown size={15}/></button>
                        <button type="button" aria-label={`Edit ${contact.name}`} onClick={() => { setEditingContact(contact.id); setContactForm({ name: contact.name, relationship: contact.relationship, phone: contact.phone }); }} style={{ border: `1px solid ${BD}`, background: WHITE, borderRadius: 5, padding: 6, color: NAVY, cursor: "pointer" }}>Edit</button>
                        <button type="button" aria-label={`Remove ${contact.name}`} disabled={saving} onClick={() => deleteContact(contact.id)} style={{ border: `1px solid ${BD}`, background: WHITE, borderRadius: 5, padding: 6, color: RED, cursor: "pointer" }}><Trash2 size={15}/></button>
                      </article>
                    ))}
                  </div>
                )}
                {!contactForm && contacts.length < 10 && <button type="button" onClick={() => { setEditingContact(""); setContactForm({ name: "", relationship: "", phone: "" }); }} style={{ display: "inline-flex", alignItems: "center", gap: 7, border: `1px solid ${NAVY}`, background: WHITE, color: NAVY, borderRadius: 6, padding: "9px 13px", fontWeight: 700, cursor: "pointer" }}><Plus size={16}/>Add emergency contact</button>}
                {contactForm && (
                  <form onSubmit={saveContact} style={{ maxWidth: 480, marginTop: 16, padding: 14, border: `1px solid ${BD}`, borderRadius: 8, background: "#FBFCFE" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <strong style={{ fontSize: 13, color: NK }}>{editingContact ? "Edit contact" : "Add emergency contact"}</strong>
                      <button type="button" aria-label="Close contact form" onClick={() => setContactForm(null)} style={{ border: 0, background: "none", cursor: "pointer", color: MID }}><X size={17}/></button>
                    </div>
                    <Field label="Name" autoComplete="name" maxLength={80} required value={contactForm.name} onChange={event => setContactForm({ ...contactForm, name: event.target.value })}/>
                    <Field label="Relationship" maxLength={50} required placeholder="e.g. Parent, friend, guardian" value={contactForm.relationship} onChange={event => setContactForm({ ...contactForm, relationship: event.target.value })}/>
                    <Field label="Telephone number" autoComplete="tel" type="tel" maxLength={24} required placeholder="082 123 4567 or +27821234567" value={contactForm.phone} onChange={event => setContactForm({ ...contactForm, phone: event.target.value })}/>
                    <button type="submit" disabled={saving} style={{ background: NAVY, color: WHITE, border: 0, borderRadius: 6, padding: "9px 13px", fontWeight: 700, cursor: "pointer" }}>{saving ? "Saving…" : "Save contact"}</button>
                  </form>
                )}
                {contacts.length > 0 && <div style={{ fontSize: 11, color: MID, marginTop: 13 }}>Primary contact: first in the list. Contact list last updated {contacts.map(contact => contact.updatedAt?.toDate?.()).filter(Boolean).sort((a,b) => b-a)[0]?.toLocaleDateString("en-ZA") || "when changed"}.</div>}
              </div>
            )}

            {section === "medical" && (
              <div>
                <div style={{ display: "flex", gap: 10, padding: 14, background: "#FFF8E8", border: "1px solid #EBD9A8", borderRadius: 8, marginBottom: 18 }}>
                  <LockKeyhole size={18} color="#856404" aria-hidden="true"/>
                  <p style={{ margin: 0, fontSize: 12, color: SL, lineHeight: 1.6 }}>CEIS does not currently collect medical or accessibility details. We are not enabling medical fields until a separately protected, audited responder-access workflow is available. Do not enter medical information in ordinary profile fields.</p>
                </div>
                <h3 style={{ fontSize: 14, color: NK }}>Accessibility</h3>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: 12, border: `1px solid ${BD}`, borderRadius: 7, cursor: "pointer", maxWidth: 500 }}>
                  <input type="checkbox" checked={preferences.reducedMotion} onChange={event => setReducedMotion(event.target.checked)} style={{ marginTop: 3 }}/>
                  <span><strong style={{ display: "block", fontSize: 12, color: NK }}>Reduce motion in this profile</strong><span style={{ fontSize: 11.5, color: SL }}>Persist this choice and reduce animation and transition effects in the profile view.</span></span>
                </label>
              </div>
            )}

            {section === "safety" && (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ border: `1px solid ${BD}`, borderRadius: 8, padding: 14 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: NK, fontWeight: 700 }}><MapPin size={17} color={NAVY}/>Location</div>
                  <p style={{ fontSize: 12, color: SL, lineHeight: 1.6, margin: "8px 0 0" }}>CEIS does not continuously track your location. Reports can include location only when you choose to capture it. SOS asks for current device location when activated; your browser may ask permission then.</p>
                </div>
                <div style={{ border: `1px solid ${BD}`, borderRadius: 8, padding: 14 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: NK, fontWeight: 700 }}><ClipboardCheck size={17} color={NAVY}/>Safety check-ins</div>
                  <p style={{ fontSize: 12, color: SL, lineHeight: 1.6, margin: "8px 0 0" }}>Check-ins are voluntary and manually submitted in the portal. Missed check-ins do not trigger automatic escalation, and contacts are not notified.</p>
                </div>
                <div style={{ border: `1px solid ${BD}`, borderRadius: 8, padding: 14 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: NK, fontWeight: 700 }}><Eye size={17} color={NAVY}/>Profile visibility</div>
                  <p style={{ fontSize: 12, color: SL, lineHeight: 1.6, margin: "8px 0 0" }}>Your basic university profile is available to your account and authorized administrators. Emergency contacts are stored separately and visible only to your account. They are not displayed on incident maps.</p>
                </div>
              </div>
            )}

            {section === "notifications" && (
              <div>
                <div style={{ maxWidth: 560, border: `1px solid ${BD}`, borderRadius: 8, padding: 16, marginBottom: 12 }}>
                  <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: NK, margin: "0 0 7px" }}><BellRing size={17} color={NAVY}/>Emergency notifications</h3>
                  <p style={{ fontSize: 12, color: SL, lineHeight: 1.6, margin: "0 0 14px" }}>Push alerts can be enabled for this device. Delivery depends on browser support, permission and device settings. CEIS currently does not provide category-by-category notification preferences or contact notifications.</p>
                  <PushNotificationsButton user={authUser}/>
                </div>
              </div>
            )}

            {section === "privacy" && (
              <div style={{ display: "grid", gap: 12, maxWidth: 600 }}>
                <div style={{ border: `1px solid ${BD}`, borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: MID, marginBottom: 5 }}>UNIVERSITY ACCOUNT</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: NK }}>{auth.currentUser?.emailVerified ? <CheckCircle2 size={16} color={GREEN}/> : <FileText size={16} color={RED}/>} {user.email} · {auth.currentUser?.emailVerified ? "Verified" : "Verification required"}</div>
                </div>
                <div style={{ border: `1px solid ${BD}`, borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: NK, marginBottom: 6 }}>Password</div>
                  <p style={{ fontSize: 12, color: SL, margin: "0 0 12px" }}>Request a password reset link for your university email.</p>
                  <button type="button" onClick={requestPasswordReset} style={{ border: `1px solid ${NAVY}`, color: NAVY, background: WHITE, borderRadius: 6, padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}>Send password reset email</button>
                  {resetStatus && <div role="status" style={{ color: GREEN, fontSize: 12, marginTop: 8 }}>{resetStatus}</div>}
                </div>
                <div style={{ border: `1px solid ${BD}`, borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: NK, marginBottom: 6 }}>Your safety data</div>
                  <p style={{ fontSize: 12, color: SL, lineHeight: 1.6, margin: 0 }}>You can correct or remove emergency contacts here. Medical data is not collected. Account deletion requests and data-retention schedules are not yet supported in this portal; contact UMP ICT/CEIS support for assistance.</p>
                </div>
                <button type="button" onClick={onLogout} style={{ justifySelf: "start", border: `1px solid ${RED}`, background: WHITE, color: RED, borderRadius: 6, padding: "9px 13px", fontWeight: 700, cursor: "pointer" }}>Sign out</button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
