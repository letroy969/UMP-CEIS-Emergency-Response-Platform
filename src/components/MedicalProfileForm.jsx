import { useCallback, useEffect, useMemo, useState } from "react";
import { HeartPulse, LockKeyhole, Plus, Save, Trash2 } from "lucide-react";
import { BD, GREEN, GREENL, MID, NAVY, NK, RED, REDL, SL, WHITE } from "../constants.js";
import { deleteMedicalProfile, getMedicalProfile, saveMedicalProfile } from "../auth/studentProfile.js";
import {
  ACCESS_NEEDS,
  ALLERGY_STATUS,
  ALLERGY_TYPES,
  CONDITION_STATUS,
  DEVICES,
  emptyMedicalProfile,
  emptyMedication,
  FREQUENCIES,
  LONG_TEXT,
  MAX_MEDICATIONS,
  SEVERITIES,
  SHORT_TEXT,
  YES_NO,
} from "../medical/medicalProfile.js";

const inputStyle = { display: "block", width: "100%", marginTop: 6, padding: "9px 11px", border: `1px solid ${BD}`, borderRadius: 6, background: WHITE, color: NK, fontSize: 13.5, fontFamily: "inherit" };
const labelStyle = { display: "block", fontSize: 12, fontWeight: 700, color: MID, marginBottom: 14 };
const hintStyle = { fontWeight: 400, color: SL };

function Text({ label, value, onChange, optional, multiline, max = SHORT_TEXT, placeholder }) {
  const Tag = multiline ? "textarea" : "input";
  return (
    <label style={labelStyle}>
      {label}{optional && <span style={hintStyle}> (optional)</span>}
      <Tag value={value} maxLength={max} placeholder={placeholder} onChange={event => onChange(event.target.value)} rows={multiline ? 3 : undefined} style={{ ...inputStyle, resize: multiline ? "vertical" : undefined }} />
    </label>
  );
}

function Radios({ label, name, options, value, onChange }) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: "0 0 14px" }}>
      <legend style={{ fontSize: 12, fontWeight: 700, color: MID, marginBottom: 6 }}>{label}</legend>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map(([key, text]) => (
          <label key={key} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 11px", border: `1.5px solid ${value === key ? NAVY : BD}`, borderRadius: 999, background: value === key ? `${NAVY}0d` : WHITE, color: value === key ? NAVY : SL, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            <input type="radio" name={name} value={key} checked={value === key} onChange={() => onChange(key)} style={{ accentColor: NAVY }} />
            {text}
          </label>
        ))}
        {value && (
          <button type="button" onClick={() => onChange("")} style={{ border: 0, background: "none", color: MID, fontSize: 11.5, cursor: "pointer", textDecoration: "underline" }}>Clear</button>
        )}
      </div>
    </fieldset>
  );
}

