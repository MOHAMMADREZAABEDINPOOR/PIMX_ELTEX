export type RequestMetadata = {
  countryCode: string | null;
  deviceType: string;
  operatingSystem: string;
  browser: string;
  fingerprint: string;
  city: string | null;
  region: string | null;
  ipAddress: string | null;
};

export async function getRequestMetadata(request: Request): Promise<RequestMetadata> {
  const userAgent = request.headers.get("user-agent") || "Unknown";
  let cloudflare = (request as Request & { cf?: { country?: string; city?: string; region?: string } }).cf;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    cloudflare = (await getCloudflareContext({ async: true })).cf || cloudflare;
  } catch { /* Local requests may not have Cloudflare context. */ }
  const rawCountry = request.headers.get("x-pimx-visitor-country") || cloudflare?.country || request.headers.get("cf-ipcountry") || "";
  const countryCode = /^[A-Z]{2}$/i.test(rawCountry) ? rawCountry.toUpperCase() : null;
  const city = (request.headers.get("x-pimx-visitor-city") || cloudflare?.city || request.headers.get("cf-ipcity") || "").slice(0, 100) || null;
  const region = (request.headers.get("x-pimx-visitor-region") || cloudflare?.region || request.headers.get("cf-region") || "").slice(0, 100) || null;
  const ipAddress = request.headers.get("cf-connecting-ip") || null;
  const deviceType = /tablet|ipad/i.test(userAgent) ? "Tablet" : /mobile|android|iphone/i.test(userAgent) ? "Mobile" : "Desktop";
  const operatingSystem = /windows/i.test(userAgent) ? "Windows" : /iphone|ipad|ios/i.test(userAgent) ? "iOS" : /android/i.test(userAgent) ? "Android" : /mac os|macintosh/i.test(userAgent) ? "macOS" : /linux/i.test(userAgent) ? "Linux" : "Unknown";
  const browser = /edg\//i.test(userAgent) ? "Edge" : /firefox\//i.test(userAgent) ? "Firefox" : /chrome\//i.test(userAgent) ? "Chrome" : /safari\//i.test(userAgent) ? "Safari" : "Unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${userAgent}:${ipAddress || countryCode || "local"}`));
  const fingerprint = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return { countryCode, deviceType, operatingSystem, browser, fingerprint, city, region, ipAddress };
}
