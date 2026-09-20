import "server-only";

export async function getEnvironment() {
  let cloudflare: Partial<CloudflareEnv> = {};
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    cloudflare = (await getCloudflareContext({ async: true })).env as unknown as Partial<CloudflareEnv>;
  } catch { /* Standard Next.js local development. */ }
  const configuredAuthSecret = cloudflare.AUTH_SECRET || process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!configuredAuthSecret || configuredAuthSecret.length < 32)) throw new Error("AUTH_SECRET must contain at least 32 characters in production.");
  return {
    authSecret: configuredAuthSecret || "local-development-secret-change-before-deploy",
    resendApiKey: cloudflare.RESEND_API_KEY || process.env.RESEND_API_KEY,
    resendFrom: cloudflare.RESEND_FROM || process.env.RESEND_FROM,
    turnstileSecret: cloudflare.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY,
  };
}

export async function verifyTurnstile(token: unknown, secret?: string) {
  if (!secret) return process.env.NODE_ENV !== "production";
  if (typeof token !== "string" || !token) return false;
  const body = new FormData(); body.set("secret", secret); body.set("response", token);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  if (!response.ok) return false;
  return Boolean((await response.json() as { success?: boolean }).success);
}
