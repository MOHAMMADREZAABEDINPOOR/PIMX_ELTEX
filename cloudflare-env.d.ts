interface CloudflareEnv {
  DB: D1Database;
  MEDIA?: R2Bucket;
  ASSETS: Fetcher;
  APP_URL: string;
  SMTP_USER: string;
  AUTH_SECRET: string;
  SMTP_APP_PASSWORD: string;
  TURNSTILE_SECRET_KEY: string;
}
