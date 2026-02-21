import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();

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
