import "server-only";
import { scrypt } from "node:crypto";

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

const passwordScryptN = 65_536;
const passwordScryptR = 8;
const passwordScryptP = 1;
const passwordKeyLength = 32;

async function derivePassword(password: string, salt: string, iterations: number) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations }, key, 256);
  return `pbkdf2_sha256$${iterations}$${salt}$${base64Url(new Uint8Array(bits))}`;
}

export function hashPassword(password: string, salt = randomToken(16)) {
  return new Promise<string>((resolve, reject) => {
    scrypt(password, salt, passwordKeyLength, { N: passwordScryptN, r: passwordScryptR, p: passwordScryptP, maxmem: 128 * 1024 * 1024 }, (error, derivedKey) => {
      if (error) return reject(error);
      resolve(`scrypt$${passwordScryptN}$${passwordScryptR}$${passwordScryptP}$${salt}$${base64Url(new Uint8Array(derivedKey))}`);
    });
  });
}

export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (parts[0] === "scrypt") {
    const [algorithm, n, r, p, salt, expected] = parts;
    if (n !== String(passwordScryptN) || r !== String(passwordScryptR) || p !== String(passwordScryptP) || !salt || !expected) return false;
    const candidate = await hashPassword(password, salt);
    return timingSafeEqual(candidate, `${algorithm}$${n}$${r}$${p}$${salt}$${expected}`);
  }
  const [algorithm, iterations, salt, expected] = parts;
  if (algorithm !== "pbkdf2_sha256" || !["100000", "210000", "600000"].includes(iterations) || !salt || !expected) return false;
  try {
    const candidate = await derivePassword(password, salt, Number(iterations));
    return timingSafeEqual(candidate, stored);
  } catch {
    return false;
  }
}

export function passwordNeedsUpgrade(stored: string) {
  return !stored.startsWith(`scrypt$${passwordScryptN}$${passwordScryptR}$${passwordScryptP}$`);
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
