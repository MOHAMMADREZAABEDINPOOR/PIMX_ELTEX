import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = { title: "Contact", description: "Contact PIMX_ELTEX about episodes, projects, or account support.", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return <section className="status-page simple-status"><Mail size={30} /><span className="simple-kicker">CONTACT</span><h1>Get in touch.</h1><p>Questions about an episode, project, collaboration, or your account? Send us a message.</p><a className="button button-primary" href={siteConfig.contactEmail ? `mailto:${siteConfig.contactEmail}` : siteConfig.youtubeUrl} target={siteConfig.contactEmail ? undefined : "_blank"} rel={siteConfig.contactEmail ? undefined : "noreferrer"}>{siteConfig.contactEmail || "Visit our YouTube channel"}</a>{siteConfig.privacyEmail ? <small>Privacy requests: <a href={`mailto:${siteConfig.privacyEmail}`}>{siteConfig.privacyEmail}</a></small> : null}</section>;
}
