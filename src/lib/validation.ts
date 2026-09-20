import { z } from "zod";

export const strongPasswordSchema = z.string().min(12).max(128)
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol.");

export const safeResourceUrlSchema = z.string().trim().min(1).max(1_000).refine((value) => {
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}, "Use a site path or an HTTPS URL.");

export const optionalResourceUrlSchema = safeResourceUrlSchema.or(z.literal(""));
