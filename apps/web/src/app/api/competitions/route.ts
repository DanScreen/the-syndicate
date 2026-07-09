import { requireSession } from "@/lib/api-auth";
import { COMPETITIONS } from "@the-syndicate/shared";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  return NextResponse.json({
    competitions: COMPETITIONS.map(({ id, name }) => ({ id, name })),
  });
}
