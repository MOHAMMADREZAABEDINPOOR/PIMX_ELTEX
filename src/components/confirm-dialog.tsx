"use client";

import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import { useEffect, useEffectEvent, useId, useRef } from "react";
import { createPortal } from "react-dom";

export function ConfirmDialog({ open, title, description, confirmLabel = "Delete", busy = false, onCancel, onConfirm }: { open: boolean; title: string; description: string; confirmLabel?: string; busy?: boolean; onCancel: () => void; onConfirm: () => void | Promise<void> }) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const handleEscape = useEffectEvent(() => { if (!busy) onCancel(); });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => confirmRef.current?.focus({ preventScroll: true }));
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") handleEscape(); };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(<div className="confirm-backdrop" data-confirm-dialog-portal="true" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
    <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <button className="confirm-close" type="button" onClick={onCancel} disabled={busy} aria-label="Close confirmation"><X size={17} aria-hidden="true" /></button>
      <span className="confirm-icon"><AlertTriangle size={22} aria-hidden="true" /></span>
      <h2 id={titleId}>{title}</h2>
      <p id={descriptionId}>{description}</p>
      <div className="confirm-actions"><button className="button button-secondary" type="button" onClick={onCancel} disabled={busy}>Cancel</button><button ref={confirmRef} className="button button-danger" type="button" onClick={() => void onConfirm()} disabled={busy}>{busy ? <LoaderCircle className="spin" size={15} aria-hidden="true" /> : null}{busy ? "Deleting…" : confirmLabel}</button></div>
    </section>
  </div>, document.body);
}
