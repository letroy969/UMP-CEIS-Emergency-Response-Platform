// Shared model for the optional Medical & Accessibility profile. Used by the
// profile form (to validate before saving) and by the API (to sanitise what it
// returns to responders), so both sides agree on the exact shape.
// Pure module: no Firebase imports, safe to load in the browser and in Node.

export const YES_NO = Object.freeze([["yes", "Yes"], ["no", "No"]]);
export const ALLERGY_STATUS = Object.freeze([["yes", "Yes"], ["no", "No"], ["unsure", "Unsure"]]);
export const CONDITION_STATUS = Object.freeze([["yes", "Yes"], ["no", "No"], ["prefer_not", "Prefer not to disclose"]]);
export const ALLERGY_TYPES = Object.freeze([["food", "Food"], ["medication", "Medication"], ["insect", "Insect"], ["environmental", "Environmental"], ["other", "Other"]]);
export const SEVERITIES = Object.freeze([["mild", "Mild"], ["moderate", "Moderate"], ["severe", "Severe"], ["life_threatening", "Life-threatening"]]);
export const FREQUENCIES = Object.freeze([["daily", "Daily"], ["weekly", "Weekly"], ["as_needed", "As needed"], ["other", "Other"]]);
export const ACCESS_NEEDS = Object.freeze([
  ["mobility", "Mobility assistance"],
  ["visual", "Visual impairment"],
  ["hearing", "Hearing impairment"],
  ["speech", "Speech or communication assistance"],
  ["cognitive", "Cognitive or learning assistance"],
  ["other", "Other"],
]);
export const DEVICES = Object.freeze([["wheelchair", "Wheelchair"], ["crutches", "Crutches"], ["hearing_aid", "Hearing aid"], ["walking_stick", "Walking stick"], ["other", "Other"]]);

export const SHORT_TEXT = 200;
export const LONG_TEXT = 1000;
export const MAX_MEDICATIONS = 10;

const SECTION_KEYS = ["allergies", "conditions", "medication", "accessibility", "instructions"];

export function emptyMedication() {
  return { name: "", dosage: "", frequency: "", frequencyOther: "", reason: "" };
}

export function emptyMedicalProfile() {
  return {
    consent: false,
    allergies: { has: "", types: [], allergens: "", severity: "", reactions: "", precautions: "" },
    conditions: { has: "", conditions: "", history: "", seizuresOrFainting: "", severeEmergencies: "", additional: "" },
    medication: { taking: "", items: [], carriesEmergency: "", emergencyType: "", keptWhere: "" },
    accessibility: { needsAssistance: "", needs: [], otherNeed: "", usesDevice: "", devices: [], otherDevice: "", evacuationHelp: "", communication: "", instructions: "" },
    instructions: { needs: "", precautions: "", avoid: "", additional: "" },
  };
}

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function choice(value, options, label) {
  if (value == null || value === "") return "";
  if (!options.some(([key]) => key === value)) invalid(`Choose a valid option for “${label}”.`);
  return value;
}

function choices(value, options, label) {
  if (value == null) return [];
  if (!Array.isArray(value)) invalid(`Choose valid options for “${label}”.`);
  const allowed = new Set(options.map(([key]) => key));
  const picked = [...new Set(value)];
  if (picked.some(item => !allowed.has(item))) invalid(`Choose valid options for “${label}”.`);
  return options.map(([key]) => key).filter(key => picked.includes(key));
}

function textValue(value, label, max) {
  if (value == null) return "";
  if (typeof value !== "string") invalid(`“${label}” must be text.`);
  // Strip control characters except newlines and tabs, then trim.
  const cleaned = [...value].filter(character => {
    const code = character.charCodeAt(0);
    return code >= 32 || code === 10 || code === 9;
  }).join("").trim();
  if (cleaned.length > max) invalid(`Keep “${label}” under ${max} characters.`);
  return cleaned;
}

