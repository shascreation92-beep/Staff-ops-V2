import bcrypt from "bcryptjs";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "worknode_staffops_secret_key_32b!"; // 32 characters
const ALGORITHM = "aes-256-gcm";

/**
 * Encrypt sensitive credentials (AES-256-GCM)
 */
export function encryptCredential(text: string | null | undefined): string | null {
  if (!text) return null;
  // If already encrypted (starts with enc:) return as is
  if (text.startsWith("enc:")) return text;

  try {
    const iv = crypto.randomBytes(12);
    const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    return `enc:${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error("Encryption error:", err);
    return text;
  }
}

/**
 * Decrypt sensitive credentials (AES-256-GCM) with transparent plaintext fallback
 */
export function decryptCredential(encryptedText: string | null | undefined): string | null {
  if (!encryptedText) return null;
  if (!encryptedText.startsWith("enc:")) return encryptedText; // Legacy plaintext fallback

  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 4) return encryptedText;

    const iv = Buffer.from(parts[1], "hex");
    const authTag = Buffer.from(parts[2], "hex");
    const encrypted = parts[3];

    const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.error("Decryption error:", err);
    return encryptedText;
  }
}

/**
 * 1. Secure Password Hashing (bcryptjs with salt rounds = 12)
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) return "";
  return await bcrypt.hash(password, 12);
}


/**
 * 2. Password Verification with legacy plaintext fallback & auto-upgrade flag
 */
export async function verifyPassword(
  plainText: string,
  storedHashOrPlain: string
): Promise<{ isValid: boolean; needsUpgrade: boolean }> {
  if (!plainText || !storedHashOrPlain) {
    return { isValid: false, needsUpgrade: false };
  }

  // Detect if stored string is a bcrypt hash ($2a$, $2b$, or $2y$)
  const isBcrypt = /^\$2[aby]\$\d{2}\$/.test(storedHashOrPlain);

  if (isBcrypt) {
    const match = await bcrypt.compare(plainText, storedHashOrPlain);
    return { isValid: match, needsUpgrade: false };
  }

  // Legacy plaintext fallback
  const isPlaintextMatch = plainText === storedHashOrPlain;
  return { isValid: isPlaintextMatch, needsUpgrade: isPlaintextMatch };
}

/**
 * 3. Input Sanitization (Strips HTML tags, script elements, control chars)
 */
export function sanitizeInput<T>(input: T): T {
  if (typeof input === "string") {
    const cleaned = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<[^>]*>?/gm, "") // Strip HTML tags
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Strip dangerous control chars
      .trim();
    return cleaned as T;
  }

  if (typeof input === "object" && input !== null) {
    if (Array.isArray(input)) {
      return input.map((item) => sanitizeInput(item)) as T;
    }
    const sanitizedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitizedObj[key] = sanitizeInput(value);
    }
    return sanitizedObj as T;
  }

  return input;
}

/**
 * 4. Rate Limiting Engine for Sign-In Attempts
 */
interface RateLimitRecord {
  attempts: number;
  lockedUntil: number | null;
  firstAttemptAt: number;
}

const loginAttemptsStore = new Map<string, RateLimitRecord>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes lockout
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minute sliding window

export function checkLoginRateLimit(identifier: string): { isAllowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = loginAttemptsStore.get(identifier);

  if (!record) {
    return { isAllowed: true };
  }

  // If currently locked out
  if (record.lockedUntil && now < record.lockedUntil) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { isAllowed: false, retryAfterSeconds: remainingSeconds };
  }

  // Reset window if time expired
  if (now - record.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    loginAttemptsStore.delete(identifier);
    return { isAllowed: true };
  }

  return { isAllowed: true };
}

export function recordFailedLoginAttempt(identifier: string): { isLockedOut: boolean; remainingAttempts: number; retryAfterSeconds?: number } {
  const now = Date.now();
  let record = loginAttemptsStore.get(identifier);

  if (!record || (now - record.firstAttemptAt > ATTEMPT_WINDOW_MS)) {
    record = { attempts: 1, lockedUntil: null, firstAttemptAt: now };
  } else {
    record.attempts += 1;
  }

  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_WINDOW_MS;
    loginAttemptsStore.set(identifier, record);
    return { isLockedOut: true, remainingAttempts: 0, retryAfterSeconds: 15 * 60 };
  }

  loginAttemptsStore.set(identifier, record);
  return { isLockedOut: false, remainingAttempts: MAX_FAILED_ATTEMPTS - record.attempts };
}

export function resetLoginAttempts(identifier: string): void {
  loginAttemptsStore.delete(identifier);
}
