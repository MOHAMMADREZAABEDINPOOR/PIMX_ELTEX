"use client";

import { useEffect } from "react";

const targets = [
  ".simple-hero-copy", ".tech-hero-stage", ".tech-featured-episode",
  ".simple-section-head", ".simple-card", ".simple-page-header",
  ".simple-episode", ".project-card", ".article-header",
  ".episode-video", ".episode-block", ".episode-prompt",
  ".article-body", ".comments-section", ".status-page",
  ".account-hero", ".account-stats > article", ".account-panel",
  ".admin-workspace-head", ".stat-card", ".admin-panel",
].map((selector) => `main ${selector}`).concat([
  ".site-footer .simple-footer-main", ".site-footer .simple-footer-bottom",
]).join(", ");

const staggerGroups = ".simple-grid, .project-grid, .simple-episode-list, .account-stats, .stats-grid";

export function ScrollReveal() {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const reveal = (element: Element) => {
      element.setAttribute("data-scroll-reveal", "visible");
      observer.unobserve(element);
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) reveal(entry.target);
    }, { rootMargin: "0px 0px -65px 0px", threshold: 0 });

    const scan = () => {
      if (reducedMotion.matches) return;
      for (const element of document.querySelectorAll<HTMLElement>(targets)) {
        if (element.hasAttribute("data-scroll-reveal")) continue;
        const group = element.parentElement?.closest(staggerGroups);
        if (group && element.parentElement === group) {
          const index = Array.prototype.indexOf.call(group.children, element) as number;
          element.dataset.scrollRevealOrder = String(index % 4);
        }
        if (element.matches(".tech-hero-stage")) element.dataset.scrollRevealKind = "stage";
        element.dataset.scrollReveal = "pending";
        observer.observe(element);
      }
    };

    let frame = 0;
    const scheduleScan = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => { frame = 0; scan(); });
    };
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.removedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.hasAttribute("data-scroll-reveal")) observer.unobserve(node);
          node.querySelectorAll("[data-scroll-reveal]").forEach((element) => observer.unobserve(element));
        }
      }
      scheduleScan();
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    if (!reducedMotion.matches) {
      scan();
      document.documentElement.classList.add("scroll-motion-enabled");
    }

    const onFocus = (event: FocusEvent) => {
      const element = (event.target as Element | null)?.closest?.("[data-scroll-reveal='pending']");
      if (element) {
        element.setAttribute("data-scroll-reveal-skip", "");
        reveal(element);
      }
    };
    const onMotionChange = () => {
      if (reducedMotion.matches) {
        document.documentElement.classList.remove("scroll-motion-enabled");
        document.querySelectorAll("[data-scroll-reveal='pending']").forEach(reveal);
        observer.disconnect();
      } else {
        scan();
        document.documentElement.classList.add("scroll-motion-enabled");
      }
    };
    document.addEventListener("focusin", onFocus);
    reducedMotion.addEventListener("change", onMotionChange);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      mutations.disconnect();
      observer.disconnect();
      document.removeEventListener("focusin", onFocus);
      reducedMotion.removeEventListener("change", onMotionChange);
      document.documentElement.classList.remove("scroll-motion-enabled");
    };
  }, []);

  return null;
}
