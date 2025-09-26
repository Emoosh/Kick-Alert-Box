// src/lib/hash/hash.ts
import crypto from "crypto";

/**
 * User ID'yi hash'leyerek güvenli slug oluşturur
 */
export function hashSlug(userId: number | string): string {
  const userIdString = userId.toString();
  return crypto.createHash("sha256").update(userIdString).digest("hex");
}

// Default export
export default {
  hashSlug,
};
