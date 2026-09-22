"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: { sitekey: string; theme: "auto"; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => string;
    };
  }
}

export function TurnstileWidget({ onToken }: { onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAAE_pjTL1uyMKXGnS";
  const render = useCallback(() => {
    if (!container.current || !window.turnstile || container.current.childElementCount) return;
    window.turnstile.render(container.current, { sitekey: siteKey!, theme: "auto", callback: onToken, "expired-callback": () => onToken(""), "error-callback": () => onToken("") });
  }, [onToken, siteKey]);

  useEffect(() => { render(); }, [render]);

  return <div className="turnstile-shell" aria-label="Cloudflare security check"><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={render} /><div ref={container} /></div>;
}
