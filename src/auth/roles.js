const ROLE_PORTALS = {
  student: "student",
  staff: "staff",
  admin: "admin",
  responder: "responder",
  security: "responder",
  medical: "responder",
};

export function profilePortals(profile) {
  const storedRoles = Array.isArray(profile.roles)
    ? profile.roles
    : Array.isArray(profile.role) ? profile.role : [profile.role];
  const portals = [...new Set(storedRoles
    .filter(role => typeof role === "string" && ROLE_PORTALS[role])
    .map(role => ROLE_PORTALS[role]))];
  return portals.length ? portals : ["student"];
}

export function defaultPortal(portals) {
  return ["admin", "responder", "staff", "student"].find(role => portals.includes(role)) || "student";
}

export function canAccessPortal(portals, portal) {
  const acceptedRoles = {
    student: ["student"],
    staff: ["staff", "admin", "responder"],
    admin: ["admin"],
    responder: ["responder"],
  };
  return acceptedRoles[portal]?.some(role => portals.includes(role)) || false;
}
