import { requireSession } from "@/lib/api-auth";
import {
  createAdditionalRound,
  RoundCreationError,
} from "@/lib/rounds/create-additional-round";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  try {
    const round = await createAdditionalRound(id, session!.user!.id);
    return NextResponse.json({ round }, { status: 201 });
  } catch (error) {
    if (error instanceof RoundCreationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[rounds] create additional round failed", id, error);
    return NextResponse.json({ error: "Failed to create bet" }, { status: 500 });
  }
}
