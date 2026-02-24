import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateBetaToken } from "@/lib/betaAuth";

const APP_ROUTE_PREFIXES = [
  "/dashboard",
  "/today",
  "/import",
  "/stock",
  "/orders",
  "/products",
  "/suppliers",
  "/categories",
  "/movements",
  "/reconcile",
  "/aliases",
  "/assistant",
  "/copilot",
  "/pos",
  "/purchases",
  "/tickets",
  "/logout"
];

function isProtectedPath(pathname: string) {
  if (pathname.startsWith("/api/")) return pathname !== "/api/health";
  return APP_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
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


function unauthorizedApi(requestId: string) {
  return NextResponse.json(
    { ok: false, error: "Unauthorized" },
    { status: 401, headers: { "x-request-id": requestId } }
  );
}

function blockedByBetaMisconfig(req: NextRequest, requestId: string) {
  const isApi = req.nextUrl.pathname.startsWith("/api/");
  if (isApi) {
    return NextResponse.json(
      { ok: false, error: "Beta gate no configurado en producción (faltan BETA_PASSWORD/BETA_SECRET)." },
      { status: 503, headers: { "x-request-id": requestId } }
    );
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("misconfig", "1");
  const res = NextResponse.redirect(url);
  res.headers.set("x-request-id", requestId);
  return res;
}

export async function middleware(req: NextRequest) {
  const requestId = getOrCreateRequestId(req);
  const password = process.env.BETA_PASSWORD;
  const secret = process.env.BETA_SECRET;

  const { pathname, search } = req.nextUrl;
  if (!isProtectedPath(pathname)) return nextWithRequestId(req, requestId);

  // Producción: fail-closed para no dejar el panel abierto por error de configuración.
  if (process.env.NODE_ENV === "production" && (!password || !secret)) {
    return blockedByBetaMisconfig(req, requestId);
  }

  // Dev/demo sin vars: no aplicamos gate.
  if (!password || !secret) return nextWithRequestId(req, requestId);

  const token = req.cookies.get("ss_beta")?.value || "";
  const ok = token ? await validateBetaToken(secret, token) : false;

  if (ok) return nextWithRequestId(req, requestId);

  if (pathname.startsWith("/api/")) {
    return unauthorizedApi(requestId);
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
