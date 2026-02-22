import { NextResponse } from "next/server";

const buckets = new Map<string, { count: number; resetAt: number }>();

type LimitArgs = {
  req: Request;
  route: string;
  maxRequests: number;
  windowMs: number;
  requestId?: string;
};

function isRateLimitEnabled() {
  return process.env.RATE_LIMIT_ENABLED !== "false";
}

function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const first = forwarded.split(",")[0]?.trim();
  if (first) return first;
  return req.headers.get("x-real-ip") || "unknown";
}

export function enforceRateLimit(args: LimitArgs) {
  if (!isRateLimitEnabled()) return { ok: true as const };

  const now = Date.now();
  const ip = getClientIp(args.req);
  const key = `${args.route}:${ip}`;
  const requestId = args.requestId || args.req.headers.get("x-request-id") || crypto.randomUUID();

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + args.windowMs });
    return { ok: true as const };
  }

  if (current.count >= args.maxRequests) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Demasiadas solicitudes. Intentá nuevamente en unos segundos." },
        {
          status: 429,
          headers: { "retry-after": String(retryAfter), "x-request-id": requestId }
        }
      )
    };
  }

  current.count += 1;
  return { ok: true as const };
}
