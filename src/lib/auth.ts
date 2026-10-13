import crypto from "crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";

const COOKIE_NAME = "platterobe_admin_session";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getAuthSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    "platterobe_editorial_secure_session_secret_2026_malappuram_789xyz"
  );
}

function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL || "admin@platterobe.co";
}

function getAdminUsername(): string {
  return process.env.ADMIN_USERNAME || "admin";
}

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "platterobe2026!";
}

/**
 * Constant-time string comparison to defend against timing attacks.
 */
function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) {
    const hashA = crypto.createHash("sha256").update(bufA).digest();
    const hashB = crypto.createHash("sha256").update(bufB).digest();
    crypto.timingSafeEqual(hashA, hashB);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function verifyAdminCredentials(identifier: string, password: string): boolean {
  if (!identifier || !password) return false;

  const expectedEmail = getAdminEmail().trim().toLowerCase();
  const expectedUser = getAdminUsername().trim().toLowerCase();
  const expectedPass = getAdminPassword();

  const cleanIdent = identifier.trim().toLowerCase();

  const userMatches =
    safeEqual(cleanIdent, expectedEmail) || safeEqual(cleanIdent, expectedUser);
  const passMatches = safeEqual(password, expectedPass);

  return userMatches && passMatches;
}

export function createSessionToken(username: string): string {
  const secret = getAuthSecret();
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${username}:${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return `${payload}:${signature}`;
}

export function verifySessionToken(token: string | undefined): {
  isValid: boolean;
  username?: string;
} {
  if (!token || typeof token !== "string") return { isValid: false };

  // Handle URL-encoded or quoted cookie values that browsers/proxies may produce
  let cleanToken = token.trim();
  if (cleanToken.startsWith('"') && cleanToken.endsWith('"')) {
    cleanToken = cleanToken.slice(1, -1);
  }
  if (cleanToken.includes("%3A") || cleanToken.includes("%3a")) {
    try {
      cleanToken = decodeURIComponent(cleanToken);
    } catch {
      // ignore decode error and proceed with cleanToken
    }
  }

  const parts = cleanToken.split(":");
  if (parts.length !== 3) return { isValid: false };

  const [username, expiresAtStr, signature] = parts;
  if (!username || !expiresAtStr || !signature) {
    return { isValid: false };
  }

  const rawExpiresAt = Number(expiresAtStr);
  if (!rawExpiresAt || isNaN(rawExpiresAt)) {
    return { isValid: false };
  }

  // Normalize timestamp units: if stored in seconds (10 digits), convert to ms
  const expiresAt = rawExpiresAt < 10_000_000_000 ? rawExpiresAt * 1000 : rawExpiresAt;

  if (Date.now() > expiresAt) {
    return { isValid: false };
  }

  const secret = getAuthSecret();
  const expectedPayload = `${username}:${expiresAtStr}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(expectedPayload)
    .digest("hex");

  if (!safeEqual(signature, expectedSignature)) {
    return { isValid: false };
  }

  return { isValid: true, username };
}

export async function setAdminSessionCookie(username: string): Promise<void> {
  const cookieStore = await cookies();
  const token = createSessionToken(username);

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getAdminSession(): Promise<{
  isAuthenticated: boolean;
  username?: string;
}> {
  // connection() must remain outside try/catch so Next.js prerender suspension can propagate
  await connection();

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) {
      return { isAuthenticated: false };
    }
    const { isValid, username } = verifySessionToken(token);
    return { isAuthenticated: isValid, username };
  } catch (err) {
    console.error("Error reading admin session cookie:", err);
    return { isAuthenticated: false };
  }
}
