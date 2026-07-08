import { getMockFixtures } from "@/lib/odds/provider";
import { requireSession } from "@/lib/api-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  return NextResponse.json({ fixtures: getMockFixtures() });
}
