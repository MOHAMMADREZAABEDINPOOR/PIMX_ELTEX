# PIMX_ELTEX

A secure community platform for the PIMX_ELTEX YouTube channel. The public interface is fully English.

## Content model

- **Episodes**: every video has one complete page containing the video, written explanation, prompts, mentioned websites, source code, live preview, downloads, and a threaded discussion.
- **Projects**: a focused library for visitors who only want finished website projects, live previews, and downloadable files.
- **Admin Console**: create and edit episodes and projects, moderate comments, manage member accounts, and assign granular administrator permissions.

An episode supports up to 50 independent prompt sections. Every prompt can carry its own folder tree (up to 250 files / 45 MB), isolated live preview, file manifest, and automatically generated ZIP download. Use **Import episode folder** when a folder contains `prompt.txt` headings such as `PROMPT 1 — Title` plus matching `prompt 1`, `prompt 2`, ... directories; the editor maps the text and source files automatically.

Existing episodes can be reopened from **Admin Console → Episodes → Edit**. Episode details, prompt text, links, publishing status, and source bundles can all be changed; existing R2 bundles are preserved until replacement files are selected.

There is no standalone prompt library or toolbox.

## Stack

- Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS 4
- Cloudflare Pages through OpenNext advanced mode
- Cloudflare D1 with Drizzle ORM
- Cloudflare R2 for uploaded preview and source files
- Gmail SMTP over TLS, Cloudflare Turnstile, Web Crypto password hashing

## Test locally

```bash
npm install
npm run db:setup:local
npm run dev
```

Open `http://localhost:3000`.

To synchronize all seven Muse Spark prompts and project folders into one episode and the Code Hub:

```powershell
$env:TEST_ADMIN_PASSWORD='your-local-admin-password'
npm run content:sync:muse
```

Register a normal account and use the development OTP returned by the signup flow. Then promote that account to administrator in the local D1 database:

```bash
npx wrangler d1 execute pimx-eltex-db --local --command "UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com'"
```

Sign out and sign in again, then open `http://localhost:3000/admin`. No administrator email or password is hard-coded or displayed in the interface.

For real email and CAPTCHA testing, copy `.dev.vars.example` to `.dev.vars` and `.env.example` to `.env.local`. Private secrets belong only in `.dev.vars` or Cloudflare secrets; browser-safe configuration belongs in `.env.local`:

```text
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key
NEXT_PUBLIC_CF_ANALYTICS_TOKEN=your-web-analytics-token
NEXT_PUBLIC_CONTACT_EMAIL=your-real-contact-address@example.com
```

## Cloudflare setup

The production site is `https://pimxeltex.pages.dev`. The Cloudflare Pages project is connected directly to this GitHub repository, so every push to `main` builds and deploys automatically. GitHub Actions and a `CLOUDFLARE_API_TOKEN` repository secret are not required.

Cloudflare R2 is not enabled on the account, so the R2 binding is currently omitted from `wrangler.toml`. Public pages work; uploading or serving episode bundles requires enabling R2, creating `pimx-eltex-media`, and restoring the binding. Production email verification requires a Gmail App Password in the Worker secrets. Do not advertise account creation as ready until this is configured and a real email is received.

```bash
npx wrangler login
npx wrangler d1 create pimx-eltex-db
npx wrangler r2 bucket create pimx-eltex-media
```

Copy the returned D1 `database_id` into `wrangler.worker.toml`, then add backend secrets:

```bash
npx wrangler secret put AUTH_SECRET --config wrangler.worker.toml
npx wrangler secret put SMTP_USER --config wrangler.worker.toml
npx wrangler secret put SMTP_APP_PASSWORD --config wrangler.worker.toml
npx wrangler secret put TURNSTILE_SECRET_KEY --config wrangler.worker.toml
```

Set the `NEXT_PUBLIC_*` build variables for production. Apply migrations, deploy the API backend, and deploy Pages:

```bash
npm run db:migrate:remote
npm run deploy:worker-backend
npm run deploy
```

Promote a verified, active production account with:

```bash
npx wrangler d1 execute pimx-eltex-db --remote --command "UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com' AND email_verified_at IS NOT NULL AND status = 'active'"
```

## Verification commands

```bash
npm run typecheck
npm run lint
npm run build
npm run security:audit
npx opennextjs-cloudflare build
```

With the local development server running, the R2 preview/ZIP path can be checked with the isolated integration script (it removes its temporary database record after the check):

```powershell
$env:TEST_ADMIN_PASSWORD='your-local-admin-password'
node scripts/verify-episode-upload.mjs
```

## Security

- PBKDF2-SHA256 password hashes with per-password salts and 600,000 iterations; older 210,000-iteration hashes upgrade after a successful login
- Twelve-character signup/reset policy with upper/lowercase, number, and symbol requirements
- Hashed, ten-minute, single-use OTPs with atomic five-attempt limits
- Random sessions stored as hashes; `HttpOnly`, `SameSite=Lax`, production-secure cookies. Member sessions end after seven days or twelve hours of inactivity; admin sessions end after eight hours or thirty minutes of inactivity. Both limits are checked on the server, with activity writes throttled to once per fifteen or five minutes respectively. Changing a password revokes all sessions.
- AES-GCM encryption for stored newsletter addresses, with a separate one-way hash for uniqueness
- Adaptive Cloudflare Turnstile on signup, login, password recovery, and suspicious comment bursts; ordinary requests stay frictionless and challenged requests are verified server-side
- D1-backed rate limiting for auth, comments, and likes without storing raw IP addresses; expired rate-limit, OTP, and session rows are pruned opportunistically. Password recovery also has a per-email limit.
- Origin checks on state-changing routes, production HSTS, restrictive security headers, and sandboxed previews
- Server-side role enforcement for `/admin` and its APIs
- Application-level row ownership checks; D1 is never exposed to browser code and has no public client key
- Strict upload size, extension, MIME, filename, and isolated-content checks
- Country and normalized device metadata instead of raw IP persistence
- Audit records for administrator mutations

