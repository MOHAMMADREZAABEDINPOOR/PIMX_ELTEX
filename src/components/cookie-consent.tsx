"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";

type Consent = "accepted" | "rejected" | "unset" | "loading";
const consentKey = "pimx_cookie_consent_v1";
const consentEvent = "pimx-cookie-consent";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(consentEvent, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(consentEvent, callback); };
}

function getSnapshot(): Consent {
  const saved = window.localStorage.getItem(consentKey);
  return saved === "accepted" || saved === "rejected" ? saved : "unset";
}

export function CookieConsent() {
  const consent = useSyncExternalStore(subscribe, getSnapshot, () => "loading");
  const analyticsToken = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN;

  function choose(value: "accepted" | "rejected") {
    window.localStorage.setItem(consentKey, value);
    window.dispatchEvent(new Event(consentEvent));
  }

  return <>
    {consent === "accepted" && analyticsToken ? <Script id="cloudflare-web-analytics" type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon={JSON.stringify({ token: analyticsToken })} strategy="afterInteractive" /> : null}
    {consent === "unset" ? <aside className="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookie preferences"><div><strong>Your privacy, your choice.</strong><p>We use essential storage for your session. Optional privacy-first analytics loads only after you accept.</p></div><div className="cookie-actions"><button type="button" className="button button-secondary" onClick={() => choose("rejected")}>Essential only</button><button type="button" className="button button-accent" onClick={() => choose("accepted")}>Accept analytics</button></div></aside> : null}
  </>;
}
