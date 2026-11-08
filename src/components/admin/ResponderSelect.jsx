import { BD, NK, WHITE } from "../../constants.js";
import { activeAssignmentsByResponder } from "../../admin/responders.js";

function lastSeen(value) {
  if (!value) return "never on duty";
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 60) return `last seen ${Math.max(1, minutes)} min ago`;
  if (minutes < 48 * 60) return `last seen ${Math.round(minutes / 60)} h ago`;
  return `last seen ${new Date(value).toLocaleDateString("en-ZA")}`;
}

// Groups every provisioned responder by how dispatchable they are right now so
// the admin can see availability without leaving the dropdown. Off-duty
// responders stay selectable: an admin may still need to call someone in.
export default function ResponderSelect({ responders, incidents, value, onChange, ariaLabel, style }) {
  const active = activeAssignmentsByResponder(incidents);
  const free = responders.filter(person => person.available && !active[person.uid]);
  const busy = responders.filter(person => person.available && active[person.uid]);
  const offDuty = responders.filter(person => !person.available);
  const groups = [
    [`Available now (${free.length})`, free, () => "available"],
    [`Available, on other incidents (${busy.length})`, busy, person => `${active[person.uid]} active`],
    [`Off duty (${offDuty.length})`, offDuty, person => `${person.onDuty ? "location not updating" : "off duty"} · ${lastSeen(person.lastSeenAt)}${active[person.uid] ? ` · ${active[person.uid]} active` : ""}`],
  ];
  return (
    <select
      aria-label={ariaLabel}
      value={value || ""}
      onChange={event => onChange(event.target.value)}
      style={{ minWidth: 0, padding: "9px 10px", border: `1px solid ${BD}`, borderRadius: 6, color: NK, background: WHITE, ...style }}
    >
      <option value="">{responders.length ? `Select responder (${free.length} available now)` : "No responders provisioned"}</option>
      {groups.filter(([, people]) => people.length).map(([label, people, describe]) => (
        <optgroup key={label} label={label}>
          {people.map(person => <option key={person.uid} value={person.uid}>{person.name} — {describe(person)}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
