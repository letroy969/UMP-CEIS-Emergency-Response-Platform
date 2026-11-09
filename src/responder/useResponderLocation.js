import { useCallback, useEffect, useRef, useState } from "react";
import { setResponderPresence } from "../incidentApi.js";

const SEND_EVERY_MS = 20000; // the server treats presence older than 2 minutes as stale
const HEARTBEAT_MS = 45000; // watchPosition can go quiet while the responder stands still
const MOVED_ENOUGH_M = 25;

const dutyKey = uid => `ceis:on-duty:${uid}`;

function readDuty(uid) {
  try {
    return window.localStorage.getItem(dutyKey(uid)) === "1";
  } catch {
    return false;
  }
}

function roughMeters(a, b) {
  const dLat = (b.lat - a.lat) * 111320;
  const dLng = (b.lng - a.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

const GEO_ERRORS = {
  1: "Location permission is blocked. Allow location for this site in your browser settings to go on duty and navigate.",
  2: "Your device cannot find your location right now. Move to an open area.",
  3: "Getting your location is taking too long. It will keep trying.",
};

// Tracks the responder's GPS position while they are on duty or navigating, and
// while on duty keeps their presence fresh on the server so admins see them as
// available and SOS auto-dispatch can reach them.
export function useResponderLocation(authUser, { navigating = false, busy = false } = {}) {
  const uid = authUser.uid;
  const [onDuty, setOnDutyState] = useState(() => readDuty(uid));
  const [position, setPosition] = useState(null);
  const [error, setError] = useState("");
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [syncError, setSyncError] = useState("");
  const lastSent = useRef({ at: 0, lat: null, lng: null, busy: null });
  const latest = useRef(null);
  const tracking = onDuty || navigating;

  const setOnDuty = useCallback(next => {
    setOnDutyState(next);
    try { window.localStorage.setItem(dutyKey(uid), next ? "1" : "0"); } catch { /* storage unavailable */ }
    if (!next) {
      lastSent.current = { at: 0, lat: null, lng: null, busy: null };
      setResponderPresence(authUser, { onDuty: false }).catch(() => {});
    }
  }, [authUser, uid]);

  // Follow the device position while it is needed.
  useEffect(() => {
    if (!tracking) return undefined;
    if (!navigator.geolocation) {
      setError("This browser does not support location services.");
      return undefined;
    }
    const watchId = navigator.geolocation.watchPosition(
      ({ coords, timestamp }) => {
        const next = { lat: coords.latitude, lng: coords.longitude, accuracyMeters: coords.accuracy, heading: Number.isFinite(coords.heading) ? coords.heading : null, at: timestamp };
        latest.current = next;
        setPosition(next);
        setError("");
      },
      geoError => {
        setError(GEO_ERRORS[geoError.code] || "Unable to get your location.");
        if (geoError.code === 1 && onDuty) setOnDuty(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [tracking, onDuty, setOnDuty]);

  const send = useCallback(async (fix, isBusy) => {
    lastSent.current = { at: Date.now(), lat: fix.lat, lng: fix.lng, busy: isBusy };
    try {
      await setResponderPresence(authUser, { onDuty: true, free: !isBusy, latitude: fix.lat, longitude: fix.lng, accuracyMeters: fix.accuracyMeters });
      setLastSyncAt(new Date());
      setSyncError("");
    } catch (presenceError) {
      setSyncError(presenceError.message || "Your duty status could not be updated.");
    }
  }, [authUser]);

  // Report presence when the position changes enough, when busy/free flips, or periodically.
  useEffect(() => {
    if (!onDuty || !position) return;
    const last = lastSent.current;
    const moved = last.lat == null || roughMeters({ lat: last.lat, lng: last.lng }, position) >= MOVED_ENOUGH_M;
    if (last.busy !== busy || (moved && Date.now() - last.at >= SEND_EVERY_MS) || Date.now() - last.at >= HEARTBEAT_MS) {
      send(position, busy);
    }
  }, [onDuty, position, busy, send]);

  useEffect(() => {
    if (!onDuty) return undefined;
    const timer = window.setInterval(() => {
      if (latest.current && Date.now() - lastSent.current.at >= HEARTBEAT_MS) send(latest.current, busy);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [onDuty, busy, send]);

  return { onDuty, setOnDuty, position, error, lastSyncAt, syncError };
}
