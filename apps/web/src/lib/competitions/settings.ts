import { prisma } from "@tiki-acca/database";
import {
  COMPETITIONS,
  competitionNeedsManualSettlement,
  DEFAULT_ENABLED_COMPETITION_IDS,
  type Competition,
} from "@tiki-acca/shared";

export type CompetitionSettingView = {
  id: string;
  name: string;
  enabled: boolean;
  oddsApiSport: string;
  footballDataCode: string;
  manualSettlement: boolean;
};

async function ensureSettingsRows() {
  const existing = await prisma.competitionSetting.findMany({
    select: { competitionId: true },
  });
  const have = new Set(existing.map((row) => row.competitionId));
  const missing = COMPETITIONS.filter((c) => !have.has(c.id));

  if (missing.length === 0) return;

  await prisma.competitionSetting.createMany({
    data: missing.map((competition) => ({
      competitionId: competition.id,
      enabled: DEFAULT_ENABLED_COMPETITION_IDS.includes(
        competition.id as (typeof DEFAULT_ENABLED_COMPETITION_IDS)[number]
      ),
    })),
  });
}

export async function getCompetitionSettings(): Promise<CompetitionSettingView[]> {
  await ensureSettingsRows();

  const rows = await prisma.competitionSetting.findMany({
    orderBy: { competitionId: "asc" },
  });
  const byId = new Map(rows.map((row) => [row.competitionId, row.enabled]));

  return COMPETITIONS.map((competition) => ({
    id: competition.id,
    name: competition.name,
    enabled: byId.get(competition.id) ?? false,
    oddsApiSport: competition.oddsApiSport,
    footballDataCode: competition.footballDataCode,
    manualSettlement: competitionNeedsManualSettlement(competition),
  }));
}

export async function getEnabledCompetitions(): Promise<Competition[]> {
  const settings = await getCompetitionSettings();
  const enabledIds = new Set(settings.filter((s) => s.enabled).map((s) => s.id));
  return COMPETITIONS.filter((c) => enabledIds.has(c.id));
}

export async function isCompetitionEnabled(competitionId: string): Promise<boolean> {
  const settings = await getCompetitionSettings();
  return settings.find((s) => s.id === competitionId)?.enabled ?? false;
}

export async function setCompetitionEnabled(
  competitionId: string,
  enabled: boolean
): Promise<CompetitionSettingView | null> {
  const competition = COMPETITIONS.find((c) => c.id === competitionId);
  if (!competition) return null;

  await ensureSettingsRows();

  await prisma.competitionSetting.update({
    where: { competitionId },
    data: { enabled },
  });

  const settings = await getCompetitionSettings();
  return settings.find((s) => s.id === competitionId) ?? null;
}
