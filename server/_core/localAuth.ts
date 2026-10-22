/**
 * Local credential accounts + signed session tokens for MediSafe.
 *
 * This prototype must run with no database and no external identity provider
 * configured, so accounts live in `uploads/accounts.json` (git-ignored runtime
 * data) in a file that is separate from the clinical data export
 * (`uploads/db_store.json`) — credential material never ships alongside patient
 * records. Passwords are salted scrypt hashes; sessions are HS256 JWTs signed
 * with a secret that is read from `JWT_SECRET` when set and otherwise persisted
 * to `uploads/.session-secret` so sessions survive server restarts.
 *
 * When a database is configured, move `findAccountByEmail` / `createAccount`
 * onto the `users` table (adding a `passwordHash` column) and keep this module
 * as the session layer.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parse } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import type { SessionUser } from "./context";
import { COOKIE_NAME } from "@shared/const";
import { createPatientProfile } from "../db";

export type PortalRole = "patient" | "doctor";

export type SessionClaims = {
  accountId: number;
  email: string;
  name: string;
  portalRole: PortalRole;
  patientId: number;
  demo: boolean;
};

type StoredAccount = {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  portalRole: PortalRole;
  patientId: number;
  createdAt: string;
};

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const ACCOUNTS_PATH = path.join(process.cwd(), "uploads", "accounts.json");
const SESSION_SECRET_PATH = path.join(process.cwd(), "uploads", ".session-secret");

/**
 * Seeded patient profile a newly registered patient account is linked to.
 * `server/db.ts` seeds patient profiles 1..5 in `uploads/db_store.json`;
 * patient accounts all start on profile 1 (single-user prototype data).
 */
const DEFAULT_PATIENT_ID = 1;

// ---------------------------------------------------------------------------
// Account store
// ---------------------------------------------------------------------------

function readAccounts(): StoredAccount[] {
  try {
    if (fs.existsSync(ACCOUNTS_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(ACCOUNTS_PATH, "utf-8"));
      if (Array.isArray(parsed)) return parsed as StoredAccount[];
    }
  } catch (err) {
    console.error("[Auth] Failed to read accounts file:", err);
  }
  return [];
}

function writeAccounts(accounts: StoredAccount[]): void {
  const dir = path.dirname(ACCOUNTS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ACCOUNTS_PATH, JSON.stringify(accounts, null, 2), { encoding: "utf-8", mode: 0o600 });
}

export function findAccountByEmail(email: string): StoredAccount | undefined {
  const normalized = email.trim().toLowerCase();
  return readAccounts().find((account) => account.email === normalized);
}

export function findAccountById(id: number): StoredAccount | undefined {
  return readAccounts().find((account) => account.id === id);
}

export class AccountError extends Error {}

export async function createAccount(input: {
  name: string;
  email: string;
  password: string;
  portalRole: PortalRole;
}): Promise<StoredAccount> {
  const email = input.email.trim().toLowerCase();
  if (findAccountByEmail(email)) {
    throw new AccountError("An account with this email already exists.");
  }

  const accounts = readAccounts();
  const nextAccountId = accounts.reduce((max, account) => Math.max(max, account.id), 0) + 1;

  let patientId = 0;
  if (input.portalRole === "patient") {
    const profile = await createPatientProfile({
      name: input.name.trim(),
      userId: nextAccountId,
    });
    patientId = profile.id;
  }

  const account: StoredAccount = {
    id: nextAccountId,
    email,
    name: input.name.trim(),
    passwordHash: await hashPassword(input.password),
    portalRole: input.portalRole,
    patientId,
    createdAt: new Date().toISOString(),
  };
  accounts.push(account);
  writeAccounts(accounts);
  return account;
}

// ---------------------------------------------------------------------------
// Password hashing (scrypt, per-password random salt)
// ---------------------------------------------------------------------------

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

function scrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password.normalize("NFKC"),
      salt,
      SCRYPT.keylen,
      { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p },
      (err, derivedKey) => (err ? reject(err) : resolve(derivedKey)),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(password, salt);
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), derived.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, n, r, p, saltB64, hashB64] = stored.split("$");
    if (scheme !== "scrypt" || !n || !r || !p || !saltB64 || !hashB64) return false;
    const expected = Buffer.from(hashB64, "base64");
    const derived = await scrypt(password, Buffer.from(saltB64, "base64"));
    return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Session tokens
// ---------------------------------------------------------------------------

let memorySecret: Buffer | null = null;

function getSessionSecret(): Buffer {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length >= 16) return Buffer.from(fromEnv, "utf-8");

  try {
    if (fs.existsSync(SESSION_SECRET_PATH)) {
      const raw = fs.readFileSync(SESSION_SECRET_PATH, "utf-8").trim();
      if (raw.length >= 32) return Buffer.from(raw, "utf-8");
    }
    const generated = crypto.randomBytes(48).toString("base64");
    fs.mkdirSync(path.dirname(SESSION_SECRET_PATH), { recursive: true });
    fs.writeFileSync(SESSION_SECRET_PATH, generated, { encoding: "utf-8", mode: 0o600 });
    return Buffer.from(generated, "utf-8");
  } catch (err) {
    // Read-only filesystem: keep the process alive with an in-memory secret;
    // sessions then reset when the server restarts.
    console.warn("[Auth] Could not persist session secret, using in-memory secret:", err);
    if (!memorySecret) memorySecret = crypto.randomBytes(48);
    return memorySecret;
  }
}

export async function createSessionToken(claims: SessionClaims): Promise<string> {
  return await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(claims.accountId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    if (
      typeof payload.accountId !== "number" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      (payload.portalRole !== "patient" && payload.portalRole !== "doctor") ||
      typeof payload.patientId !== "number"
    ) {
      return null;
    }
    return {
      accountId: payload.accountId,
      email: payload.email,
      name: payload.name,
      portalRole: payload.portalRole,
      patientId: payload.patientId,
      demo: payload.demo === true,
    };
  } catch {
    return null;
  }
}

/** Map verified session claims onto the `User` shape the rest of the app expects. */
export function sessionUserFromClaims(claims: SessionClaims): SessionUser {
  const now = new Date();
  return {
    id: claims.accountId,
    openId: claims.demo ? "demo:medisafe" : `local:${claims.email}`,
    name: claims.name,
    email: claims.email,
    loginMethod: claims.demo ? "demo" : "password",
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    portalRole: claims.portalRole,
    patientId: claims.patientId || undefined,
    demo: claims.demo,
  };
}

/** Resolve the session cookie on an incoming request (password or demo login). */
export async function authenticateLocalSession(req: {
  headers: { cookie?: string | string[] };
}): Promise<SessionUser | null> {
  const header = req.headers.cookie;
  if (!header) return null;
  const cookies = parse(typeof header === "string" ? header : header.join("; "));
  const claims = await verifySessionToken(cookies[COOKIE_NAME]);
  if (!claims) return null;
  return sessionUserFromClaims(claims);
}

/** Claims for the one-click "Continue with demo access" session. */
export function demoSessionClaims(): SessionClaims {
  return {
    accountId: 0,
    email: "demo@medisafe.local",
    name: "Demo Patient",
    portalRole: "patient",
    patientId: DEFAULT_PATIENT_ID,
    demo: true,
  };
}
