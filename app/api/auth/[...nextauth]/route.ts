import { NextResponse } from "next/server";

// Placeholder de compatibilidad para migración gradual hacia Auth.js.
// El flujo principal actual usa sesiones en DB propias (ss_session).
export async function GET() {
  return NextResponse.json({ ok: false, error: "Auth.js adapter no disponible en este entorno" }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ ok: false, error: "Auth.js adapter no disponible en este entorno" }, { status: 501 });
}
