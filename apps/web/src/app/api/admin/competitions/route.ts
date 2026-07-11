import { requireAdmin } from "@/lib/admin";
import { getCompetitionSettings, setCompetitionEnabled } from "@/lib/competitions/settings";
import { updateCompetitionSettingSchema } from "@the-syndicate/shared";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const competitions = await getCompetitionSettings();
  return NextResponse.json({ competitions });
}

export async function PATCH(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = updateCompetitionSettingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await setCompetitionEnabled(parsed.data.competitionId, parsed.data.enabled);
  if (!updated) {
    return NextResponse.json({ error: "Unknown competition" }, { status: 404 });
  }

  return NextResponse.json({ competition: updated });
}
