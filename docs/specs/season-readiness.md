# Spec: Season readiness (World Cup → 2026–27 club season)

| Field | Value |
|-------|-------|
| **Status** | Backlog — mostly ops (leagues can be enabled via `/admin/competitions` when ready; deprioritised July 2026 in favour of group chat) |
| **Depends on** | Competitions catalogue (full configured-provider overlap available, disabled by default), admin competition toggles, odds warm cron |
| **As-built reference** | [../CURRENT_STATE.md](../CURRENT_STATE.md) — Odds & competitions |

---

## Problem

The **World Cup is the only competition enabled by default** (`CompetitionSetting` seed). When the tournament ends in mid-July 2026, the leg picker goes empty for every group: new users bounce, existing groups stall, and always-open rounds sit with nothing to pick. The 2026–27 club season starts mid-August (Championship/EFL earlier), leaving a **3–4 week dead zone** unless we act.

## Goals

1. **No empty leg picker** — there is always at least one enabled competition with upcoming fixtures.
2. **Smooth handover** — leagues enabled before the World Cup final; World Cup disabled after settlement of the last rounds.
3. **Cup competitions shipped** — FA Cup + EFL Cup fill midweek and league gaps (existing backlog item, folded in here).
4. **Honest quiet-period UX** — if a gap is unavoidable, the picker explains it and shows when fixtures return.

**Non-goals:** new sports, in-play, internationals beyond the current catalogue (Euros/Nations League can follow the same pattern later).

---

## Workstream A — competition transition (ops + small code)

- [ ] Verify The Odds API sport keys + football-data.org competition IDs resolve for the 2026–27 season (EPL, Championship, La Liga, Ligue 1, Serie A, Bundesliga) — season rollover sometimes changes fixture availability windows.
- [ ] Enable Championship (kicks off early August) and remaining leagues via `/admin/competitions` as fixtures appear in the bookmaker feed.
- [ ] Disable World Cup once the final settles and all groups' World Cup rounds are resolved (competitions with pending legs keep syncing after they are disabled, so late settlement remains safe).
- [ ] Confirm odds warm cron budget with multiple competitions re-enabled — see [DEPLOYMENT.md](../DEPLOYMENT.md#the-odds-api--calls-credits--cron); `3 × competitions + 5 × N` per run.

The Admin catalogue also includes Eredivisie, Primeira Liga, Brazil Série A, Champions League, European Championship, and Copa Libertadores. These entries were added disabled and can be staged independently. Match sync only requests enabled competitions plus competitions with pending legs.

## Workstream B — FA Cup + EFL Cup (code)

- [ ] Add `fa_cup` and `efl_cup` to `packages/shared/src/competitions.ts` (Odds API sport keys: `soccer_fa_cup`, `soccer_england_efl_cup`; football-data.org: FA Cup `FAC` — **check EFL Cup availability on free tier**; if unsynced, legs resolve via admin settlement queue only → consider deferring EFL Cup).
- [ ] Seed `CompetitionSetting` rows (disabled by default; admin enables when rounds are scheduled).
- [ ] Verify team-name matching between Odds API and football-data.org for lower-league cup entrants (`lib/results/football-data.ts` matching).

## Workstream B2 — UEFA summer qualifiers (shipped, manual settlement)

Champions League Qualification and Europa League play through the July–August gap, so both were added to `packages/shared/src/competitions.ts` (Odds API keys: `soccer_uefa_champs_league_qualification`, `soccer_uefa_europa_league`). **Neither is on our football-data.org tier** (Europa League + the qualifier competitions require the paid Standard plan, ~€49/mo), so both are flagged `manualSettlement: true` with an empty `footballDataCode`.

Behaviour:
- Odds/leg picker work normally once enabled; match sync **skips** manual-settlement competitions (`getCompetitionsToSync` in `lib/results/sync-matches.ts`) so no doomed football-data call fires.
- Legs stay `pending` until an admin settles them by hand in the settlement queue.
- `/admin/competitions` shows a **Manual settlement** badge + banner for these rows.

- [x] Add both competitions (disabled by default) with the `manualSettlement` flag + `competitionNeedsManualSettlement()` helper.
- [ ] Enable via `/admin/competitions` when qualifier rounds are scheduled; **verify the Odds API keys resolve** against a live pull first (stage rollovers shift availability).
- [ ] Operator note: settle CL-qual / Europa League legs manually each qualifier round — there is no auto-sync on the current tier.
- [ ] Optional: revisit the football-data.org Standard plan (~€49/mo) if manual settlement becomes a burden; it would also cover Conference League. See odds/settlement provider notes.

## Workstream C — quiet-period UX (code)

- [ ] Leg picker empty state: replace bare "no fixtures" with copy + the next known kickoff across enabled competitions (from `Match` table / odds snapshots), e.g. *"Pre-season break — the 2026–27 season kicks off {date}."*
- [ ] Dashboard: same messaging on the Round tab when the picker is empty.
- [ ] Optional: admin-configurable banner text (defer unless needed).

---

## Recurring checklist (every season)

Add to operator docs: each May/June, review competition end dates, plan the summer gap (tournament years vs. fallow years), and pre-verify next season's API IDs. Fallow summers (2027) have **no default competition** from late May to August — revisit whether to add summer competitions (MLS, international friendlies) before then. Summer bridges available now: **Brazil Série A** (free-tier auto-settle) and the **UEFA qualifiers** (CL Qualification + Europa League, manual settlement — see Workstream B2). If UEFA qualifiers are enabled, confirm someone owns manual settlement for those rounds.

---

## Open questions

| Question | Recommendation |
|----------|----------------|
| Enable all five leagues at once or stagger? | Stagger — Championship + EPL first; add continental leagues when their seasons start (credits + picker noise) |
| EFL Cup without free-tier results sync? | Defer EFL Cup unless football-data.org covers it; FA Cup first |
| Summer 2027 fallow gap | Out of scope; note in ROADMAP when 2026–27 season ships |

## Related docs

[competitions-and-results.md](./competitions-and-results.md) · [ROADMAP.md](../ROADMAP.md) · [DEPLOYMENT.md](../DEPLOYMENT.md)
