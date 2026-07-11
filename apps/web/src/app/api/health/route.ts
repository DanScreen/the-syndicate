import { prisma } from "@the-syndicate/database";
import { isOddsApiConfigured } from "@/lib/odds/config";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      database: "connected",
      odds: isOddsApiConfigured() ? "configured" : "missing",
    });
  } catch {
    return NextResponse.json(
      { status: "error", database: "disconnected" },
      { status: 503 }
    );
  }
}
