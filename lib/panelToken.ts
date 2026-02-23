const encoder = new TextEncoder();

export type PanelTokenPayload = {
  email: string;
  expTs: number;
};

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

function bytesFromBase64(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const withPad = `${normalized}${pad}`;

  const B = (globalThis as { Buffer?: { from(input: string, encoding: "base64"): Uint8Array } }).Buffer;
  if (typeof B !== "undefined") return B.from(withPad, "base64");
  // eslint-disable-next-line no-undef
  const raw = atob(withPad);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function parseEmailFromB64(emailB64: string) {
  try {
    return new TextDecoder().decode(bytesFromBase64(emailB64)).toLowerCase();
  } catch {
    return "";
  }
}

function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/** token: <expTs>.<email_b64url>.<hmac> */
export async function issuePanelToken(secret: string, email: string, maxAgeSeconds = 60 * 60 * 24 * 30) {
  const expTs = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const emailB64 = base64UrlEncode(encoder.encode(email.toLowerCase()));
  const sig = await hmacSha256(secret, `exp:${expTs}.email:${emailB64}`);
  return `${expTs}.${emailB64}.${sig}`;
}

export async function validatePanelToken(secret: string, token: string): Promise<PanelTokenPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const expTs = Number(parts[0]);
  if (!Number.isFinite(expTs) || expTs <= 0) return null;

  const now = Math.floor(Date.now() / 1000);
  if (now > expTs) return null;

  const emailB64 = parts[1];
  const sig = parts[2];
  const expected = await hmacSha256(secret, `exp:${expTs}.email:${emailB64}`);
  if (!safeEq(expected, sig)) return null;

  const email = parseEmailFromB64(emailB64);
  if (!email) return null;

  return { email, expTs };
}
