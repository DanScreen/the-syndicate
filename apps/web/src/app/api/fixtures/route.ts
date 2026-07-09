import { getFixtures } from "@/lib/odds/provider";
import { requireSession } from "@/lib/api-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const { fixtures, source } = await getFixtures();
  return NextResponse.json({ fixtures, source });
}
