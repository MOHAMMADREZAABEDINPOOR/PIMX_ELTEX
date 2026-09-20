"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

const consentKey = "pimx_cookie_consent_v1";
const consentEvent = "pimx-cookie-consent";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(consentEvent, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(consentEvent, callback); };
}

function getConsent() {
  return window.localStorage.getItem(consentKey) === "accepted";
}

export function SiteAnalytics() {
  const pathname = usePathname();
  const accepted = useSyncExternalStore(subscribe, getConsent, () => false);

  useEffect(() => {
    if (!accepted || pathname.startsWith("/admin")) return;
    let visitId = "";
    let stopped = false;
    const startedAt = Date.now();

    void fetch("/api/analytics/visits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: pathname }) })
      .then((response) => response.ok ? response.json() as Promise<{ visitId: string }> : Promise.reject(new Error("Analytics request failed.")))
      .then((result) => { visitId = result.visitId; if (stopped) sendDuration(); })
      .catch(() => undefined);

    function sendDuration() {
      if (!visitId) return;
      const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      void fetch("/api/analytics/visits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ visitId, durationSeconds }), keepalive: true }).catch(() => undefined);
    }

    const heartbeat = window.setInterval(sendDuration, 30_000);
    return () => { stopped = true; window.clearInterval(heartbeat); sendDuration(); };
  }, [accepted, pathname]);

  return null;
}
