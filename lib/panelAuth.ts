import { scryptSync, timingSafeEqual } from "crypto";

const encoder = new TextEncoder();

function base64FromBytes(bytes: Uint8Array) {
  const B = (globalThis as { Buffer?: { from(input: Uint8Array): { toString(encoding: "base64"): string } } }).Buffer;
  if (typeof B !== "undefined") return B.from(bytes).toString("base64");

  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  // eslint-disable-next-line no-undef
  return btoa(binary);
}

function base64UrlEncode(bytes: Uint8Array) {
  return base64FromBytes(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function bytesFromBase64(input: string) {
  const B = (globalThis as { Buffer?: { from(input: string, encoding: "base64"): Uint8Array } }).Buffer;
  if (typeof B !== "undefined") return B.from(input, "base64");
  // eslint-disable-next-line no-undef
  const raw = atob(input);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function hmacSha256(secret: string, data: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64UrlEncode(new Uint8Array(sig));
}

function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function hashPasswordScrypt(password: string, salt: string) {
  const key = scryptSync(password, salt, 32);
  return key.toString("base64");
}

export function verifyPassword(password: string) {
  const plain = process.env.AUTH_PASSWORD || "";
  const hash = process.env.AUTH_PASSWORD_HASH || "";

  if (hash.startsWith("s2$")) {
    const parts = hash.split("$");
    if (parts.length < 6) return false;
    const salt = parts[4];
    const expected = parts[5];
    const actual = hashPasswordScrypt(password, salt);
    try {
      return timingSafeEqual(bytesFromBase64(actual), bytesFromBase64(expected));
    } catch {
      return false;
    }
  }

  if (!plain) return false;
  return safeEq(password, plain);
}

