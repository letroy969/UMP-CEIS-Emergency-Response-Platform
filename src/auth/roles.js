const ROLE_PORTALS = {
  student: "student",
  staff: "staff",
  admin: "admin",
  responder: "responder",
  security: "responder",
  medical: "responder",
};

export function profilePortals(profile) {
  const requestedRoleValue = typeof profile.requestedRole === "string"
    ? profile.requestedRole.trim().toLowerCase()
    : "";
  const requestedRole = ["staff", "responder", "admin"].includes(requestedRoleValue)
    ? requestedRoleValue
    : null;
  const roleRequestStatus = typeof profile.roleRequestStatus === "string"
    ? profile.roleRequestStatus.trim().toLowerCase()
    : null;
  if (["responder", "admin"].includes(requestedRole) && roleRequestStatus !== "approved") return [];

  const storedRoles = [
    ...(Array.isArray(profile.role) ? profile.role : [profile.role]),
    ...(Array.isArray(profile.roles) ? profile.roles : []),
  ];
  let portals = [...new Set(storedRoles
    .filter(role => typeof role === "string")
    .map(role => ROLE_PORTALS[role.trim().toLowerCase()])
    .filter(portal => portal && !(requestedRole && portal === "student")))];

  if (requestedRole === "staff" && portals.length === 0
    && storedRoles.some(role => typeof role === "string" && role.trim().toLowerCase() === "student")) {
    portals = ["staff"];
  }
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
