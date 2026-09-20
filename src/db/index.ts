import "server-only";

import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export async function getDatabase() {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    if (!env.DB) return null;
    return drizzle(env.DB as D1Database, { schema });
  } catch {
    return null;
  }
}
