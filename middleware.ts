import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateBetaToken } from "@/lib/betaAuth";

const PUBLIC_PATHS = new Set<string>(["/", "/login", "/api/health"]);

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
  if (isPublicPath(pathname)) return nextWithRequestId(req, requestId);

  // Producción: fail-closed para no dejar el panel abierto por error de configuración.
  if (process.env.NODE_ENV === "production" && (!password || !secret)) {
    return blockedByBetaMisconfig(req, requestId);
  }

  // Dev/demo sin vars: no aplicamos gate.
  if (!password || !secret) return nextWithRequestId(req, requestId);

  const token = req.cookies.get("ss_beta")?.value || "";
  const ok = token ? await validateBetaToken(secret, token) : false;

  if (ok) return nextWithRequestId(req, requestId);

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
