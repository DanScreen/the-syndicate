import { requireSession } from "@/lib/api-auth";
import { getEnabledCompetitions } from "@/lib/competitions/settings";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const competitions = await getEnabledCompetitions();

  return NextResponse.json({
    competitions: competitions.map(({ id, name }) => ({ id, name })),
  });
}
