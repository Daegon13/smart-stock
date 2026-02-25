import { NextResponse } from "next/server";
import { destroyDbSession } from "@/lib/auth";

export async function POST() {
  await destroyDbSession();
  return NextResponse.redirect(new URL('/signin', process.env.NEXTAUTH_URL || 'http://localhost:3000'));
}
