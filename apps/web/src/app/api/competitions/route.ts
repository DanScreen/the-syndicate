import { requireSession } from "@/lib/api-auth";
import { serialized } from "@/lib/api-response";
import type { CompetitionsResponse } from "@tiki-acca/shared";
import { getEnabledCompetitions } from "@/lib/competitions/settings";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const competitions = await getEnabledCompetitions();

  return NextResponse.json(
    serialized({
      competitions: competitions.map(({ id, name }) => ({ id, name })),
    }) satisfies CompetitionsResponse
  );
}
