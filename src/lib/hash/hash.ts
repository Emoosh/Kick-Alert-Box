import crypto from "crypto";

export function hashSlug(slug: string) {
  return crypto.createHash("SHA256").update(String(slug)).digest("hex");
}
