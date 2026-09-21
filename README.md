# PIMX_ELTEX

A secure community platform for the PIMX_ELTEX YouTube channel. The public interface is fully English.

## Content model

- **Episodes**: every video has one complete page containing the video, written explanation, prompts, mentioned websites, source code, live preview, downloads, and a threaded discussion.
- **Projects**: a focused library for visitors who only want finished website projects, live previews, and downloadable files.
- **Admin Console**: create episodes and projects, moderate comments, and block or delete member accounts.

An episode supports up to 50 independent prompt sections. Every prompt can carry its own folder tree (up to 250 files / 45 MB), isolated live preview, file manifest, and automatically generated ZIP download. Use **Import episode folder** when a folder contains `prompt.txt` headings such as `PROMPT 1 — Title` plus matching `prompt 1`, `prompt 2`, ... directories; the editor maps the text and source files automatically.

Existing episodes can be reopened from **Admin Console → Episodes → Edit**. Episode details, prompt text, links, publishing status, and source bundles can all be changed; existing R2 bundles are preserved until replacement files are selected.

There is no standalone prompt library or toolbox.

## Stack

- Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS 4
- Cloudflare Pages through OpenNext advanced mode
- Cloudflare D1 with Drizzle ORM
- Cloudflare R2 for uploaded preview and source files
- Resend email, Cloudflare Turnstile, Web Crypto password hashing

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

The production site is `https://pimx-eltex.pages.dev`. The Cloudflare Pages project is connected directly to this GitHub repository, so every push to `main` builds and deploys automatically. GitHub Actions and a `CLOUDFLARE_API_TOKEN` repository secret are not required.

Cloudflare R2 is not enabled on the account, so the R2 binding is currently omitted from `wrangler.toml`. Public pages work; uploading or serving episode bundles requires enabling R2, creating `pimx-eltex-media`, and restoring the binding. Production email verification also requires a verified Resend sender and `RESEND_API_KEY` secret. Do not advertise account creation as ready until these are configured.

```bash
npx wrangler login
npx wrangler d1 create pimx-eltex-db
npx wrangler r2 bucket create pimx-eltex-media
```

Copy the returned D1 `database_id` into `wrangler.toml`, then add secrets:

```bash
npx wrangler pages secret put AUTH_SECRET --project-name pimx-eltex
npx wrangler pages secret put RESEND_API_KEY --project-name pimx-eltex
npx wrangler pages secret put TURNSTILE_SECRET_KEY --project-name pimx-eltex
```

Set `RESEND_FROM` and the `NEXT_PUBLIC_*` build variables for production. Apply migrations and deploy:

```bash
npm run db:migrate:remote
npm run deploy
```

Promote the first verified production account with:

```bash
npx wrangler d1 execute pimx-eltex-db --remote --command "UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com'"
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
- Hashed, expiring, single-use OTPs with attempt limits
- Random sessions stored as hashes; `HttpOnly`, `SameSite=Lax`, production-secure cookies
- AES-GCM encryption for stored newsletter addresses, with a separate one-way hash for uniqueness
- Adaptive Cloudflare Turnstile on signup, login, password recovery, and suspicious comment bursts; ordinary requests stay frictionless and challenged requests are verified server-side
- D1-backed rate limiting for auth, comments, and likes without storing raw IP addresses
- Origin checks on state-changing routes, production HSTS, restrictive security headers, and sandboxed previews
- Server-side role enforcement for `/admin` and its APIs
- Application-level row ownership checks; D1 is never exposed to browser code and has no public client key
- Strict upload size, extension, MIME, filename, and isolated-content checks
- Country and normalized device metadata instead of raw IP persistence
- Audit records for administrator mutations

Cloudflare D1 does not provide Supabase-style database Row Level Security. This project implements the equivalent authorization boundary in server-only query handlers: every protected record mutation is scoped to the authenticated user or an administrator. Do not create a public D1 credential.

The dependency scan currently reports no production dependency vulnerabilities. Drizzle Kit's development-only loader chain may report a moderate esbuild advisory; npm's suggested automatic fix downgrades Drizzle Kit incompatibly, so it is intentionally not forced. Keep the CLI bound to localhost and update Drizzle when its upstream dependency is replaced.

## SEO and launch checklist

- Per-page titles and descriptions, canonical metadata, dynamic Open Graph image, favicon, robots, and dynamic sitemap
- Custom 404, global loading and error states, thank-you, privacy, terms, and contact pages
- Responsive breakpoints at 900px, 640px, and 420px with a mobile sticky YouTube CTA
- Consent-controlled Cloudflare Web Analytics and a versioned cookie preference
- Compressed WebP artwork and project covers, YouTube thumbnails, and a server-generated PNG social image

Before a public launch, verify the Resend sender domain, configure Turnstile for the production hostname, rotate a random `AUTH_SECRET` of at least 32 bytes, and review legal/privacy copy for your jurisdiction.
Enable **Always Use HTTPS** for the production zone in Cloudflare SSL/TLS settings; the application adds HSTS and upgrades insecure subresources after the first secure response.

The application also redirects non-local HTTP requests to HTTPS in `src/proxy.ts`. A production Cloudflare zone still needs **Always Use HTTPS** enabled so redirects happen at the edge before the Worker runs.

### Launch values that must be real

The contact and privacy pages use `pimxeltex369@gmail.com`. This address receives mail sent by visitors but does not authorize sending verification codes from Gmail. To send production OTPs, verify a domain you own in Resend and configure the Pages secrets `RESEND_API_KEY` and `RESEND_FROM`. The canonical URL and sitemap use the active `pages.dev` hostname until a custom domain is connected. Update `NEXT_PUBLIC_SITE_URL` in the Pages environment variables when changing domains.

Local development currently has a Turnstile test site key and no Cloudflare Web Analytics token or Resend API key. The first-party D1 visit tracker works after cookie consent, but the Cloudflare beacon and production email delivery need their real service values. Set these through Cloudflare secrets and public build variables; never commit them. `npm run security:secrets` scans the current tracked and unignored worktree files for common credential formats.

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
