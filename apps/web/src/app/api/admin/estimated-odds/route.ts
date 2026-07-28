import { requireAdmin } from "@/lib/admin";
import { estimatedOddsEnabled } from "@/lib/odds/config";
import {
  getEstimatedOddsAdminToggle,
  setEstimatedOddsAdminToggle,
} from "@/lib/odds/estimated-odds-runtime";
import { updateEstimatedOddsSettingSchema } from "@tiki-acca/shared";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const envEnabled = estimatedOddsEnabled();
  const adminEnabled = await getEstimatedOddsAdminToggle();

  return NextResponse.json({
    envEnabled,
    adminEnabled,
    effectivelyEnabled: envEnabled && adminEnabled,
  });
}

export async function PATCH(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = updateEstimatedOddsSettingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const adminEnabled = await setEstimatedOddsAdminToggle(parsed.data.enabled);
  const envEnabled = estimatedOddsEnabled();

  return NextResponse.json({
    envEnabled,
    adminEnabled,
    effectivelyEnabled: envEnabled && adminEnabled,
  });
}
