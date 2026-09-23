import { requireSession } from "@/lib/api-auth";
import { lockSoloRound } from "@/lib/rounds/lock-solo-round";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

/** Lock a solo acca on demand — guards live in `lockSoloRound`. */
export async function POST(_request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const result = await lockSoloRound(id, session!.user!.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ locked: true });
}
