import crypto from "crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import bcrypt from "bcryptjs";
import { getUserByEmail, getUserById } from "@/lib/db";

const COOKIE_NAME = "platterobe_admin_session";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getAuthSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    "platterobe_editorial_secure_session_secret_2026_malappuram_789xyz"
  );
}

function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || "platterobe@gmail.com").trim().toLowerCase();
}

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "platterobe26!";
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

export function verifyAdminCredentials(identifier: string, password: string): {
  isValid: boolean;
  user?: { id: string; email: string; role: string };
} {
  if (!identifier || !password) return { isValid: false };

  const cleanIdent = identifier.trim().toLowerCase();

  // 1. Look up user in SQLite database
  try {
    const dbUser = getUserByEmail(cleanIdent);
    if (dbUser && dbUser.password_hash) {
      const match = bcrypt.compareSync(password, dbUser.password_hash);
      if (match && dbUser.role === "admin") {
        return {
          isValid: true,
          user: { id: dbUser.id, email: dbUser.email, role: dbUser.role },
        };
      }
    }
  } catch (err) {
    console.error("Database user lookup error:", err);
  }

  // 2. Fallback check against configured environment credentials
  const expectedEmail = getAdminEmail();
  const expectedPass = getAdminPassword();
  if (safeEqual(cleanIdent, expectedEmail) && safeEqual(password, expectedPass)) {
    return {
      isValid: true,
      user: { id: "admin-primary", email: expectedEmail, role: "admin" },
    };
  }

  return { isValid: false };
}

export function createSessionToken(userId: string, email: string, role: string = "admin"): string {
  const secret = getAuthSecret();
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payloadData = { userId, email, role, expiresAt };
  const payload = Buffer.from(JSON.stringify(payloadData), "utf-8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string | undefined): {
  isValid: boolean;
  userId?: string;
  email?: string;
  username?: string;
  role?: string;
} {
  if (!token || typeof token !== "string") return { isValid: false };

  let cleanToken = token.trim();
  if (cleanToken.startsWith('"') && cleanToken.endsWith('"')) {
    cleanToken = cleanToken.slice(1, -1);
  }
  if (cleanToken.includes("%3A") || cleanToken.includes("%3a")) {
    try {
      cleanToken = decodeURIComponent(cleanToken);
    } catch {
      // ignore decode error
    }
  }

  const secret = getAuthSecret();

  // Base64URL payload token format
  if (cleanToken.includes(".")) {
    const [payload, signature] = cleanToken.split(".");
    if (!payload || !signature) return { isValid: false };

    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    if (!safeEqual(signature, expectedSig)) {
      return { isValid: false };
    }

    try {
      const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
      if (!decoded || typeof decoded !== "object") return { isValid: false };

      const { userId, email, role, expiresAt } = decoded;
      if (!email || !expiresAt || role !== "admin") {
        return { isValid: false };
      }

      if (Date.now() > expiresAt) {
        return { isValid: false };
      }

      return {
        isValid: true,
        userId: userId || "admin-primary",
        email,
        username: email,
        role,
      };
    } catch {
      return { isValid: false };
    }
  }

  // Legacy colon-separated token fallback
  const parts = cleanToken.split(":");
  if (parts.length === 3) {
    const [username, expiresAtStr, signature] = parts;
    if (!username || !expiresAtStr || !signature) return { isValid: false };

    const rawExpiresAt = Number(expiresAtStr);
    if (!rawExpiresAt || isNaN(rawExpiresAt)) return { isValid: false };

    const expiresAt = rawExpiresAt < 10_000_000_000 ? rawExpiresAt * 1000 : rawExpiresAt;
    if (Date.now() > expiresAt) return { isValid: false };

    const expectedPayload = `${username}:${expiresAtStr}`;
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(expectedPayload)
      .digest("hex");

    if (!safeEqual(signature, expectedSig)) return { isValid: false };

    return {
      isValid: true,
      userId: "admin-primary",
      email: username,
      username,
      role: "admin",
    };
  }

  return { isValid: false };
}

export async function setAdminSessionCookie(
  userId: string,
  email: string,
  role: string = "admin"
): Promise<void> {
  const cookieStore = await cookies();
  const token = createSessionToken(userId, email, role);

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
  userId?: string;
  email?: string;
  username?: string;
  role?: string;
}> {
  // connection() must remain outside try/catch so Next.js prerender suspension can propagate
  await connection();

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) {
      return { isAuthenticated: false };
    }
    const session = verifySessionToken(token);
    return {
      isAuthenticated: session.isValid && session.role === "admin",
      userId: session.userId,
      email: session.email,
      username: session.username,
      role: session.role,
    };
  } catch (err) {
    console.error("Error reading admin session cookie:", err);
    return { isAuthenticated: false };
  }
}
