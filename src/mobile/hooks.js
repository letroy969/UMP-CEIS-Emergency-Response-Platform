import { useCallback, useEffect, useState } from "react";
import { getSafetyPreferences, saveDarkModePreference } from "../auth/studentProfile.js";
import { onForegroundNotification, syncPushNotifications } from "../notifications/push.js";
import { setTheme, subscribeTheme } from "../theme.js";

// Same behaviour as the website's portals: a light/dark choice saved on the
// account applies on sign-in, and later changes are saved back to it.
export function useAccountTheme(authUser) {
  useEffect(() => {
    if (!authUser) return undefined;
    let active = true;
    let accountDark = null;
    getSafetyPreferences(authUser)
      .then(preferences => {
        if (!active || preferences.darkMode === null || accountDark !== null) return;
        accountDark = preferences.darkMode;
        setTheme(preferences.darkMode ? "dark" : "light");
      })
      .catch(() => {});
    const unsubscribe = subscribeTheme(mode => {
      const dark = mode === "dark";
      if (dark === accountDark) return;
      accountDark = dark;
      saveDarkModePreference(authUser, dark).catch(error => console.error("Appearance preference could not be saved", error));
    });
    return () => { active = false; unsubscribe(); };
  }, [authUser]);
}

const URGENT_KINDS = ["sos", "backup", "campus-alert", "dispatch"];

// In-app toasts. Push alerts that arrive while the app is open are shown here
// (and as system notifications by notifications/push.js); the device's push
// token is refreshed on every launch once alerts are allowed.
export function useToasts(authUser) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback(id => setToasts(current => current.filter(item => item.id !== id)), []);
  const show = useCallback(toast => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(current => [...current.slice(-2), { ...toast, id }]);
    if (!toast.urgent) window.setTimeout(() => dismiss(id), 6000);
  }, [dismiss]);

  useEffect(() => {
    if (!authUser) return undefined;
    syncPushNotifications(authUser).catch(error => console.error("Push notifications could not be refreshed", error));
    return onForegroundNotification(alert => show({
      title: alert.title,
      body: alert.body,
      urgent: URGENT_KINDS.includes(alert.data?.kind),
    }));
  }, [authUser, show]);

  return { toasts, show, dismiss };
}
