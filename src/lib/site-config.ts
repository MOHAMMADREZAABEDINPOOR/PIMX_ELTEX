export const siteConfig = {
  name: "PIMX_ELTEX",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://pimx-eltex.mohammadrezaabedinpoor6.workers.dev").replace(/\/$/, ""),
  description: "Practical AI, code, prompts, and complete website projects from the PIMX_ELTEX YouTube channel.",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "pimxeltex369@gmail.com",
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || "pimxeltex369@gmail.com",
  youtubeUrl: process.env.NEXT_PUBLIC_YOUTUBE_URL || "https://youtube.com/@PIMX_ELTEX",
} as const;
