import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { CookieConsent } from "@/components/cookie-consent";
import { SiteAnalytics } from "@/components/site-analytics";
import { MobileCta } from "@/components/mobile-cta";
import { siteConfig } from "@/lib/site-config";
import "./globals.css";
import "./simple.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "AI Videos, Prompts & Website Projects — PIMX_ELTEX",
    template: "%s — PIMX_ELTEX",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
  openGraph: {
    title: "AI Videos, Prompts & Website Projects — PIMX_ELTEX",
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "PIMX_ELTEX — Practical AI and code resources" }],
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "AI Videos, Prompts & Website Projects — PIMX_ELTEX", description: siteConfig.description, images: ["/opengraph-image"] },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: siteConfig.name,
          url: siteConfig.url,
          description: siteConfig.description,
          inLanguage: "en",
        }).replace(/</g, "\\u003c") }} />
        <ThemeProvider>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
          <CookieConsent />
          <SiteAnalytics />
          <MobileCta />
        </ThemeProvider>
      </body>
    </html>
  );
}
