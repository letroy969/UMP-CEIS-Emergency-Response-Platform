import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, KeyRound, RefreshCw, Search, ShieldAlert, Trash2, UserCheck, UserX } from "lucide-react";
import { BD, GREEN, GREENL, MID, NAVY, NK, ORANGE, ORANGEL, PAPER, RED, REDL, SL, WHITE } from "../../constants.js";
import { changeUserRole, deleteUser, listUsers, reactivateUser, sendUserPasswordReset, suspendUser } from "../../adminApi.js";

const BAN_DURATIONS = [
  ["1h", "1 hour", 60 * 60 * 1000],
  ["24h", "24 hours", 24 * 60 * 60 * 1000],
  ["3d", "3 days", 3 * 24 * 60 * 60 * 1000],
  ["7d", "7 days", 7 * 24 * 60 * 60 * 1000],
  ["30d", "30 days", 30 * 24 * 60 * 60 * 1000],
];

const ROLE_OPTIONS = [
  ["student", "Student"],
  ["staff", "Staff"],
  ["responder", "Responder"],
  ["admin", "Administrator"],
];
const ROLE_LABEL = { ...Object.fromEntries(ROLE_OPTIONS), security: "Responder (security)", medical: "Responder (medical)" };
const ACTIVE_EXCLUDED = ["RESOLVED", "CLOSED"];

const inputStyle = { padding: "8px 12px", border: `1.5px solid ${BD}`, borderRadius: 6, fontSize: 13, color: NK, outline: "none", background: WHITE };
const sectionLabel = { fontSize: 10, fontWeight: 700, color: MID, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 };

function formatDate(value) {
  return value ? new Date(value).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" }) : "Never";
}

