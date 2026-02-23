import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateBetaToken } from "@/lib/betaAuth";
import { validatePanelToken } from "@/lib/panelToken";

const PUBLIC_PATHS = new Set<string>(["/", "/login"]);

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  // permitir assets explícitos
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/robots.txt")) return true;
  if (pathname.startsWith("/sitemap")) return true;
  return false;
}

function getOrCreateRequestId(req: NextRequest) {
  return req.headers.get("x-request-id") || crypto.randomUUID();
}

function nextWithRequestId(req: NextRequest, requestId: string) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);

  const res = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });

  res.headers.set("x-request-id", requestId);
  return res;
}

export async function middleware(req: NextRequest) {
  const requestId = getOrCreateRequestId(req);
  const authEmail = (process.env.AUTH_EMAIL || "").trim().toLowerCase();
  const authSecret = process.env.AUTH_SECRET || process.env.BETA_SECRET;

  const { pathname, search } = req.nextUrl;
  if (isPublicPath(pathname)) return nextWithRequestId(req, requestId);

  if (authEmail && authSecret) {
    const authToken = req.cookies.get("ss_auth")?.value || "";
    const payload = authToken ? await validatePanelToken(authSecret, authToken) : null;
    const ok = payload?.email === authEmail;
    if (ok) return nextWithRequestId(req, requestId);
  } else {
    const password = process.env.BETA_PASSWORD;
    const secret = process.env.BETA_SECRET;

    // Si no está configurado, no aplicamos gate (modo demo/dev).
    if (!password || !secret) return nextWithRequestId(req, requestId);

    const token = req.cookies.get("ss_beta")?.value || "";
    const ok = token ? await validateBetaToken(secret, token) : false;
    if (ok) return nextWithRequestId(req, requestId);
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  // guardamos destino para volver después
  url.searchParams.set("next", `${pathname}${search}`);

  const res = NextResponse.redirect(url);
  res.headers.set("x-request-id", requestId);
  return res;
}

export const config = {
  matcher: [
    // todo menos assets internos
    "/((?!_next/static|_next/image|favicon.ico).*)"
  ]
};
