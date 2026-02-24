import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateBetaToken } from "@/lib/betaAuth";
import { hasBetaGateConfig, isBetaGateMisconfiguredInProd } from "@/lib/betaGate";
import { isDevLoginBypassEnabled } from "@/lib/authFlags";

const APP_ROUTE_PREFIXES = [
  "/dashboard", "/today", "/import", "/stock", "/orders", "/products", "/suppliers", "/categories", "/movements", "/reconcile", "/aliases", "/assistant", "/copilot", "/pos", "/purchases", "/tickets", "/logout", "/settings", "/select-store"
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
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("x-request-id", requestId);
  return res;
}

function unauthorizedApi(requestId: string) {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: { "x-request-id": requestId, "cache-control": "no-store" } });
}

function redirectTo(urlPath: string, req: NextRequest, requestId: string) {
  const url = req.nextUrl.clone();
  url.pathname = urlPath;
  const res = NextResponse.redirect(url);
  res.headers.set("x-request-id", requestId);
  return res;
}

export async function middleware(req: NextRequest) {
  const requestId = getOrCreateRequestId(req);
  const { pathname } = req.nextUrl;

  if (!isProtectedPath(pathname)) return nextWithRequestId(req, requestId);

  const sessionToken = req.cookies.get("ss_session")?.value;
  const activeStore = req.cookies.get("ss_active_store")?.value;

  if (isDevLoginBypassEnabled()) {
    return nextWithRequestId(req, requestId);
  }

  if (sessionToken) {
    if (!activeStore && !pathname.startsWith("/select-store") && !pathname.startsWith("/api/auth")) {
      return redirectTo("/select-store", req, requestId);
    }
    return nextWithRequestId(req, requestId);
  }

  if (isBetaGateMisconfiguredInProd()) {
    return pathname.startsWith("/api/") ? unauthorizedApi(requestId) : redirectTo("/signin", req, requestId);
  }

  if (!hasBetaGateConfig()) {
    if (process.env.ALLOW_DEMO_NO_AUTH === "true" && process.env.NODE_ENV !== "production") {
      return nextWithRequestId(req, requestId);
    }
    return pathname.startsWith("/api/") ? unauthorizedApi(requestId) : redirectTo("/signin", req, requestId);
  }

  const token = req.cookies.get("ss_beta")?.value || "";
  const ok = token ? await validateBetaToken(process.env.BETA_SECRET ?? "", token) : false;
  if (ok) return nextWithRequestId(req, requestId);

  return pathname.startsWith("/api/") ? unauthorizedApi(requestId) : redirectTo("/login", req, requestId);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
