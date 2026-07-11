import { requireAdmin } from "@/lib/admin";
import { runOddsDiagnostics } from "@/lib/odds/diagnostics";
import { DEFAULT_COMPETITION_ID, isValidCompetitionId } from "@the-syndicate/shared";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const competition = url.searchParams.get("competition") ?? DEFAULT_COMPETITION_ID;
  const fresh = url.searchParams.get("fresh") !== "false";

  if (!isValidCompetitionId(competition)) {
    return NextResponse.json({ error: "Unknown competition" }, { status: 400 });
  }

  const diagnostics = await runOddsDiagnostics(competition, { fresh });
  return NextResponse.json({ diagnostics });
}