// Normalises user input into the stored shape. Answering "No" to a section's
// gate question clears its detail fields so stale details are never shown to
// responders. Throws a 400-style error for anything malformed.
export function normalizeMedicalProfile(input, { requireConsent = true } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid("Provide your medical and accessibility details.");
  if (requireConsent && input.consent !== true) {
    invalid("Tick the consent box so CEIS may share these details with responders handling your emergencies.");
  }
  const a = input.allergies || {};
  const c = input.conditions || {};
  const m = input.medication || {};
  const s = input.accessibility || {};
  const i = input.instructions || {};

  const allergiesHas = choice(a.has, ALLERGY_STATUS, "Known allergies");
  const allergyDetails = allergiesHas === "yes" || allergiesHas === "unsure";
  const conditionsHas = choice(c.has, CONDITION_STATUS, "Existing medical conditions");
  const conditionDetails = conditionsHas === "yes";
  const taking = choice(m.taking, YES_NO, "Currently taking medication");
  const carriesEmergency = choice(m.carriesEmergency, YES_NO, "Carries emergency medication");
  const needsAssistance = choice(s.needsAssistance, YES_NO, "Requires accessibility assistance");
  const usesDevice = choice(s.usesDevice, YES_NO, "Uses a mobility or assistive device");

  if (m.items != null && !Array.isArray(m.items)) invalid("Medication list is invalid.");
  const rawItems = taking === "yes" ? (m.items || []) : [];
  if (rawItems.length > MAX_MEDICATIONS) invalid(`List at most ${MAX_MEDICATIONS} medications.`);
  const items = rawItems
    .map((item, index) => {
      const label = `Medication ${index + 1}`;
      const frequency = choice(item?.frequency, FREQUENCIES, `${label} frequency`);
      return {
        name: textValue(item?.name, `${label} name`, SHORT_TEXT),
        dosage: textValue(item?.dosage, `${label} dosage`, SHORT_TEXT),
        frequency,
        frequencyOther: frequency === "other" ? textValue(item?.frequencyOther, `${label} frequency`, SHORT_TEXT) : "",
        reason: textValue(item?.reason, `${label} reason`, SHORT_TEXT),
      };
    })
    .filter(item => item.name || item.dosage || item.reason);
  if (items.some(item => !item.name)) invalid("Enter a name for each medication, or remove the empty row.");

  const needs = needsAssistance === "yes" ? choices(s.needs, ACCESS_NEEDS, "Accessibility requirements") : [];
  const devices = usesDevice === "yes" ? choices(s.devices, DEVICES, "Device type") : [];

  return {
    consent: input.consent === true,
    allergies: {
      has: allergiesHas,
      types: allergyDetails ? choices(a.types, ALLERGY_TYPES, "Allergy type") : [],
      allergens: allergyDetails ? textValue(a.allergens, "Specific allergens", LONG_TEXT) : "",
      severity: allergyDetails ? choice(a.severity, SEVERITIES, "Severity") : "",
      reactions: allergyDetails ? textValue(a.reactions, "Known reactions or symptoms", LONG_TEXT) : "",
      precautions: allergyDetails ? textValue(a.precautions, "Emergency precautions", LONG_TEXT) : "",
    },
    conditions: {
      has: conditionsHas,
      conditions: conditionDetails ? textValue(c.conditions, "Medical conditions", LONG_TEXT) : "",
      history: conditionDetails ? textValue(c.history, "Relevant medical history", LONG_TEXT) : "",
      seizuresOrFainting: choice(c.seizuresOrFainting, YES_NO, "History of seizures or fainting"),
      severeEmergencies: textValue(c.severeEmergencies, "History of severe medical emergencies", LONG_TEXT),
      additional: textValue(c.additional, "Additional medical information", LONG_TEXT),
    },
    medication: {
      taking,
      items,
      carriesEmergency,
      emergencyType: carriesEmergency === "yes" ? textValue(m.emergencyType, "Emergency medication type", SHORT_TEXT) : "",
      keptWhere: carriesEmergency === "yes" ? textValue(m.keptWhere, "Where emergency medication is kept", SHORT_TEXT) : "",
    },
    accessibility: {
      needsAssistance,
      needs,
      otherNeed: needs.includes("other") ? textValue(s.otherNeed, "Other accessibility requirement", SHORT_TEXT) : "",
      usesDevice,
      devices,
      otherDevice: devices.includes("other") ? textValue(s.otherDevice, "Other device", SHORT_TEXT) : "",
      evacuationHelp: choice(s.evacuationHelp, YES_NO, "Requires assistance evacuating"),
      communication: textValue(s.communication, "Preferred communication method", SHORT_TEXT),
      instructions: textValue(s.instructions, "Additional assistance instructions", LONG_TEXT),
    },
    instructions: {
      needs: textValue(i.needs, "What responders should know", LONG_TEXT),
      precautions: textValue(i.precautions, "Specific emergency precautions", LONG_TEXT),
      avoid: textValue(i.avoid, "Anything responders should avoid", LONG_TEXT),
      additional: textValue(i.additional, "Additional emergency instructions", LONG_TEXT),
    },
  };
}

// Fills gaps in a stored record (e.g. fields added after it was saved) so the
// form and responder views can rely on every key existing.
export function withDefaults(stored) {
  const base = emptyMedicalProfile();
  if (!stored || typeof stored !== "object") return base;
  const merged = { ...base, consent: stored.consent === true };
  for (const key of SECTION_KEYS) merged[key] = { ...base[key], ...(stored[key] || {}) };
  return merged;
}

// Highest-priority facts for a responder arriving on scene, in display order.
export function criticalAlerts(profile) {
  const p = withDefaults(profile);
  const alerts = [];
  if (p.allergies.severity === "life_threatening" || p.allergies.severity === "severe") {
    alerts.push(`${p.allergies.severity === "life_threatening" ? "Life-threatening" : "Severe"} allergy${p.allergies.allergens ? `: ${p.allergies.allergens}` : ""}`);
  }
  if (p.medication.carriesEmergency === "yes") {
    alerts.push(`Carries emergency medication${p.medication.emergencyType ? `: ${p.medication.emergencyType}` : ""}${p.medication.keptWhere ? ` (kept: ${p.medication.keptWhere})` : ""}`);
  }
  if (p.conditions.seizuresOrFainting === "yes") alerts.push("History of seizures or fainting");
  if (p.accessibility.evacuationHelp === "yes") alerts.push("Needs assistance evacuating buildings");
  if (p.accessibility.needs.includes("hearing")) alerts.push("Hearing impairment");
  if (p.accessibility.needs.includes("visual")) alerts.push("Visual impairment");
  return alerts;
}

export function hasAnyDetails(profile) {
  const p = withDefaults(profile);
  return SECTION_KEYS.some(key => Object.values(p[key]).some(value => (Array.isArray(value) ? value.length > 0 : Boolean(value))));
}

export function labelOf(options, key) {
  return options.find(([value]) => value === key)?.[1] || key;
}
