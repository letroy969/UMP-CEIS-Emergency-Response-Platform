/*
 * Browser-only identity provider for the academic presentation demo.
 * It is intentionally isolated so it can later be replaced by an authorised
 * UMP identity provider. localStorage is not an authentication boundary.
 */
import { STUDENT_DB, STAFF_DB } from "../constants.js";

const ACCOUNTS_KEY = "ump-ceis.demo-accounts.v1";
const SESSION_KEY = "ump-ceis.demo-session.v1";

export const DEMO_DIRECTORY = [
  { id: "UMP20260001", email: "thabo@ump.ac.za", type: "student", status: "ACTIVE", name: "Thabo Mokoena", faculty: "ICT", year: 1 },
  { id: "UMP20260002", email: "lerato@ump.ac.za", type: "student", status: "ACTIVE", name: "Lerato Nkosi", faculty: "Education", year: 1 },
  { id: "UMP20260003", email: "sipho@ump.ac.za", type: "student", status: "INACTIVE", name: "Sipho Dlamini", faculty: "ICT", year: 1 },
  { id: "UMPSTAFF001", email: "example@ump.ac.za", type: "staff", status: "ACTIVE", name: "Dr. N. Example", dept: "Academic Staff" },
];

function readAccounts() {
  try {
    const value = JSON.parse(window.localStorage.getItem(ACCOUNTS_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts) {
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function randomSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

async function passwordDigest(password, saltHex) {
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 160000, hash: "SHA-256" }, key, 256);
  return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, "0")).join("");
}

function identityPattern(type, id) {
  if (type === "student") return /^(?:UMP20(?:18|19|20|21|22|23|24|25|26)\d{4}|20(?:18|19|20|21|22|23|24|25|26)\d{4})$/i.test(id);
  return /^UMPSTAFF\d{3,5}$/i.test(id);
}

function toUser(account) {
  if (account.type === "student") {
    return {
      id: account.id,
      name: account.name,
      faculty: account.faculty || "Faculty not listed",
      year: account.year || 1,
      photo: (account.name || "ST").split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase(),
      portal: "student",
      access: "student",
      demoIdentity: true,
    };
  }
  return {
    id: account.id,
    name: account.name,
    role: "staff",
    dept: account.dept || "General Staff",
    access: "staff",
    portal: "staff",
    demoIdentity: true,
  };
}

export async function registerDemoAccount({ id, email, type, name, password }) {
  const normalizedId = id.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = readAccounts();
  const existing = accounts.find(account => account.id.toUpperCase() === normalizedId || account.email.toLowerCase() === normalizedEmail);
  if (existing) return { status: existing.status.toLowerCase(), message: "An account or request already exists for these details.", name: existing.name, id: existing.id };

  const record = DEMO_DIRECTORY.find(entry => entry.id.toUpperCase() === normalizedId && entry.email.toLowerCase() === normalizedEmail && entry.type === type);
  if (record && record.status !== "ACTIVE") return { status: "denied", message: "We could not verify your eligibility for CEIS. Check your details or contact the CEIS administrator." };
  if (!normalizedEmail.endsWith("@ump.ac.za") || !identityPattern(type, normalizedId)) {
    return { status: "denied", message: "We could not verify your eligibility for CEIS. Check your details or contact the CEIS administrator." };
  }

  const salt = randomSalt();
  const passwordHash = await passwordDigest(password, salt);
  const account = {
    id: normalizedId,
    email: normalizedEmail,
    type,
    name: record?.name || name.trim(),
    faculty: record?.faculty || "Faculty not listed",
    year: record?.year || 1,
    dept: record?.dept || "General Staff",
    status: record ? "ACTIVE" : "PENDING",
    verification: record ? "MOCK_DIRECTORY_MATCH" : "AWAITING_DEMO_ADMIN_REVIEW",
    salt,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  writeAccounts([...accounts, account]);
  return {
    status: account.status.toLowerCase(),
    user: account.status === "ACTIVE" ? toUser(account) : undefined,
    name: account.name,
    id: account.id,
  };
}

export async function authenticateDemoAccount(portal, id, password) {
  const normalizedId = id.trim().toUpperCase();
  const account = readAccounts().find(item => item.id.toUpperCase() === normalizedId);
  if (account) {
    if (account.status === "PENDING") return { status: "pending" };
    if (account.status !== "ACTIVE" || (portal === "student") !== (account.type === "student")) return { status: "denied" };
    const digest = await passwordDigest(password, account.salt);
    return digest === account.passwordHash ? { status: "active", user: toUser(account) } : { status: "denied" };
  }

  // Preserve the project's existing pre-provisioned presentation accounts.
  const directory = portal === "student" ? STUDENT_DB : STAFF_DB;
  const key = portal === "student" ? id.trim() : normalizedId;
  const user = directory[key];
  if (user && user.password === password) return { status: "active", user: { ...user, id: key, portal, demoIdentity: true } };
  return { status: "denied" };
}

export function listPendingDemoAccounts() {
  return readAccounts().filter(account => account.status === "PENDING").map(account => {
    const safeAccount = { ...account };
    delete safeAccount.passwordHash;
    delete safeAccount.salt;
    return safeAccount;
  });
}

export function setDemoAccountStatus(id, status) {
  if (!["ACTIVE", "REJECTED"].includes(status)) return false;
  let updated = false;
  const accounts = readAccounts().map(account => {
    if (account.id !== id || account.status !== "PENDING") return account;
    updated = true;
    return { ...account, status, verification: status === "ACTIVE" ? "APPROVED_BY_DEMO_ADMIN" : "REJECTED_BY_DEMO_ADMIN", reviewedAt: new Date().toISOString() };
  });
  if (updated) writeAccounts(accounts);
  return updated;
}

export function readDemoSession() {
  try {
    return JSON.parse(window.localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export function writeDemoSession(user) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearDemoSession() {
  window.localStorage.removeItem(SESSION_KEY);
}
