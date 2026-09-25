"use client";

import { Activity, LogOut, MonitorSmartphone, ShieldCheck, X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ConfirmDialog } from "./confirm-dialog";
import type { UserDetails } from "./admin-console";

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Never";
}

export function MemberDetailsDialog({ details, canRevoke, onClose, onRevoke }: { details: UserDetails; canRevoke: boolean; onClose: () => void; onRevoke: () => Promise<void> }) {
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [revokeError, setRevokeError] = useState("");
  const closeButton = useRef<HTMLButtonElement>(null);
  const handleEscape = useEffectEvent(() => { if (!confirmRevoke) onClose(); });

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => closeButton.current?.focus({ preventScroll: true }));
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") handleEscape(); };
    document.addEventListener("keydown", onKeyDown);
    return () => { window.cancelAnimationFrame(frame); document.removeEventListener("keydown", onKeyDown); previousFocus?.focus({ preventScroll: true }); };
  }, []);

  async function revoke() {
    setRevokeBusy(true); setRevokeError("");
    try { await onRevoke(); setConfirmRevoke(false); }
    catch (error) { setRevokeError(error instanceof Error ? error.message : "Could not revoke login sessions."); setConfirmRevoke(false); }
    finally { setRevokeBusy(false); }
  }

  return <div className="admin-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !confirmRevoke) onClose(); }}>
    <section className="admin-dialog user-details-dialog" role="dialog" aria-modal="true" aria-labelledby="user-details-title">
      <header><div><span className="eyebrow">Member details</span><h2 id="user-details-title">{details.member.name}</h2><p>@{details.member.username} · {details.member.email}</p></div><button ref={closeButton} type="button" onClick={onClose} aria-label="Close member details"><X size={18} /></button></header>
      <div className="user-details-scroll">
        <div className="user-detail-summary"><article><span>Page views</span><strong>{details.totals.visits}</strong></article><article><span>Time on site</span><strong>{formatDuration(details.totals.durationSeconds)}</strong></article><article><span>Joined</span><strong>{formatDate(details.member.createdAt)}</strong></article><article><span>Last login</span><strong>{formatDate(details.member.lastLoginAt)}</strong></article></div>
        <div className="user-account-flags"><span>Role: <strong>{details.member.role}</strong></span><span>Status: <strong>{details.member.status}</strong></span><span>Email: <strong>{details.member.emailVerifiedAt ? "Verified" : "Unverified"}</strong></span><span>Birth date: <strong>{details.member.birthDate || "Not provided"}</strong></span></div>
        <section className="detail-section"><h3><MonitorSmartphone size={17} /> Known devices</h3>{details.devices.length ? <div className="device-list">{details.devices.map((device) => <article key={device.id}><div><strong>{device.deviceType || "Unknown device"} · {device.operatingSystem || "Unknown OS"}</strong><span>{device.browser || "Unknown browser"} · {device.city || device.region || device.countryCode || "Unknown location"}</span></div><dl><div><dt>IP address</dt><dd>{device.ipAddress}</dd></div><div><dt>Visits</dt><dd>{device.visitCount}</dd></div><div><dt>Time</dt><dd>{formatDuration(device.totalDurationSeconds)}</dd></div><div><dt>Last seen</dt><dd>{formatDate(device.lastSeenAt)}</dd></div></dl></article>)}</div> : <p className="analytics-empty">No known devices.</p>}</section>
        <section className="detail-section"><div className="detail-section-heading"><h3><ShieldCheck size={17} /> Login sessions ({details.sessions.length})</h3>{canRevoke && details.sessions.length ? <button type="button" className="table-action danger" onClick={() => setConfirmRevoke(true)}><LogOut size={13} /> Revoke all</button> : null}</div>{details.sessions.length ? <div className="session-list">{details.sessions.map((session) => <div key={session.id}><span>{session.deviceType || "Device"} · {session.browser || "Browser"}</span><strong>{session.ipAddress}</strong><small>{session.city || session.region || session.countryCode || "Unknown location"} · Signed in {formatDate(session.createdAt)} · Expires {formatDate(session.expiresAt)}</small></div>)}</div> : <p className="analytics-empty">No active login sessions.</p>}{revokeError ? <p className="form-message" role="alert">{revokeError}</p> : null}</section>
        <section className="detail-section"><h3><Activity size={17} /> Recent page views</h3>{details.recentVisits.length ? <div className="visit-list">{details.recentVisits.map((visit) => <div key={visit.id}><code>{visit.path}</code><span>{visit.deviceType || "Device"} · {visit.browser || "Browser"}</span><strong>{formatDuration(visit.durationSeconds)}</strong><small>{formatDate(visit.createdAt)}</small></div>)}</div> : <p className="analytics-empty">No consented page views.</p>}</section>
      </div>
    </section>
    <ConfirmDialog open={confirmRevoke} title="Revoke all sessions?" description={`This will sign ${details.member.name} out on every device.`} confirmLabel="Revoke sessions" busy={revokeBusy} onCancel={() => setConfirmRevoke(false)} onConfirm={revoke} />
  </div>;
}
