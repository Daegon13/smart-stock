import { NextResponse } from "next/server";
import { getRequestId, logApiEvent } from "@/lib/observability";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = getRequestId(req);

  logApiEvent({
    requestId,
    route: "/api/health",
    method: "GET",
    message: "health check"
  });

  return NextResponse.json(
    {
      ok: true,
      version: process.env.APP_VERSION || "dev",
      time: new Date().toISOString()
    },
    {
      headers: {
        "x-request-id": requestId
      }
    }
  );
}
