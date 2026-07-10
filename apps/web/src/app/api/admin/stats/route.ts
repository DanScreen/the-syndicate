import { requireAdmin } from "@/lib/admin";
import { computeAdminStats } from "@/lib/admin/compute-admin-stats";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const stats = await computeAdminStats();
  return NextResponse.json(stats);
}
