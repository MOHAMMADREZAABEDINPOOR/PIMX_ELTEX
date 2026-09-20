"use client";

import { useEffect } from "react";

type TiltElement = HTMLElement & { dataset: DOMStringMap };

export function CinematicEffects() {
  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return;

    const root = document.documentElement;
    let activeTilt: TiltElement | null = null;
    let frame = 0;
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;

    const render = () => {
      frame = 0;
      root.style.setProperty("--cursor-x", `${pointerX}px`);
      root.style.setProperty("--cursor-y", `${pointerY}px`);
      root.style.setProperty("--hero-shift-x", `${((pointerX / window.innerWidth) - 0.5) * -18}px`);
      root.style.setProperty("--hero-shift-y", `${((pointerY / window.innerHeight) - 0.5) * -12}px`);

      if (!activeTilt) return;
      const rect = activeTilt.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (pointerX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (pointerY - rect.top) / rect.height));
      activeTilt.style.setProperty("--tilt-x", `${(0.5 - y) * 8}deg`);
      activeTilt.style.setProperty("--tilt-y", `${(x - 0.5) * 10}deg`);
      activeTilt.style.setProperty("--glow-x", `${x * 100}%`);
      activeTilt.style.setProperty("--glow-y", `${y * 100}%`);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      const nextTilt = (event.target as Element | null)?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (activeTilt && activeTilt !== nextTilt) {
        activeTilt.style.removeProperty("--tilt-x");
        activeTilt.style.removeProperty("--tilt-y");
      }
      activeTilt = nextTilt;
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    const onPointerLeave = () => {
      activeTilt?.style.removeProperty("--tilt-x");
      activeTilt?.style.removeProperty("--tilt-y");
      activeTilt = null;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="ambient-stage" aria-hidden="true">
      <span className="ambient-cursor" />
      <span className="ambient-orb ambient-orb-one" />
      <span className="ambient-orb ambient-orb-two" />
      <span className="ambient-grid" />
    </div>
  );
}
