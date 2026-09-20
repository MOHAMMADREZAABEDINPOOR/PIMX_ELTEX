import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site-config";

export const alt = "PIMX_ELTEX — Practical AI and code resources";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, color: "#f7f5ef", background: "radial-gradient(circle at 80% 15%, #7c5cff 0, transparent 35%), radial-gradient(circle at 15% 90%, #ff5c35 0, transparent 32%), #090a0c", fontFamily: "sans-serif" }}><div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 27, fontWeight: 700 }}><div style={{ display: "flex", width: 42, height: 42, borderRadius: 10, background: "#ff5c35" }} />PIMX_ELTEX</div><div style={{ display: "flex", flexDirection: "column", gap: 24 }}><div style={{ fontSize: 76, lineHeight: 1, letterSpacing: -4, fontWeight: 650 }}>Build what comes next.</div><div style={{ fontSize: 27, color: "#b4b2ac" }}>Videos, prompts, source code, and complete website projects.</div></div><div style={{ display: "flex", fontSize: 19, color: "#8d8b86" }}>{new URL(siteConfig.url).host}</div></div>, size);
}
