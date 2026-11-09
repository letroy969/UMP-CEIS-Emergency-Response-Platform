import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase.js";

// Campus-wide alerts sent by administrators (newest first). Every verified
// account may read them; they were already pushed to everyone.
export function subscribeCampusAlerts(onRows, onError) {
  return onSnapshot(
    query(collection(db, "campusAlerts"), orderBy("createdAt", "desc"), limit(30)),
    snapshot => onRows(snapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.get("title"),
      body: doc.get("body"),
      createdAt: doc.get("createdAt")?.toDate?.() || null,
    }))),
    error => onError(new Error(error.code === "permission-denied"
      ? "Campus alerts are not available yet. The latest database rules need to be deployed."
      : error.message || "Campus alerts could not be loaded.")),
  );
}

export const EMERGENCY_NUMBERS = Object.freeze([
  { key: "ems", label: "Medical emergency (EMS)", number: "10177", href: "tel:10177", color: "#D92D20" },
  { key: "security", label: "UMP Campus Security", number: "013 002 0010", href: "tel:+27130020010", color: "#1A2766" },
  { key: "clinic", label: "Campus Clinic", number: "013 002 0200", href: "tel:+27130020200", color: "#1E8E4E" },
]);
