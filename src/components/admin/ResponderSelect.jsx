import { BD, NK, WHITE } from "../../constants.js";
import { activeAssignmentsByResponder } from "../../admin/responders.js";
import { canHandleIncident, requiredFieldsText, specializationLabel } from "../../responder/specializations.js";

function lastSeen(value) {
  if (!value) return "never on duty";
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 60) return `last seen ${Math.max(1, minutes)} min ago`;
  if (minutes < 48 * 60) return `last seen ${Math.round(minutes / 60)} h ago`;
  return `last seen ${new Date(value).toLocaleDateString("en-ZA")}`;
}

// Groups responders whose field can handle the incident by how dispatchable
// they are right now. Off-duty matches stay selectable: an admin may still need
// to call someone in. Responders from other fields are listed but disabled,
// because the server refuses to dispatch them to this incident.
export default function ResponderSelect({ responders, incidents, incident, value, onChange, ariaLabel, style }) {
  const active = activeAssignmentsByResponder(incidents);
  const matching = responders.filter(person => canHandleIncident(person.specialization, incident));
  const others = responders.filter(person => !canHandleIncident(person.specialization, incident));
  const field = person => specializationLabel(person.specialization);
  const free = matching.filter(person => person.available && !active[person.uid]);
  const busy = matching.filter(person => person.available && active[person.uid]);
  const offDuty = matching.filter(person => !person.available);
  const groups = [
    [`Available now (${free.length})`, free, () => "available", false],
    [`Available, on other incidents (${busy.length})`, busy, person => `${active[person.uid]} active`, false],
    [`Not available (${offDuty.length})`, offDuty, person => `${person.onDuty ? "location not updating" : "off duty"} · ${lastSeen(person.lastSeenAt)}${active[person.uid] ? ` · ${active[person.uid]} active` : ""}`, false],
    [`Wrong field for this incident (${others.length})`, others, () => "cannot be dispatched", true],
  ];
  const placeholder = !responders.length
    ? "No responders provisioned"
    : matching.length
      ? `Select responder (${free.length} available now)`
      : `No responder in the right field (${requiredFieldsText(incident)})`;
  return (
    <select
      aria-label={ariaLabel}
      value={value || ""}
      onChange={event => onChange(event.target.value)}
      title={`Fields that can respond: ${requiredFieldsText(incident)}`}
      style={{ minWidth: 0, padding: "9px 10px", border: `1px solid ${BD}`, borderRadius: 6, color: NK, background: WHITE, ...style }}
    >
      <option value="">{placeholder}</option>
      {groups.filter(([, people]) => people.length).map(([label, people, describe, disabled]) => (
        <optgroup key={label} label={label}>
          {people.map(person => <option key={person.uid} value={person.uid} disabled={disabled}>{person.name} ({field(person)}) — {describe(person)}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
