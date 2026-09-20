import "server-only";

const encoder = new TextEncoder();

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return base64Url(value);
}

export function randomOtp() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return String((value[0] % 900_000) + 100_000);
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return base64Url(new Uint8Array(digest));
}

const passwordIterations = 600_000;

async function derivePassword(password: string, salt: string, iterations: number) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations }, key, 256);
  return `pbkdf2_sha256$${iterations}$${salt}$${base64Url(new Uint8Array(bits))}`;
}

export function hashPassword(password: string, salt = randomToken(16)) {
  return derivePassword(password, salt, passwordIterations);
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, iterations, salt, expected] = stored.split("$");
  if (algorithm !== "pbkdf2_sha256" || !["210000", "600000"].includes(iterations) || !salt || !expected) return false;
  const candidate = await derivePassword(password, salt, Number(iterations));
  return timingSafeEqual(candidate, stored);
}

export function passwordNeedsUpgrade(stored: string) {
  return stored.startsWith("pbkdf2_sha256$210000$");
}

export function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function hashOtp(email: string, code: string, secret: string) {
  return sha256(`${email.toLowerCase()}:${code}:${secret}`);
}