function Badge({ color, background, children }) {
  return <span style={{ padding: "2px 8px", background, color, borderRadius: 3, fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap" }}>{children}</span>;
}

function statusBadge(person) {
  if (person.status === "banned") return <Badge color={ORANGE} background={ORANGEL}>Banned until {formatDate(person.suspendedUntil)}</Badge>;
  if (person.status === "suspended") return <Badge color={RED} background={REDL}>Disabled</Badge>;
  return null;
}

function roleBadge(person) {
  if (person.portal) return <Badge color={NAVY} background={`${NAVY}12`}>{ROLE_LABEL[person.role] || ROLE_LABEL[person.portal] || person.portal}</Badge>;
  if (person.roleRequestStatus === "pending") return <Badge color={ORANGE} background={ORANGEL}>Pending {person.requestedRole}</Badge>;
  if (!person.hasProfile) return <Badge color={MID} background={PAPER}>Never signed in</Badge>;
  return <Badge color={MID} background={PAPER}>No portal access</Badge>;
}

export default function UserManagementPanel({ authUser, incidents, onRolesChanged }) {
  const [users, setUsers] = useState([]);
  const [capped, setCapped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUid, setSelectedUid] = useState(null);
  const [busy, setBusy] = useState("");
  const [nextRole, setNextRole] = useState("");
  const [reason, setReason] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [banDuration, setBanDuration] = useState("24h");
  const [resetSignOut, setResetSignOut] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await listUsers(authUser);
      setUsers(payload.users || []);
      setCapped(Boolean(payload.capped));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => { load(); }, [load]);

  const selected = users.find(person => person.uid === selectedUid) || null;
  const isSelf = selected?.uid === authUser.uid;

  function select(person) {
    setSelectedUid(person.uid);
    setNextRole(ROLE_OPTIONS.some(([value]) => value === person.role) ? person.role : "");
    setReason("");
    setConfirmEmail("");
    setNotice("");
    setError("");
  }

  function replaceUser(updated) {
    setUsers(current => current.map(person => person.uid === updated.uid ? updated : person));
  }

  const counts = useMemo(() => {
    const reported = {};
    const active = {};
    for (const incident of incidents) {
      if (incident.reportedBy) reported[incident.reportedBy] = (reported[incident.reportedBy] || 0) + 1;
      if (incident.responderUid && !ACTIVE_EXCLUDED.includes(incident.status)) {
        active[incident.responderUid] = (active[incident.responderUid] || 0) + 1;
      }
    }
    return { reported, active };
  }, [incidents]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter(person => {
      if (term && !`${person.name} ${person.email}`.toLowerCase().includes(term)) return false;
      if (statusFilter !== "all" && person.status !== statusFilter) return false;
      if (roleFilter === "none") return !person.portal;
      if (roleFilter !== "all") return person.portal === roleFilter;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const summary = useMemo(() => ({
    total: users.length,
    admins: users.filter(person => person.portal === "admin").length,
    responders: users.filter(person => person.portal === "responder").length,
    blocked: users.filter(person => person.status !== "active").length,
  }), [users]);

  async function run(action, task) {
    setBusy(action);
    setError("");
    setNotice("");
    try {
      await task();
    } catch (taskError) {
      setError(taskError.message);
    } finally {
      setBusy("");
    }
  }

  function saveRole() {
    if (!selected || !nextRole || nextRole === selected.role) return;
    if (nextRole === "admin" && !window.confirm(`Give ${selected.name} full administrator access? Administrators can manage every account, incident and campus alert.`)) return;
    run("role", async () => {
      const result = await changeUserRole(authUser, selected.uid, nextRole);
      replaceUser(result.user);
      onRolesChanged?.();
      setNotice(result.activeAssignments
        ? `Role changed to ${ROLE_LABEL[nextRole]}. They still hold ${result.activeAssignments} active incident assignment(s) — reassign them from Incidents.`
        : `Role changed to ${ROLE_LABEL[nextRole]}.`);
    });
  }

  function block(kind) {
    if (!selected) return;
    const duration = BAN_DURATIONS.find(([value]) => value === banDuration);
    const until = kind === "ban" ? new Date(Date.now() + duration[2]).toISOString() : null;
    if (kind === "disable" && !window.confirm(`Disable ${selected.name}'s account? They cannot sign in until an administrator reactivates it.`)) return;
    run(kind, async () => {
      const result = await suspendUser(authUser, selected.uid, reason.trim(), until);
      replaceUser(result.user);
      onRolesChanged?.();
      setReason("");
      const what = kind === "ban" ? `Account banned for ${duration[1]} (until ${formatDate(result.user.suspendedUntil)}). It lifts automatically.` : "Account disabled.";
      setNotice(`${what} They have been signed out on all devices.${result.activeAssignments ? ` ${result.activeAssignments} active incident(s) are still assigned to them — reassign them now.` : ""}`);
    });
  }

  function sendReset() {
    if (!selected) return;
    run("reset", async () => {
      const result = await sendUserPasswordReset(authUser, selected.uid, resetSignOut);
      setNotice(`Password reset email sent to ${result.email}.${result.signedOut ? " They have been signed out on all devices." : ""}`);
    });
  }

  function reactivate() {
    if (!selected) return;
    run("reactivate", async () => {
      const result = await reactivateUser(authUser, selected.uid);
      replaceUser(result.user);
      onRolesChanged?.();
      setNotice("Account reactivated. They can sign in again.");
    });
  }

  function remove() {
    if (!selected) return;
    run("delete", async () => {
      const result = await deleteUser(authUser, selected.uid, confirmEmail);
      setUsers(current => current.filter(person => person.uid !== selected.uid));
      setSelectedUid(null);
      onRolesChanged?.();
      setNotice(`${selected.email || "The account"} was deleted.${result.retainedIncidentReports ? ` ${result.retainedIncidentReports} incident report(s) they filed were kept for the record.` : ""}`);
    });
  }

  const emailMatches = selected && confirmEmail.trim().toLowerCase() === (selected.email || "").toLowerCase() && selected.email;
  const activeAssignments = selected ? counts.active[selected.uid] || 0 : 0;

  return (
    <section style={{ animation: "fadeIn .35s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: "'IBM Plex Serif',serif", fontSize: 24, color: NK, marginBottom: 6 }}>User management</h2>
          <p style={{ fontSize: 14, color: SL, maxWidth: 720 }}>Change roles, suspend or reactivate accounts, and delete accounts. Every action is recorded in the audit log. You cannot change your own account here.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", border: `1px solid ${BD}`, borderRadius: 6, background: WHITE, color: NAVY, fontWeight: 700, cursor: "pointer" }}>
          <RefreshCw size={15} aria-hidden="true" /> {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 16 }}>
        {[["Accounts", summary.total, NAVY], ["Administrators", summary.admins, NAVY], ["Responders", summary.responders, ORANGE], ["Disabled or banned", summary.blocked, RED]].map(([label, value, color]) => (
          <div key={label} style={{ background: WHITE, border: `1px solid ${BD}`, borderTop: `3px solid ${color}`, borderRadius: 9, padding: "12px 14px" }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: MID, textTransform: "uppercase", letterSpacing: 1.2 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "'IBM Plex Mono',monospace" }}>{value}</div>
          </div>
        ))}
      </div>

      {error && <div role="alert" style={{ background: REDL, color: RED, padding: 12, borderRadius: 7, marginBottom: 12 }}>{error}</div>}
      {notice && <div role="status" style={{ background: GREENL, color: GREEN, padding: 12, borderRadius: 7, marginBottom: 12 }}>{notice}</div>}
      {capped && <div style={{ background: ORANGEL, color: ORANGE, padding: 12, borderRadius: 7, marginBottom: 12 }}>Only the first 5,000 accounts are shown. Use search to narrow the list.</div>}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 400px", gap: 18 }}>
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: "1 1 240px" }}>
              <Search size={15} aria-hidden="true" style={{ position: "absolute", left: 10, top: 10, color: MID }} />
              <input type="search" aria-label="Search users by name or email" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name or email" style={{ ...inputStyle, width: "100%", paddingLeft: 32 }} />
            </div>
            <select aria-label="Filter by role" value={roleFilter} onChange={event => setRoleFilter(event.target.value)} style={inputStyle}>
              <option value="all">All roles</option>
              {ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              <option value="none">No portal access</option>
            </select>
            <select aria-label="Filter by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} style={inputStyle}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Disabled</option>
              <option value="banned">Temporarily banned</option>
            </select>
          </div>
          <div style={{ fontSize: 12, color: MID, marginBottom: 8 }}>{filtered.length} of {users.length} account{users.length === 1 ? "" : "s"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map(person => (
              <button key={person.uid} type="button" onClick={() => select(person)} className="ceis-icon-action" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, textAlign: "left", background: person.uid === selectedUid ? `${NAVY}06` : WHITE, border: `1.5px solid ${person.uid === selectedUid ? NAVY : BD}`, borderRadius: 8, padding: "10px 14px", cursor: "pointer" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: NK }}>{person.name}{person.uid === authUser.uid && <span style={{ color: MID, fontWeight: 500 }}> (you)</span>}</div>
                  <div style={{ fontSize: 12, color: SL, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{person.email || "No email"}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {roleBadge(person)}
                  {statusBadge(person)}
                </div>
              </button>
            ))}
            {!loading && filtered.length === 0 && <div style={{ background: WHITE, border: `1px solid ${BD}`, borderRadius: 8, padding: 20, color: SL, fontSize: 13 }}>No accounts match these filters.</div>}
          </div>
        </div>

        {selected ? (
          <aside style={{ background: WHITE, borderRadius: 10, border: `1px solid ${BD}`, overflow: "hidden", position: "sticky", top: 100, alignSelf: "start", maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
            <div style={{ background: NAVY, padding: "16px 18px" }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: WHITE, fontFamily: "'IBM Plex Serif',serif" }}>{selected.name}</div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{selected.email}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>{roleBadge(selected)}{statusBadge(selected) || <Badge color={GREEN} background={GREENL}>Active</Badge>}</div>
            </div>
            <div style={{ padding: "16px 18px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                {[
                  ["Email verified", selected.emailVerified == null ? "—" : selected.emailVerified ? "Yes" : "No"],
                  ["Last sign-in", formatDate(selected.lastSignInAt)],
                  ["Created", formatDate(selected.createdAt)],
                  ["Reports filed", counts.reported[selected.uid] || 0],
                  ["Active assignments", activeAssignments],
                  ["User ID", <span key="uid" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10.5, wordBreak: "break-all" }}>{selected.uid}</span>],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: PAPER, borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: MID, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: NK, marginTop: 3 }}>{value}</div>
                  </div>
                ))}
              </div>

              {selected.status !== "active" && selected.suspendedReason && <p style={{ fontSize: 12.5, color: RED, marginBottom: 12 }}>Reason: {selected.suspendedReason}</p>}
              {!selected.hasProfile && <p style={{ fontSize: 12.5, color: SL, marginBottom: 12 }}>This person created a login but has never finished signing in, so they have no CEIS profile or role yet.</p>}
              {!selected.hasAuthAccount && <p style={{ fontSize: 12.5, color: ORANGE, marginBottom: 12 }}>The login for this profile no longer exists — probably an interrupted deletion. Delete it again to remove the remaining data.</p>}

              {isSelf ? (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: PAPER, borderRadius: 7, padding: 12, fontSize: 12.5, color: SL }}>
                  <ShieldAlert size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
                  This is your own account. Another administrator has to change its role, suspend it, or delete it. This guarantees there is always at least one administrator.
                </div>
              ) : (
                <>
                  {selected.hasProfile && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={sectionLabel}>Role</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <select aria-label="New role" value={nextRole} onChange={event => setNextRole(event.target.value)} style={{ ...inputStyle, flex: 1 }}>
                          <option value="" disabled>Choose role</option>
                          {ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        <button type="button" onClick={saveRole} disabled={busy !== "" || !nextRole || nextRole === selected.role} style={{ padding: "8px 14px", background: NAVY, color: WHITE, border: 0, borderRadius: 6, fontWeight: 700, cursor: "pointer", opacity: busy !== "" || !nextRole || nextRole === selected.role ? 0.5 : 1 }}>{busy === "role" ? "Saving…" : "Save"}</button>
                      </div>
                      {selected.roleRequestStatus === "pending" && <p style={{ fontSize: 11.5, color: MID, marginTop: 6 }}>Saving a role replaces their pending {selected.requestedRole} request.</p>}
                    </div>
                  )}

                  <div style={{ marginBottom: 18 }}>
                    <div style={sectionLabel}>Account access</div>
                    {selected.status !== "active" ? (
                      <>
                        <p style={{ fontSize: 12, color: SL, marginBottom: 8 }}>
                          {selected.status === "banned"
                            ? `Temporarily banned until ${formatDate(selected.suspendedUntil)}. The ban lifts automatically, or you can lift it now.`
                            : "Disabled. They cannot sign in until an administrator reactivates the account."}
                        </p>
                        <button type="button" onClick={reactivate} disabled={busy !== ""} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: GREEN, color: WHITE, border: 0, borderRadius: 6, fontWeight: 700, cursor: "pointer" }}>
                          <UserCheck size={15} aria-hidden="true" /> {busy === "reactivate" ? "Reactivating…" : selected.status === "banned" ? "Lift ban now" : "Reactivate account"}
                        </button>
                      </>
                    ) : (
                      <>
                        <textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={300} placeholder="Reason (optional). Shown to administrators, and to the user when a temporary ban stops their sign-in." style={{ ...inputStyle, width: "100%", minHeight: 60, resize: "vertical", marginBottom: 8 }} />
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                          <select aria-label="Ban duration" value={banDuration} onChange={event => setBanDuration(event.target.value)} style={inputStyle} disabled={!selected.hasProfile}>
                            {BAN_DURATIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                          <button type="button" onClick={() => block("ban")} disabled={busy !== "" || !selected.hasProfile} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: WHITE, color: ORANGE, border: `1.5px solid ${ORANGE}`, borderRadius: 6, fontWeight: 700, cursor: selected.hasProfile ? "pointer" : "not-allowed", opacity: selected.hasProfile ? 1 : 0.5 }}>
                            <Ban size={15} aria-hidden="true" /> {busy === "ban" ? "Banning…" : "Temporary ban"}
                          </button>
                        </div>
                        <button type="button" onClick={() => block("disable")} disabled={busy !== ""} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: WHITE, color: RED, border: `1.5px solid ${RED}`, borderRadius: 6, fontWeight: 700, cursor: "pointer" }}>
                          <UserX size={15} aria-hidden="true" /> {busy === "disable" ? "Disabling…" : "Disable account"}
                        </button>
                        <p style={{ fontSize: 11.5, color: MID, marginTop: 6, lineHeight: 1.5 }}>Both sign them out on every device, remove them from SOS auto-dispatch and stop their push alerts. A temporary ban ends by itself; a disabled account stays locked until reactivated.</p>
                      </>
                    )}
                  </div>

                  {selected.hasAuthAccount && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={sectionLabel}>Password</div>
                      <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, color: SL, marginBottom: 8 }}>
                        <input type="checkbox" checked={resetSignOut} onChange={event => setResetSignOut(event.target.checked)} />
                        Also sign them out on all devices
                      </label>
                      <button type="button" onClick={sendReset} disabled={busy !== "" || selected.status === "suspended"} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: WHITE, color: NAVY, border: `1.5px solid ${NAVY}`, borderRadius: 6, fontWeight: 700, cursor: selected.status === "suspended" ? "not-allowed" : "pointer", opacity: selected.status === "suspended" ? 0.5 : 1 }}>
                        <KeyRound size={15} aria-hidden="true" /> {busy === "reset" ? "Sending…" : "Send password reset email"}
                      </button>
                      <p style={{ fontSize: 11.5, color: MID, marginTop: 6 }}>{selected.status === "suspended" ? "Reactivate the account before sending a reset." : `Firebase emails a secure reset link to ${selected.email}. You never see or set their password.`}</p>
                    </div>
                  )}

                  <div style={{ border: `1.5px solid ${RED}40`, borderRadius: 8, padding: 12, background: `${RED}06` }}>
                    <div style={{ ...sectionLabel, color: RED }}>Delete account</div>
                    {activeAssignments > 0 ? (
                      <p style={{ fontSize: 12.5, color: RED }}>This responder has {activeAssignments} active incident assignment(s). Reassign or close them before deleting the account.</p>
                    ) : (
                      <>
                        <p style={{ fontSize: 12, color: SL, marginBottom: 8, lineHeight: 1.5 }}>Permanently removes the login, profile, emergency contacts, medical details, preferences, registered devices and safety check-ins. Incident reports they filed are kept for the record. This cannot be undone.</p>
                        <label style={{ fontSize: 11.5, color: SL, display: "block", marginBottom: 4 }} htmlFor="confirm-delete-email">Type <strong>{selected.email || "the email"}</strong> to confirm</label>
                        <input id="confirm-delete-email" value={confirmEmail} onChange={event => setConfirmEmail(event.target.value)} autoComplete="off" style={{ ...inputStyle, width: "100%", marginBottom: 8 }} />
                        <button type="button" onClick={remove} disabled={busy !== "" || !emailMatches} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: RED, color: WHITE, border: 0, borderRadius: 6, fontWeight: 700, cursor: emailMatches ? "pointer" : "not-allowed", opacity: emailMatches && busy === "" ? 1 : 0.5 }}>
                          <Trash2 size={15} aria-hidden="true" /> {busy === "delete" ? "Deleting…" : "Delete permanently"}
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </aside>
        ) : (
          <div style={{ background: WHITE, borderRadius: 10, border: `1px solid ${BD}`, padding: 40, textAlign: "center", color: MID, fontSize: 13, alignSelf: "start" }}>Select an account to view details and manage access</div>
        )}
      </div>
    </section>
  );
}
