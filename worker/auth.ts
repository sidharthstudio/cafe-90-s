// Secure auth primitives for the Café 90's admin dashboard.
// Passwords: PBKDF2-SHA256 (60k iterations, per-user random salt).
// Sessions: HMAC-SHA256 signed, HttpOnly cookie (stateless, 7 days).

export const COOKIE_NAME = "c90_admin";
const ITERATIONS = 60_000;

const enc = new TextEncoder();

function toB64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(str: string): Uint8Array {
  const raw = atob(str);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function toBase64Url(bytes: Uint8Array | ArrayBuffer): string {
  return toB64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iter, salt, hash] = stored.split("$");
    if (scheme !== "pbkdf2") return false;
    const computed = await pbkdf2(password, fromB64(salt), Number(iter) || ITERATIONS);
    return safeEqual(toB64(computed), hash);
  } catch {
    return false;
  }
}

/** Secret used to sign session cookies. Set SESSION_SECRET in production. */
function secret(envSecret?: string): string {
  return envSecret && envSecret.length >= 16 ? envSecret : "cafe90s-development-secret-please-change";
}

async function hmacKey(envSecret?: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret(envSecret)), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export type SessionPayload = { sub: number; email: string; exp: number };

export async function createSessionToken(payload: SessionPayload, envSecret?: string): Promise<string> {
  const body = toBase64Url(enc.encode(JSON.stringify(payload)));
  const key = await hmacKey(envSecret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return `${body}.${toBase64Url(sig)}`;
}

export async function readSessionToken(token: string, envSecret?: string): Promise<SessionPayload | null> {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const key = await hmacKey(envSecret);
    const expected = await crypto.subtle.sign("HMAC", key, enc.encode(body));
    if (!safeEqual(toBase64Url(expected), sig)) return null;
    const json = JSON.parse(new TextDecoder().decode(fromB64(body.replace(/-/g, "+").replace(/_/g, "/"))));
    if (typeof json?.exp !== "number" || json.exp < Date.now()) return null;
    return json as SessionPayload;
  } catch {
    return null;
  }
}

/** Very small, best-effort brute-force guard (per isolate). */
const attempts = new Map<string, { count: number; first: number }>();
export function loginAllowed(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.first > 10 * 60_000) {
    attempts.set(ip, { count: 0, first: now });
    return true;
  }
  return rec.count < 8;
}
export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.first > 10 * 60_000) attempts.set(ip, { count: 1, first: now });
  else rec.count += 1;
}
export function clearLoginFailures(ip: string): void {
  attempts.delete(ip);
}
