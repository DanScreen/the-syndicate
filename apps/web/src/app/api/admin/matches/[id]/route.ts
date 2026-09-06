import { requireAdmin } from "@/lib/admin";
import { overrideMatchScore } from "@/lib/results/override-match-score";
import { adminOverrideMatchScoreSchema } from "@tiki-acca/shared";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

/** Platform-admin match score override — locks the row and re-resolves legs. */
export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: matchId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = adminOverrideMatchScoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await overrideMatchScore(matchId, parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Override failed";
    const status = message.includes("Record to update not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
