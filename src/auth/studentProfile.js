import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase.js";
import { validateEmergencyContact, validateStudentProfile } from "./profileValidation.js";
import { normalizeMedicalProfile, withDefaults } from "../medical/medicalProfile.js";

function requireCurrentUser(user) {
  if (!user?.uid || !auth.currentUser || auth.currentUser.uid !== user.uid) {
    throw new Error("Your signed-in account could not be verified. Sign in again and retry.");
  }
  if (!auth.currentUser.emailVerified) throw new Error("Verify your email before updating your profile.");
}

export async function saveStudentProfile(user, fields) {
  requireCurrentUser(user);
  const profile = validateStudentProfile(fields);
  await updateDoc(doc(db, "users", user.uid), profile);
  return profile;
}

export async function listEmergencyContacts(user) {
  requireCurrentUser(user);
  const contactsRef = collection(db, "users", user.uid, "emergencyContacts");
  const snapshot = await getDocs(query(contactsRef, orderBy("order")));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function saveEmergencyContact(user, contact, contactId = null) {
  requireCurrentUser(user);
  const validated = validateEmergencyContact(contact);
  const contactRef = contactId
    ? doc(db, "users", user.uid, "emergencyContacts", contactId)
    : doc(collection(db, "users", user.uid, "emergencyContacts"));
  if (contactId) {
    await updateDoc(contactRef, { ...validated, updatedAt: serverTimestamp() });
  } else {
    await setDoc(contactRef, {
      ...validated,
      uid: user.uid,
      order: contact.order,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  return contactRef.id;
}

export async function removeEmergencyContact(user, contactId) {
  requireCurrentUser(user);
  await deleteDoc(doc(db, "users", user.uid, "emergencyContacts", contactId));
}

export async function reorderEmergencyContacts(user, contacts) {
  requireCurrentUser(user);
  const batch = writeBatch(db);
  contacts.forEach((contact, order) => {
    batch.update(doc(db, "users", user.uid, "emergencyContacts", contact.id), {
      order,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

export async function getSafetyPreferences(user) {
  requireCurrentUser(user);
  const snapshot = await getDoc(doc(db, "users", user.uid, "private", "preferences"));
  const data = snapshot.exists() ? snapshot.data() : {};
  // darkMode is null when the account has never chosen, so the device setting applies.
  return { reducedMotion: data.reducedMotion === true, darkMode: typeof data.darkMode === "boolean" ? data.darkMode : null };
}

// Saves only the dark-mode choice, keeping the other stored preferences.
export async function saveDarkModePreference(user, darkMode) {
  const current = await getSafetyPreferences(user);
  await saveSafetyPreferences(user, { reducedMotion: current.reducedMotion, darkMode: darkMode === true });
}

export async function saveSafetyPreferences(user, preferences) {
  requireCurrentUser(user);
  if (typeof preferences.reducedMotion !== "boolean" || typeof preferences.darkMode !== "boolean") {
    throw new Error("Choose valid accessibility preferences.");
  }
  await setDoc(doc(db, "users", user.uid, "private", "preferences"), {
    reducedMotion: preferences.reducedMotion,
    darkMode: preferences.darkMode,
    updatedAt: serverTimestamp(),
  });
}

// Medical & accessibility details live in their own private document. Only the
// owner can read or write it directly; responders and admins read it through
// the API, which checks they are handling the user's incident and records
// every view on that incident's timeline.
function medicalRef(user) {
  return doc(db, "users", user.uid, "private", "medical");
}

export async function getMedicalProfile(user) {
  requireCurrentUser(user);
  const snapshot = await getDoc(medicalRef(user));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return { ...withDefaults(data), updatedAt: data.updatedAt?.toDate?.() || null };
}

export async function saveMedicalProfile(user, input) {
  requireCurrentUser(user);
  const profile = normalizeMedicalProfile(input);
  const existing = await getDoc(medicalRef(user));
  await setDoc(medicalRef(user), {
    ...profile,
    consentedAt: existing.exists() && existing.get("consentedAt") ? existing.get("consentedAt") : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return profile;
}

export async function deleteMedicalProfile(user) {
  requireCurrentUser(user);
  await deleteDoc(medicalRef(user));
}
