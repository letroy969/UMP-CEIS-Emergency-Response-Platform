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

function requireCurrentUser(user) {
  if (!user?.uid || !auth.currentUser || auth.currentUser.uid !== user.uid) {
    throw new Error("Your signed-in account could not be verified. Sign in again and retry.");
  }
  if (!auth.currentUser.emailVerified) throw new Error("Verify your university email before updating your profile.");
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
  return snapshot.exists() ? snapshot.data() : { reducedMotion: false };
}

export async function saveSafetyPreferences(user, preferences) {
  requireCurrentUser(user);
  if (typeof preferences.reducedMotion !== "boolean") {
    throw new Error("Choose a valid reduced-motion preference.");
  }
  await setDoc(doc(db, "users", user.uid, "private", "preferences"), {
    reducedMotion: preferences.reducedMotion,
    updatedAt: serverTimestamp(),
  });
}
