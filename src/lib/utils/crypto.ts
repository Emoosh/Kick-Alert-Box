import crypto from "crypto";

const ENCRYPTION_KEY = process.env.CRYPTO_SECRET;
const IV_LENGTH = 16; // AES için IV uzunluğu

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);

  if (!ENCRYPTION_KEY || Buffer.byteLength(ENCRYPTION_KEY) !== 32) {
    throw new Error(
      "CRYPTO_SECRET environment variable must be 32 characters long"
    );
  }
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "utf-8"),
    iv
  );
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  return iv.toString("base64") + ":" + encrypted;
}

export function decrypt(text: string): string {
  const [ivBase64, encrypted] = text.split(":");
  const iv = Buffer.from(ivBase64, "base64");
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    throw new Error(
      "CRYPTO_SECRET environment variable must be 32 characters long"
    );
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "utf-8"),
    iv
  );
  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
