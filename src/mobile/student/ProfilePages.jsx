import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, LifeBuoy, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import {
  listEmergencyContacts,
  removeEmergencyContact,
  reorderEmergencyContacts,
  saveEmergencyContact,
  saveStudentProfile,
} from "../../auth/studentProfile.js";
import { createCheckin, getCheckin } from "../../incidentApi.js";
import MedicalProfileForm from "../../components/MedicalProfileForm.jsx";
import { Page, Sheet } from "../ui.jsx";

function messageOf(error, fallback) {
  return error?.code === "permission-denied"
    ? "This change was blocked by the database security rules. Try again later."
    : error?.message || fallback;
}

export function PersonalDetailsPage({ user, authUser, onBack, onUserUpdated }) {
  const isStudent = user.portal !== "staff";
  const [form, setForm] = useState({
    fullName: user.name || "",
    faculty: user.faculty === "Faculty not listed" ? "" : user.faculty || "",
    department: user.dept || "",
    year: String(user.year || 1),
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ kind: "", text: "" });

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setStatus({ kind: "", text: "" });
    try {
      const saved = await saveStudentProfile(authUser, form);
      onUserUpdated({ name: saved.fullName, faculty: saved.faculty || "Faculty not listed", dept: saved.department, year: saved.year });
      setStatus({ kind: "ok", text: "Saved." });
    } catch (error) {
      setStatus({ kind: "error", text: messageOf(error, "Could not save your details.") });
    } finally {
      setSaving(false);
    }
  }

  const field = (key, label, props = {}) => (
    <label className="m-field">
      <span className="m-field-label">{label}</span>
      <input className="m-input" value={form[key]} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} {...props} />
    </label>
  );

  return (
    <Page title="Personal details" onBack={onBack}>
      <form onSubmit={save} className="m-card">
        {field("fullName", "Full name", { autoComplete: "name", maxLength: 100, required: true })}
        <label className="m-field">
          <span className="m-field-label">University email</span>
          <input className="m-input" value={user.email || ""} readOnly style={{ color: "var(--m-text-3)" }} />
        </label>
        {field("faculty", "Faculty", { maxLength: 100 })}
        {field("department", "Department (optional)", { maxLength: 100 })}
        {isStudent && field("year", "Year of study", { type: "number", inputMode: "numeric", min: 1, max: 8 })}
        {status.text && <div className={`m-alert m-alert--${status.kind}`} role="status" style={{ marginBottom: 12 }}>{status.text}</div>}
        <button type="submit" className="m-btn m-btn--primary m-btn--block" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </form>
    </Page>
  );
}

const EMPTY_CONTACT = { name: "", relationship: "", phone: "" };

