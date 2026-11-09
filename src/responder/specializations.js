// Responder fields (specialisations). Shared by the API server and the client so
// dispatch rules are identical everywhere. Every responder must have one field;
// an incident can only be assigned to a responder whose field can handle it.

export const RESPONDER_SPECIALIZATIONS = Object.freeze({
  security:    { label: "Security officer" },
  medical:     { label: "Medical (paramedic / EMT)" },
  nurse:       { label: "Nurse" },
  fire:        { label: "Fire marshal" },
  electrician: { label: "Electrician" },
  maintenance: { label: "Maintenance / facilities" },
  safety:      { label: "Health & safety officer" },
  counsellor:  { label: "Counsellor" },
});

export const SPECIALIZATION_KEYS = Object.freeze(Object.keys(RESPONDER_SPECIALIZATIONS));

// Which fields can respond to each incident type. Keys match INCIDENT_TYPES in
// api/_lib/validation.js. The first field listed is the best match.
export const INCIDENT_SPECIALIZATIONS = Object.freeze({
  medical:        Object.freeze(["medical", "nurse"]),
  fire:           Object.freeze(["fire", "security"]),
  security:       Object.freeze(["security"]),
  hazard:         Object.freeze(["safety", "fire", "security"]),
  infrastructure: Object.freeze(["electrician", "maintenance"]),
  wellbeing:      Object.freeze(["counsellor", "nurse", "medical"]),
  other:          SPECIALIZATION_KEYS,
});

// An SOS is a person in immediate danger: send front-line responders only.
export const SOS_SPECIALIZATIONS = Object.freeze(["security", "medical", "nurse"]);

// Legacy accounts whose role was "security" or "medical" keep that field until
// an admin sets one explicitly.
const LEGACY_ROLE_FIELDS = { security: "security", medical: "medical" };

export function isSpecialization(value) {
  return typeof value === "string" && Object.hasOwn(RESPONDER_SPECIALIZATIONS, value);
}

export function responderSpecialization(profile) {
  if (!profile) return null;
  if (isSpecialization(profile.specialization)) return profile.specialization;
  const roles = [
    ...(Array.isArray(profile.role) ? profile.role : [profile.role]),
    ...(Array.isArray(profile.roles) ? profile.roles : []),
  ];
  for (const role of roles) {
    if (typeof role === "string" && LEGACY_ROLE_FIELDS[role]) return LEGACY_ROLE_FIELDS[role];
  }
  return null;
}

export function specializationLabel(value) {
  return isSpecialization(value) ? RESPONDER_SPECIALIZATIONS[value].label : "Field not set";
}

export function specializationsForIncident(incident) {
  if (incident?.isSOS === true) return SOS_SPECIALIZATIONS;
  return INCIDENT_SPECIALIZATIONS[incident?.type] || INCIDENT_SPECIALIZATIONS.other;
}

export function canHandleIncident(specialization, incident) {
  return isSpecialization(specialization) && specializationsForIncident(incident).includes(specialization);
}

export function requiredFieldsText(incident) {
  return specializationsForIncident(incident).map(key => RESPONDER_SPECIALIZATIONS[key].label).join(", ");
}
