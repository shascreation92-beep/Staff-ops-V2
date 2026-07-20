import bcrypt from "bcryptjs";

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
