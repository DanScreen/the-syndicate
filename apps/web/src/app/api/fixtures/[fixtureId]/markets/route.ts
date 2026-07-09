import { getFixtureMarkets } from "@/lib/odds/provider";
import { requireSession } from "@/lib/api-auth";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ fixtureId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { fixtureId } = await params;
  const markets = await getFixtureMarkets(fixtureId);

  if (markets.length === 0) {
    return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
  }

  return NextResponse.json({ markets });
}
