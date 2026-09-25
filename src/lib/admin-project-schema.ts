import { z } from "zod";
import { optionalResourceUrlSchema, safeResourceUrlSchema } from "./validation";

export const adminProjectSchema = z.object({
  slug: z.string().max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(400),
  tech: z.array(z.string().trim().min(1).max(30)).min(1).max(10),
  previewUrl: safeResourceUrlSchema,
  downloadUrl: safeResourceUrlSchema,
  coverUrl: optionalResourceUrlSchema.default(""),
  status: z.enum(["draft", "published"]).default("draft"),
});