export function EmergencyContactsPage({ authUser, onBack }) {
  const [contacts, setContacts] = useState(null);
  const [editing, setEditing] = useState(null); // { id|null, values }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setContacts(await listEmergencyContacts(authUser));
    } catch (loadError) {
      setError(messageOf(loadError, "Could not load your contacts."));
    }
  }, [authUser]);

  useEffect(() => { refresh(); }, [refresh]);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (editing.id) await saveEmergencyContact(authUser, editing.values, editing.id);
      else await saveEmergencyContact(authUser, { ...editing.values, order: contacts.length });
      setEditing(null);
      await refresh();
    } catch (saveError) {
      setError(messageOf(saveError, "Could not save this contact."));
    } finally {
      setBusy(false);
    }
  }

  async function remove(contact) {
    if (!window.confirm(`Remove ${contact.name} from your emergency contacts?`)) return;
    setBusy(true);
    setError("");
    try {
      await removeEmergencyContact(authUser, contact.id);
      const remaining = await listEmergencyContacts(authUser);
      if (remaining.length) await reorderEmergencyContacts(authUser, remaining);
      await refresh();
    } catch (removeError) {
      setError(messageOf(removeError, "Could not remove this contact."));
    } finally {
      setBusy(false);
    }
  }

  async function move(index, offset) {
    const next = index + offset;
    if (next < 0 || next >= contacts.length) return;
    const ordered = [...contacts];
    [ordered[index], ordered[next]] = [ordered[next], ordered[index]];
    setBusy(true);
    try {
      await reorderEmergencyContacts(authUser, ordered);
      setContacts(ordered);
    } catch (moveError) {
      setError(messageOf(moveError, "Could not reorder contacts."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="Emergency contacts" onBack={onBack}
      right={contacts && contacts.length < 10 ? <button type="button" className="m-icon-btn" aria-label="Add contact" onClick={() => setEditing({ id: null, values: EMPTY_CONTACT })}><Plus size={24} aria-hidden="true" /></button> : null}>
      <p className="m-muted" style={{ margin: "0 6px 12px" }}>When you report an incident or raise an SOS, campus administrators and your responder can see these so they can reach your people. CEIS does not contact them automatically.</p>
      {error && <div className="m-alert m-alert--error" role="alert" style={{ marginBottom: 12 }}>{error}</div>}
      {contacts === null ? <p className="m-muted" role="status">Loading…</p> : contacts.length === 0 ? (
        <div className="m-card" style={{ textAlign: "center" }}>
          <p style={{ margin: "0 0 12px" }}>No emergency contacts yet.</p>
          <button type="button" className="m-btn m-btn--tinted" onClick={() => setEditing({ id: null, values: EMPTY_CONTACT })}><Plus size={18} aria-hidden="true" />Add a contact</button>
        </div>
      ) : (
        <div className="m-group">
          {contacts.map((contact, index) => (
            <div key={contact.id} className="m-row" style={{ cursor: "default" }}>
              <span className="m-row-icon" style={{ background: index === 0 ? "var(--m-red)" : "#8E8E93" }}><UserRound size={17} aria-hidden="true" /></span>
              <span className="m-row-main">
                <span className="m-row-label">{contact.name}{index === 0 && <span className="m-chip m-chip--red" style={{ marginLeft: 6, fontSize: 11 }}>Primary</span>}</span>
                <span className="m-row-detail" style={{ display: "block" }}>{contact.relationship} · <a href={`tel:${contact.phone}`}>{contact.phone}</a></span>
              </span>
              <button type="button" className="m-icon-btn" style={{ width: 34, height: 34 }} aria-label={`Move ${contact.name} up`} disabled={busy || index === 0} onClick={() => move(index, -1)}><ArrowUp size={17} aria-hidden="true" /></button>
              <button type="button" className="m-icon-btn" style={{ width: 34, height: 34 }} aria-label={`Move ${contact.name} down`} disabled={busy || index === contacts.length - 1} onClick={() => move(index, 1)}><ArrowDown size={17} aria-hidden="true" /></button>
              <button type="button" className="m-icon-btn" style={{ width: 34, height: 34 }} aria-label={`Edit ${contact.name}`} onClick={() => setEditing({ id: contact.id, values: { name: contact.name, relationship: contact.relationship, phone: contact.phone } })}><Pencil size={16} aria-hidden="true" /></button>
              <button type="button" className="m-icon-btn" style={{ width: 34, height: 34, color: "var(--m-red)" }} aria-label={`Remove ${contact.name}`} disabled={busy} onClick={() => remove(contact)}><Trash2 size={16} aria-hidden="true" /></button>
            </div>
          ))}
        </div>
      )}

      <Sheet open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? "Edit contact" : "New contact"}>
        {editing && (
          <form onSubmit={save}>
            {[["name", "Name", { autoComplete: "name", maxLength: 80 }], ["relationship", "Relationship", { maxLength: 50, placeholder: "e.g. Parent, partner, friend" }], ["phone", "Phone number", { type: "tel", autoComplete: "tel", maxLength: 24, placeholder: "082 123 4567" }]].map(([key, label, props]) => (
              <label key={key} className="m-field">
                <span className="m-field-label">{label}</span>
                <input className="m-input" required value={editing.values[key]} onChange={event => setEditing(current => ({ ...current, values: { ...current.values, [key]: event.target.value } }))} {...props} />
              </label>
            ))}
            {error && <div className="m-alert m-alert--error" role="alert" style={{ marginBottom: 12 }}>{error}</div>}
            <button type="submit" className="m-btn m-btn--primary m-btn--block" disabled={busy}>{busy ? "Saving…" : "Save contact"}</button>
          </form>
        )}
      </Sheet>
    </Page>
  );
}

export function MedicalPage({ authUser, onBack }) {
  const [dirty, setDirty] = useState(false);
  const back = () => { if (!dirty || window.confirm("Leave without saving your medical details?")) onBack(); };
  return (
    <Page title="Medical & accessibility" onBack={back}>
      <div className="m-card m-embed"><MedicalProfileForm authUser={authUser} onDirtyChange={setDirty} /></div>
    </Page>
  );
}

export function CheckinPage({ authUser, onBack, onStatusChange }) {
  const [status, setStatus] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getCheckin(authUser)
      .then(checkin => { setStatus(checkin?.status || null); setUpdatedAt(checkin?.created_at ? new Date(checkin.created_at) : null); })
      .catch(loadError => setError(messageOf(loadError, "Could not load your safety status.")));
  }, [authUser]);

  async function set(next) {
    setBusy(next);
    setError("");
    try {
      await createCheckin(authUser, { status: next });
      setStatus(next);
      setUpdatedAt(new Date());
      onStatusChange?.(next);
    } catch (saveError) {
      setError(messageOf(saveError, "Your check-in could not be saved."));
    } finally {
      setBusy("");
    }
  }

  return (
    <Page title="Safety check-in" onBack={onBack}>
      <p className="m-muted" style={{ margin: "0 6px 14px" }}>During a campus emergency, let security know whether you are safe.</p>
      {status && (
        <div className={`m-alert ${status === "safe" ? "m-alert--ok" : "m-alert--error"}`} role="status" style={{ marginBottom: 14, display: "flex", gap: 10, alignItems: "center" }}>
          {status === "safe" ? <CheckCircle2 size={22} aria-hidden="true" /> : <LifeBuoy size={22} aria-hidden="true" />}
          <span><strong>{status === "safe" ? "You're marked safe" : "Help requested"}</strong>{updatedAt ? ` · ${updatedAt.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}` : ""}{status === "help" ? ". If you are in danger, call Campus Security now." : ""}</span>
        </div>
      )}
      {error && <div className="m-alert m-alert--error" role="alert" style={{ marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "grid", gap: 12 }}>
        <button type="button" className="m-btn m-btn--success m-btn--block" style={{ minHeight: 76, fontSize: 19 }} disabled={busy !== ""} onClick={() => set("safe")}><CheckCircle2 size={24} aria-hidden="true" />{busy === "safe" ? "Saving…" : "I'm safe"}</button>
        <button type="button" className="m-btn m-btn--danger m-btn--block" style={{ minHeight: 76, fontSize: 19 }} disabled={busy !== ""} onClick={() => set("help")}><LifeBuoy size={24} aria-hidden="true" />{busy === "help" ? "Saving…" : "I need help"}</button>
      </div>
    </Page>
  );
}
