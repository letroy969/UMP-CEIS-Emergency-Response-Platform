const ROLE_PORTALS = {
  student: "student",
  staff: "staff",
  admin: "admin",
  responder: "responder",
  security: "responder",
  medical: "responder",
};

export function profilePortals(profile) {
  const requestedRole = ["staff", "responder", "admin"].includes(profile.requestedRole)
    ? profile.requestedRole
    : null;
  if (requestedRole && profile.roleRequestStatus !== "approved") return [];

  const storedRoles = [
    ...(Array.isArray(profile.role) ? profile.role : [profile.role]),
    ...(Array.isArray(profile.roles) ? profile.roles : []),
  ];
  const portals = [...new Set(storedRoles
    .filter(role => typeof role === "string"
      && ROLE_PORTALS[role]
      && !(requestedRole && ROLE_PORTALS[role] === "student"))
    .map(role => ROLE_PORTALS[role]))];

  if (portals.length !== 1 || (requestedRole && portals[0] !== requestedRole)) return [];
  return portals;
}

export function defaultPortal(portals) {
  return portals.length === 1 && ["admin", "responder", "staff", "student"].includes(portals[0])
    ? portals[0]
    : null;
}

export function canAccessPortal(portals, portal) {
  return portals.length === 1 && ROLE_PORTALS[portals[0]] === ROLE_PORTALS[portal];
}