The admin console includes searchable member/content lists, status filters, recent audit activity, editable project details, member session revocation, and **Members → Access** for promotion or demotion and individual action permissions. Existing administrators with `admin_permissions = NULL` retain full access; newly promoted administrators receive only selected permissions. Role changes revoke the affected member's sessions. API handlers enforce permissions even when a UI action is hidden. Member details and editors open in viewport dialogs with independent scrolling. Published content pages read current D1 records so edits appear without rebuilding the frontend.

Sign-up requests a complete birth date in three compact controls instead of a separate age field. The server validates real calendar dates and the minimum age of 13. New birth dates are encrypted at rest; the member list does not display them.

Cloudflare D1 does not provide Supabase-style database Row Level Security. This project implements the equivalent authorization boundary in server-only query handlers: every protected record mutation is scoped to the authenticated user or an administrator. Do not create a public D1 credential.

Cloudflare Pages calls the backend Worker through a Service binding named `BACKEND`; the public Worker URL is a fallback when that binding is unavailable. The Pages Git integration redeploys Pages on push, while backend code changes still require `npm run deploy:worker-backend` with Cloudflare credentials. Analytics duration updates run at most every two minutes while a tab is visible, plus on tab hide/exit. D1 is a single-threaded database, so production capacity depends on query volume and plan limits; monitor D1 reads/writes, Worker errors, and request latency as traffic grows.

The dependency scan currently reports no production dependency vulnerabilities. Drizzle Kit's development-only loader chain may report a moderate esbuild advisory; npm's suggested automatic fix downgrades Drizzle Kit incompatibly, so it is intentionally not forced. Keep the CLI bound to localhost and update Drizzle when its upstream dependency is replaced.

## SEO and launch checklist

- Per-page titles and descriptions, canonical metadata, dynamic Open Graph image, favicon, robots, and dynamic sitemap
- Custom 404, global loading and error states, thank-you, privacy, terms, and contact pages
- Responsive breakpoints at 900px, 640px, and 420px with a mobile sticky YouTube CTA
- Consent-controlled Cloudflare Web Analytics and a versioned cookie preference
- Compressed WebP artwork and project covers, YouTube thumbnails, and a server-generated PNG social image

Before a public launch, configure Gmail SMTP and test a real signup email, configure Turnstile for the production hostname, rotate a random `AUTH_SECRET` of at least 32 bytes, and review legal/privacy copy for your jurisdiction.
Enable **Always Use HTTPS** for the production zone in Cloudflare SSL/TLS settings; the application adds HSTS and upgrades insecure subresources after the first secure response.

Cloudflare Pages serves the `pages.dev` hostname over HTTPS. For a future custom domain, enable **Always Use HTTPS** in that zone so redirects happen at the edge.

### Launch values that must be real

The contact and privacy pages use `pimxeltex369@gmail.com`. The site now sends OTPs directly through Gmail SMTP (`smtp.gmail.com`, port 465, TLS). No custom domain or Resend account is needed. To enable public signup:

1. Sign in to the Gmail account that will send codes (`pimxeltex369@gmail.com` by default). Turn on [2-Step Verification](https://myaccount.google.com/security).
2. Open [Google App Passwords](https://myaccount.google.com/apppasswords), create one for `PIMX_ELTEX`, and copy its 16-character value. Do not use the normal Gmail password or paste the App Password into this repository or a chat.
3. In Cloudflare, open **Workers & Pages → pimx-eltex Worker → Settings → Variables and Secrets**. Set `SMTP_USER` to that full Gmail address and `SMTP_APP_PASSWORD` to the new App Password. Both belong to the **Worker**, not the Pages project. The `wrangler secret put` commands above are an alternative.
4. Retry signup with an email you can access. Check the inbox and spam folder, enter the six-digit code, and verify login. A failed send removes the unverified account and code, so the same details can be retried.

The existing Resend secrets are unused by the new code. Gmail IMAP/POP and forwarding settings are not needed to send OTPs. The canonical URL and sitemap use the active `pages.dev` hostname until a custom domain is connected. Update `NEXT_PUBLIC_SITE_URL` in the Pages environment variables when changing domains.

Production Turnstile is configured for `pimxeltex.pages.dev`. Local development can use Cloudflare's documented test keys. Gmail delivery depends on the App Password being configured in the Worker and on Google's account sending limits. The first-party D1 visit tracker works after cookie consent; a Cloudflare Web Analytics beacon additionally needs its token. Set service values through Cloudflare secrets and public build variables; never commit them. `npm run security:secrets` scans the current tracked and unignored worktree files for common credential formats.

D1 has no browser database key or database-enforced row-level policies. Keep the D1 binding on the Pages server runtime and scope private reads and writes in server handlers. The public D1 database ID in `wrangler.toml` is an identifier, not an access key.

## Project map

```text
src/app/blog/[slug]/       full episode hub and discussion
src/app/code/              finished website projects
src/app/admin/             protected admin console
src/app/api/auth/          signup, login, OTP, password reset
src/app/api/comments/      comments, replies, likes, moderation
src/app/api/admin/         episode, project, user, and R2 upload APIs
src/app/robots.ts           crawler policy
src/app/sitemap.ts          dynamic public URL index
src/app/opengraph-image.tsx generated social preview image
src/db/schema.ts           D1 schema and relations
src/emails/otp-email.ts    branded responsive OTP email
drizzle/                   generated SQL migrations
scripts/seed-local.sql     intentionally empty local seed
wrangler.toml              Pages build output and D1 binding
```
