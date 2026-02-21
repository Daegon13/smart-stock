import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateBetaToken } from "@/lib/betaAuth";

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

export async function middleware(req: NextRequest) {
  const password = process.env.BETA_PASSWORD;
  const secret = process.env.BETA_SECRET;

  // Si no está configurado, no aplicamos gate (modo demo/dev).
  if (!password || !secret) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const token = req.cookies.get("ss_beta")?.value || "";
  const ok = token ? await validateBetaToken(secret, token) : false;

  if (ok) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  // guardamos destino para volver después
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // todo menos assets internos
    "/((?!_next/static|_next/image|favicon.ico).*)"
  ]
};