function Checks({ label, options, value, onChange }) {
  const toggle = key => onChange(value.includes(key) ? value.filter(item => item !== key) : [...value, key]);
  return (
    <fieldset style={{ border: 0, padding: 0, margin: "0 0 14px" }}>
      <legend style={{ fontSize: 12, fontWeight: 700, color: MID, marginBottom: 6 }}>{label}</legend>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 6 }}>
        {options.map(([key, text]) => (
          <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: NK, cursor: "pointer" }}>
            <input type="checkbox" checked={value.includes(key)} onChange={() => toggle(key)} style={{ accentColor: NAVY, width: 16, height: 16 }} />
            {text}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Select({ label, options, value, onChange, optional }) {
  return (
    <label style={labelStyle}>
      {label}{optional && <span style={hintStyle}> (optional)</span>}
      <select value={value} onChange={event => onChange(event.target.value)} style={inputStyle}>
        <option value="">Not specified</option>
        {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
      </select>
    </label>
  );
}

function Block({ letter, title, description, children }) {
  return (
    <section style={{ border: `1px solid ${BD}`, borderRadius: 9, padding: "16px 16px 4px", marginBottom: 14 }}>
      <h3 style={{ fontSize: 14, color: NK, margin: 0 }}><span style={{ color: NAVY }}>{letter}.</span> {title}</h3>
      <p style={{ fontSize: 12, color: SL, margin: "4px 0 14px" }}>{description}</p>
      {children}
    </section>
  );
}

function Indented({ children }) {
  return <div style={{ borderLeft: `3px solid ${NAVY}22`, paddingLeft: 14, marginBottom: 6 }}>{children}</div>;
}

export default function MedicalProfileForm({ authUser, onDirtyChange }) {
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(emptyMedicalProfile);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const stored = await getMedicalProfile(authUser);
      const { updatedAt: storedAt, ...profile } = stored || emptyMedicalProfile();
      setSaved(stored ? profile : null);
      setForm(profile);
      setUpdatedAt(storedAt || null);
    } catch (loadError) {
      setError(loadError.code === "permission-denied"
        ? "Your medical details could not be loaded. The latest security rules may not be deployed yet."
        : loadError.message || "Could not load your medical details.");
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => { load(); }, [load]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved || emptyMedicalProfile()), [form, saved]);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const set = (section, field) => value => setForm(current => ({ ...current, [section]: { ...current[section], [field]: value } }));
  const setItem = (index, field) => value => setForm(current => ({
    ...current,
    medication: { ...current.medication, items: current.medication.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)) },
  }));

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const normalized = await saveMedicalProfile(authUser, form);
      setSaved(normalized);
      setForm(normalized);
      setUpdatedAt(new Date());
      setNotice("Medical and accessibility details saved.");
    } catch (saveError) {
      setError(saveError.code === "permission-denied"
        ? "Saving was blocked by the database security rules. Ask the CEIS team to deploy the latest rules."
        : saveError.message || "Could not save your medical details.");
    } finally {
      setSaving(false);
    }
  }

  async function removeAll() {
    if (!window.confirm("Delete all of your medical and accessibility details? Responders will no longer see them.")) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await deleteMedicalProfile(authUser);
      setSaved(null);
      setForm(emptyMedicalProfile());
      setUpdatedAt(null);
      setNotice("Your medical and accessibility details were deleted.");
    } catch (deleteError) {
      setError(deleteError.message || "Could not delete your medical details.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div role="status" style={{ padding: 20, color: MID }}>Loading your medical details…</div>;

  const { allergies: a, conditions: c, medication: m, accessibility: s, instructions: i } = form;
  const allergyDetails = a.has === "yes" || a.has === "unsure";

  return (
    <form onSubmit={save}>
      <div style={{ display: "flex", gap: 10, padding: 14, background: "#F2F6FC", border: `1px solid ${BD}`, borderRadius: 8, marginBottom: 16 }}>
        <HeartPulse size={20} color={NAVY} aria-hidden="true" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: 12.5, color: SL, lineHeight: 1.6 }}>
          <strong style={{ display: "block", color: NK, fontSize: 14 }}>Medical & Accessibility Information <span style={{ fontSize: 11, fontWeight: 700, color: MID, border: `1px solid ${BD}`, borderRadius: 4, padding: "1px 6px", marginLeft: 4 }}>Optional</span></strong>
          Help us respond appropriately during an emergency. Every question is optional — share only what you are comfortable with.
        </div>
      </div>

      {error && <div role="alert" style={{ color: RED, background: REDL, borderRadius: 6, padding: 10, marginBottom: 14, fontSize: 12 }}>{error}</div>}
      {notice && <div role="status" style={{ color: GREEN, background: GREENL, borderRadius: 6, padding: 10, marginBottom: 14, fontSize: 12 }}>{notice}</div>}

      <Block letter="A" title="Allergies" description="Identify substances that may trigger an allergic reaction.">
        <Radios label="Do you have any known allergies?" name="allergies-has" options={ALLERGY_STATUS} value={a.has} onChange={set("allergies", "has")} />
        {allergyDetails && (
          <Indented>
            <Checks label="Allergy type" options={ALLERGY_TYPES} value={a.types} onChange={set("allergies", "types")} />
            <Text label="Specific allergen(s)" value={a.allergens} onChange={set("allergies", "allergens")} multiline max={LONG_TEXT} placeholder="e.g. peanuts, penicillin, bee stings" />
            <Select label="Severity" options={SEVERITIES} value={a.severity} onChange={set("allergies", "severity")} />
            <Text label="Known reactions or symptoms" value={a.reactions} onChange={set("allergies", "reactions")} multiline max={LONG_TEXT} />
            <Text label="Emergency precautions or instructions" value={a.precautions} onChange={set("allergies", "precautions")} multiline max={LONG_TEXT} />
          </Indented>
        )}
      </Block>

      <Block letter="B" title="Medical Conditions & History" description="Record relevant pre-existing medical conditions.">
        <Radios label="Do you have any existing medical conditions?" name="conditions-has" options={CONDITION_STATUS} value={c.has} onChange={set("conditions", "has")} />
        {c.has === "yes" && (
          <Indented>
            <Text label="Medical condition(s)" value={c.conditions} onChange={set("conditions", "conditions")} multiline max={LONG_TEXT} placeholder="e.g. asthma, epilepsy, diabetes" />
            <Text label="Relevant medical history" value={c.history} onChange={set("conditions", "history")} multiline max={LONG_TEXT} />
          </Indented>
        )}
        <Radios label="History of seizures or fainting" name="conditions-seizures" options={YES_NO} value={c.seizuresOrFainting} onChange={set("conditions", "seizuresOrFainting")} />
        <Text label="History of severe medical emergencies" optional value={c.severeEmergencies} onChange={set("conditions", "severeEmergencies")} multiline max={LONG_TEXT} />
        <Text label="Additional medical information" value={c.additional} onChange={set("conditions", "additional")} multiline max={LONG_TEXT} />
      </Block>

      <Block letter="C" title="Current Medication & Prescriptions" description="Information about medication that may be relevant during an emergency.">
        <Radios label="Are you currently taking medication?" name="medication-taking" options={YES_NO} value={m.taking} onChange={value => setForm(current => ({ ...current, medication: { ...current.medication, taking: value, items: value === "yes" && !current.medication.items.length ? [emptyMedication()] : current.medication.items } }))} />
        {m.taking === "yes" && (
          <Indented>
            {m.items.map((item, index) => (
              <div key={index} style={{ border: `1px solid ${BD}`, borderRadius: 7, padding: "12px 12px 0", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <strong style={{ fontSize: 12.5, color: NK }}>Medication {index + 1}</strong>
                  <button type="button" aria-label={`Remove medication ${index + 1}`} onClick={() => setForm(current => ({ ...current, medication: { ...current.medication, items: current.medication.items.filter((_, i) => i !== index) } }))} style={{ border: 0, background: "none", color: RED, cursor: "pointer" }}><Trash2 size={15} aria-hidden="true" /></button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", columnGap: 12 }}>
                  <Text label="Medication name" value={item.name} onChange={setItem(index, "name")} />
                  <Text label="Dosage" optional value={item.dosage} onChange={setItem(index, "dosage")} placeholder="e.g. 100 mg" />
                  <Select label="Frequency" options={FREQUENCIES} value={item.frequency} onChange={setItem(index, "frequency")} />
                  {item.frequency === "other" && <Text label="Describe frequency" value={item.frequencyOther} onChange={setItem(index, "frequencyOther")} />}
                  <Text label="Reason for medication" optional value={item.reason} onChange={setItem(index, "reason")} />
                </div>
              </div>
            ))}
            {m.items.length < MAX_MEDICATIONS && (
              <button type="button" onClick={() => setForm(current => ({ ...current, medication: { ...current.medication, items: [...current.medication.items, emptyMedication()] } }))} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${NAVY}`, background: WHITE, color: NAVY, borderRadius: 6, padding: "7px 11px", fontWeight: 700, cursor: "pointer", marginBottom: 14 }}><Plus size={15} aria-hidden="true" />Add medication</button>
            )}
          </Indented>
        )}
        <Radios label="Do you carry emergency medication?" name="medication-emergency" options={YES_NO} value={m.carriesEmergency} onChange={set("medication", "carriesEmergency")} />
        {m.carriesEmergency === "yes" && (
          <Indented>
            <Text label="Emergency medication type" value={m.emergencyType} onChange={set("medication", "emergencyType")} placeholder="e.g. EpiPen, inhaler, insulin" />
            <Text label="Where is it normally kept?" optional value={m.keptWhere} onChange={set("medication", "keptWhere")} placeholder="e.g. front pocket of my backpack" />
          </Indented>
        )}
      </Block>

      <Block letter="D" title="Accessibility & Special Assistance" description="Help responders understand any assistance or accommodation requirements.">
        <Radios label="Do you require accessibility assistance?" name="access-needs" options={YES_NO} value={s.needsAssistance} onChange={set("accessibility", "needsAssistance")} />
        {s.needsAssistance === "yes" && (
          <Indented>
            <Checks label="Accessibility requirements" options={ACCESS_NEEDS} value={s.needs} onChange={set("accessibility", "needs")} />
            {s.needs.includes("other") && <Text label="Other requirement" value={s.otherNeed} onChange={set("accessibility", "otherNeed")} />}
          </Indented>
        )}
        <Radios label="Do you use a mobility or assistive device?" name="access-device" options={YES_NO} value={s.usesDevice} onChange={set("accessibility", "usesDevice")} />
        {s.usesDevice === "yes" && (
          <Indented>
            <Checks label="Device type" options={DEVICES} value={s.devices} onChange={set("accessibility", "devices")} />
            {s.devices.includes("other") && <Text label="Other device" value={s.otherDevice} onChange={set("accessibility", "otherDevice")} />}
          </Indented>
        )}
        <Radios label="Do you require assistance evacuating a building?" name="access-evacuation" options={YES_NO} value={s.evacuationHelp} onChange={set("accessibility", "evacuationHelp")} />
        <Text label="Preferred communication method" value={s.communication} onChange={set("accessibility", "communication")} placeholder="e.g. written notes, sign language, speak slowly" />
        <Text label="Additional assistance instructions" value={s.instructions} onChange={set("accessibility", "instructions")} multiline max={LONG_TEXT} />
      </Block>

      <Block letter="E" title="Emergency Medical Instructions" description="Important information responders should know.">
        <Text label="What should emergency responders know about your medical needs?" value={i.needs} onChange={set("instructions", "needs")} multiline max={LONG_TEXT} />
        <Text label="Are there any specific emergency precautions?" value={i.precautions} onChange={set("instructions", "precautions")} multiline max={LONG_TEXT} />
        <Text label="Is there anything responders should avoid?" optional value={i.avoid} onChange={set("instructions", "avoid")} multiline max={LONG_TEXT} />
        <Text label="Additional emergency instructions" value={i.additional} onChange={set("instructions", "additional")} multiline max={LONG_TEXT} />
      </Block>

      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 14, border: `1.5px solid ${form.consent ? GREEN : BD}`, borderRadius: 8, background: form.consent ? GREENL : WHITE, marginBottom: 14, cursor: "pointer" }}>
        <input type="checkbox" checked={form.consent} onChange={event => setForm(current => ({ ...current, consent: event.target.checked }))} style={{ accentColor: GREEN, width: 17, height: 17, marginTop: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, color: NK, lineHeight: 1.6 }}>
          <strong>I consent</strong> to CEIS sharing these details with campus administrators and the responders handling an emergency I report or raise an SOS for. <span style={{ color: SL }}>Each time someone views them it is recorded. You can change or delete these details at any time.</span>
        </span>
      </label>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" disabled={saving || !form.consent || !dirty} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: NAVY, color: WHITE, border: 0, borderRadius: 6, padding: "10px 15px", cursor: saving ? "wait" : "pointer", fontWeight: 700, opacity: saving || !form.consent || !dirty ? 0.55 : 1 }}>
          <Save size={16} aria-hidden="true" />{saving ? "Saving…" : "Save medical details"}
        </button>
        {saved && (
          <button type="button" onClick={removeAll} disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${RED}`, background: WHITE, color: RED, borderRadius: 6, padding: "9px 13px", fontWeight: 700, cursor: "pointer" }}>
            <Trash2 size={15} aria-hidden="true" />Delete all medical details
          </button>
        )}
        <span style={{ fontSize: 11.5, color: MID }}>
          {!form.consent ? "Tick the consent box to save." : dirty ? "You have unsaved changes." : updatedAt ? `Last saved ${updatedAt.toLocaleDateString("en-ZA")}.` : ""}
        </span>
      </div>

      <p style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: 11.5, color: MID, marginTop: 14, lineHeight: 1.6 }}>
        <LockKeyhole size={14} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
        Stored in a private part of your account. Only you can edit it. Administrators and the responder handling your incident can view it through CEIS, and each view is logged on the incident. It is never shown on maps or to other students.
      </p>
    </form>
  );
}
