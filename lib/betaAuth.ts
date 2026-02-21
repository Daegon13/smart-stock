const encoder = new TextEncoder();

function base64FromBytes(bytes: Uint8Array) {
  // Node
  const B = (globalThis as { Buffer?: { from(input: Uint8Array): { toString(encoding: "base64"): string } } }).Buffer;
  if (typeof B !== "undefined") return B.from(bytes).toString("base64");

  // Edge / browser
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

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/**
 * Token simple para beta gate:
 *   <unix_ts>.<hmac>
 */
export async function issueBetaToken(secret: string) {
  const ts = Math.floor(Date.now() / 1000);
  const sig = await hmacSha256(secret, `ts:${ts}`);
  return `${ts}.${sig}`;
}

export async function validateBetaToken(secret: string, token: string, maxAgeSeconds = 60 * 60 * 24 * 30) {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const ts = Number(parts[0]);
  if (!Number.isFinite(ts) || ts <= 0) return false;

  const now = Math.floor(Date.now() / 1000);
  if (now - ts > maxAgeSeconds) return false;

  const expected = await hmacSha256(secret, `ts:${ts}`);
  return timingSafeEqual(expected, parts[1]);
}
