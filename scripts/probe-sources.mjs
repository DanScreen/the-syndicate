#!/usr/bin/env node
/**
 * Phase 0 provider probe for docs/specs/odds-and-results-sourcing.md.
 *
 * Read-only checks against the odds and results providers, using keys from
 * the environment or apps/web/.env.local (then apps/web/.env). Prints a plain
 * text report that is safe to paste into an issue or chat: keys are never
 * printed, and any that appear in an error body are redacted.
 *
 *   node scripts/probe-sources.mjs
 *   node scripts/probe-sources.mjs --sport soccer_epl --events 3
 *   node scripts/probe-sources.mjs --scores soccer_epl,soccer_uefa_nations_league
 *
 * Keys (each optional; a provider without a key is skipped):
 *   ODDS_API_KEY           The Odds API. About 20 credits per run at the defaults
 *                          (the sports list is free; scores cost 2 per sport key;
 *                          event odds cost 1 per market returned).
 *   FOOTBALL_DATA_API_KEY  football-data.org. 1 request.
 *   API_FOOTBALL_KEY       API-Football (api-sports.io). 4 requests. The free
 *                          plan can't read current-season odds; the report
 *                          says so rather than failing.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const ODDS_API_BASE = "https://api.the-odds-api.com/v4";
const FOOTBALL_DATA_BASE = "https://api.football-data.org/v4";
const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

const REQUEST_TIMEOUT_MS = 20_000;

/** Scores are checked for these sport keys (when active) plus any active Nations League key. */
const DEFAULT_SCORE_SPORTS = [
  "soccer_epl",
  "soccer_efl_champ",
  "soccer_england_league2",
  "soccer_uefa_europa_league",
];

/** First active key in this list supplies the sample fixtures for the market check. */
const SAMPLE_SPORT_PREFERENCE = [
  "soccer_efl_champ",
  "soccer_england_league1",
  "soccer_england_league2",
  "soccer_epl",
  "soccer_uefa_europa_league",
];

/** One request per market, so an unsupported market can't fail the others. */
const PROBE_MARKETS = [
  "h2h",
  "btts",
  "alternate_totals_corners",
  "alternate_totals_cards",
  "player_goal_scorer_anytime",
];

/** Names of UKGC-licensed brands, for flagging API-Football bookmakers. Betfair may be the exchange. */
const UK_BOOKMAKER_PATTERN =
  /bet365|william\s*hill|betfred|ladbrokes|coral|paddy\s*power|sky\s*bet|betway|888|unibet|betvictor|boyle|betfair|virgin|livescore|spreadex|kwiff|midnite|betmgm|grosvenor|leovegas|32red|casumo|betuk|quinn|star\s*sports|fitzdares/i;

/** Competitions from spec §3.7 plus the manual-settlement ones, matched by API-Football country + name. */
const LEAGUES_OF_INTEREST = [
  { label: "Premier League", country: /^England$/, name: /^Premier League$/ },
  { label: "Championship", country: /^England$/, name: /^Championship$/ },
  { label: "League One", country: /^England$/, name: /^League One$/ },
  { label: "League Two", country: /^England$/, name: /^League Two$/ },
  { label: "FA Cup", country: /^England$/, name: /^FA Cup$/ },
  { label: "Carabao Cup", country: /^England$/, name: /^League Cup$/ },
  { label: "National League", country: /^England$/, name: /^National League$/ },
  { label: "Women's Super League", country: /^England$/, name: /WSL|Women.?s Super League/ },
  { label: "Scottish Premiership", country: /^Scotland$/, name: /^Premiership$/ },
  { label: "Scottish Championship", country: /^Scotland$/, name: /^Championship$/ },
  { label: "League of Ireland", country: /^Ireland$/, name: /^Premier Division$/ },
  { label: "Champions League", country: /^World$/, name: /^UEFA Champions League$/ },
  { label: "Europa League", country: /^World$/, name: /^UEFA Europa League$/ },
  { label: "Conference League", country: /^World$/, name: /Conference League/ },
  { label: "Nations League", country: /^World$/, name: /^UEFA Nations League$/ },
  { label: "Euro qualifiers", country: /^World$/, name: /Euro.*Qualification/ },
  { label: "International friendlies", country: /^World$/, name: /^Friendlies$/ },
  { label: "Club friendlies", country: /^World$/, name: /^Friendlies Clubs$/ },
  { label: "MLS", country: /^USA$/, name: /^Major League Soccer$/ },
];

const HELP = `Usage: node scripts/probe-sources.mjs [--sport <odds-api-key>] [--events <n>] [--scores <k1,k2>]

  --sport   The Odds API sport key for the market/bookmaker sample (default: first active of
            ${SAMPLE_SPORT_PREFERENCE.join(", ")})
  --events  How many upcoming fixtures to sample (default 2; each costs up to ${PROBE_MARKETS.length} credits)
  --scores  Comma-separated sport keys for the scores check (default: ${DEFAULT_SCORE_SPORTS.join(", ")}
            plus any active Nations League key)

Keys come from the environment or apps/web/.env.local: ODDS_API_KEY, FOOTBALL_DATA_API_KEY,
API_FOOTBALL_KEY. Output never contains keys.`;

export function parseEnvFile(text) {
  const vars = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    const quoted =
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")));
    value = quoted ? value.slice(1, -1) : value.replace(/\s+#.*$/, "");
    vars[match[1]] = value;
  }
  return vars;
}

/** Environment wins over apps/web/.env.local, which wins over apps/web/.env. */
export function loadKeys(env = process.env, baseDir = root) {
  const fileVars = {};
  for (const name of [".env.local", ".env"]) {
    const path = join(baseDir, "apps/web", name);
    if (!existsSync(path)) continue;
    for (const [key, value] of Object.entries(parseEnvFile(readFileSync(path, "utf8")))) {
      if (!(key in fileVars)) fileVars[key] = value;
    }
  }
  const pick = (name) => env[name]?.trim() || fileVars[name]?.trim() || "";
  return {
    ODDS_API_KEY: pick("ODDS_API_KEY"),
    FOOTBALL_DATA_API_KEY: pick("FOOTBALL_DATA_API_KEY"),
    API_FOOTBALL_KEY: pick("API_FOOTBALL_KEY"),
  };
}

export function parseArgs(argv) {
  const args = { sport: null, events: 2, scores: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--sport") args.sport = argv[++i] ?? null;
    else if (arg === "--events") args.events = Number(argv[++i]);
    else if (arg === "--scores") {
      args.scores = (argv[++i] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    } else if (arg === "--help" || arg === "-h") args.help = true;
  }
  if (!Number.isInteger(args.events) || args.events < 0) args.events = 2;
  return args;
}

export function redact(text, secrets) {
  let out = text;
  for (const secret of secrets) {
    if (secret && secret.length >= 6) out = out.split(secret).join("***");
  }
  return out;
}

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, headers: res.headers, body, text };
}

function errorText(result) {
  const message = result.body?.message ?? result.body?.error ?? result.text ?? "";
  return String(message).replace(/\s+/g, " ").slice(0, 200);
}

function scoreFor(event, team) {
  return event.scores?.find((s) => s.name === team)?.score ?? "?";
}

export async function probeOddsApi(key, args, out) {
  let quota = null;
  const call = async (path, params = {}) => {
    const url = new URL(ODDS_API_BASE + path);
    url.searchParams.set("apiKey", key);
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, String(value));
    const result = await getJson(url.toString());
    const used = result.headers.get("x-requests-used");
    const remaining = result.headers.get("x-requests-remaining");
    if (used !== null || remaining !== null) quota = { used, remaining };
    return result;
  };

  const sports = await call("/sports", { all: "true" });
  if (!sports.ok || !Array.isArray(sports.body)) {
    out.push(`  sports list failed: HTTP ${sports.status} ${errorText(sports)}`);
    return;
  }
  const soccer = sports.body
    .filter((s) => s.group === "Soccer" || String(s.key).startsWith("soccer_"))
    .sort((a, b) => String(a.key).localeCompare(String(b.key)));
  const activeKeys = new Set(soccer.filter((s) => s.active).map((s) => s.key));
  out.push(`Soccer sport keys: ${soccer.length} (${activeKeys.size} active now; ● active, ○ inactive)`);
  for (const s of soccer) {
    out.push(`  ${s.active ? "●" : "○"} ${String(s.key).padEnd(50)} ${s.title}${s.has_outrights ? " [outrights]" : ""}`);
  }

  out.push("", "Scores (last 3 days, 2 credits per key):");
  const nationsLeague = soccer
    .filter((s) => s.active && /nations league/i.test(String(s.title)))
    .map((s) => s.key);
  const scoreSports = [...new Set(args.scores ?? [...DEFAULT_SCORE_SPORTS, ...nationsLeague])];
  for (const sport of scoreSports) {
    if (!activeKeys.has(sport)) {
      out.push(`  ${sport}: not active (skipped, no credits used)`);
      continue;
    }
    const result = await call(`/sports/${sport}/scores`, { daysFrom: 3 });
    if (!result.ok || !Array.isArray(result.body)) {
      out.push(`  ${sport}: HTTP ${result.status} ${errorText(result)}`);
      continue;
    }
    const completed = result.body.filter((e) => e.completed);
    out.push(`  ${sport}: ${result.body.length} events listed, ${completed.length} completed`);
    for (const e of completed.slice(0, 3)) {
      out.push(
        `    ${e.home_team} ${scoreFor(e, e.home_team)}-${scoreFor(e, e.away_team)} ${e.away_team} (kickoff ${e.commence_time}, updated ${e.last_update ?? "?"})`
      );
    }
  }

  const sampleSport =
    args.sport ?? SAMPLE_SPORT_PREFERENCE.find((k) => activeKeys.has(k)) ?? [...activeKeys][0];
  out.push("", `UK bookmakers per market (region uk) for ${sampleSport ?? "(no active soccer key)"}:`);
  if (!sampleSport || args.events === 0) {
    out.push("  skipped");
  } else {
    const events = await call(`/sports/${sampleSport}/events`);
    const upcoming = (Array.isArray(events.body) ? events.body : [])
      .filter((e) => new Date(e.commence_time).getTime() > Date.now())
      .sort((a, b) => new Date(a.commence_time) - new Date(b.commence_time))
      .slice(0, args.events);
    if (!events.ok) out.push(`  events failed: HTTP ${events.status} ${errorText(events)}`);
    else if (upcoming.length === 0) out.push("  no upcoming fixtures; try --sport with another active key");
    for (const event of upcoming) {
      out.push(`  ${event.home_team} v ${event.away_team} (${event.commence_time})`);
      for (const market of PROBE_MARKETS) {
        const result = await call(`/sports/${sampleSport}/events/${event.id}/odds`, {
          regions: "uk",
          markets: market,
          oddsFormat: "decimal",
        });
        if (!result.ok) {
          out.push(`    ${market.padEnd(28)} HTTP ${result.status} ${errorText(result)}`);
          continue;
        }
        const books = (result.body?.bookmakers ?? [])
          .filter((b) => (b.markets ?? []).some((m) => m.key === market))
          .map((b) => b.key);
        out.push(`    ${market.padEnd(28)} ${books.length} books${books.length ? `: ${books.join(", ")}` : ""}`);
      }
    }
  }

  if (quota) out.push("", `Credits after this run: used ${quota.used ?? "?"}, remaining ${quota.remaining ?? "?"}`);
}

export async function probeFootballData(key, out) {
  const result = await getJson(`${FOOTBALL_DATA_BASE}/competitions`, { "X-Auth-Token": key });
  if (!result.ok) {
    out.push(`  competitions failed: HTTP ${result.status} ${errorText(result)}`);
    return;
  }
  const competitions = result.body?.competitions ?? [];
  const byPlan = new Map();
  for (const c of competitions) {
    const plan = c.plan ?? "UNKNOWN";
    byPlan.set(plan, [...(byPlan.get(plan) ?? []), c]);
  }
  out.push(`Competitions listed: ${competitions.length}`);
  for (const [plan, list] of [...byPlan.entries()].sort()) {
    out.push(`  ${plan} (${list.length}): ${list.map((c) => `${c.code ?? "?"} ${c.name}`).join(", ")}`);
  }
}

function apiFootballErrors(body) {
  const errors = body?.errors;
  if (!errors) return "";
  if (Array.isArray(errors)) return errors.join("; ");
  if (typeof errors === "object") {
    return Object.entries(errors)
      .map(([name, value]) => `${name}: ${value}`)
      .join("; ");
  }
  return String(errors);
}

function currentSeason(league) {
  const seasons = league?.seasons ?? [];
  return seasons.find((s) => s.current) ?? seasons[seasons.length - 1] ?? null;
}

function yesNo(value) {
  return value === true ? "yes" : value === false ? "no" : "?";
}

export async function probeApiFootball(key, out) {
  const call = (path) => getJson(API_FOOTBALL_BASE + path, { "x-apisports-key": key });

  const status = await call("/status");
  const statusError = apiFootballErrors(status.body);
  if (!status.ok || statusError) {
    out.push(`  status failed: HTTP ${status.status} ${statusError || errorText(status)}`);
    return;
  }
  const account = status.body?.response ?? {};
  out.push(
    `Plan: ${account.subscription?.plan ?? "?"} (active: ${account.subscription?.active ?? "?"}), requests today ${account.requests?.current ?? "?"}/${account.requests?.limit_day ?? "?"}`
  );

  const bookmakers = await call("/odds/bookmakers");
  const books = bookmakers.body?.response ?? [];
  const ukBooks = books.filter((b) => UK_BOOKMAKER_PATTERN.test(String(b.name)));
  out.push(
    "",
    `Bookmakers: ${books.length} in total`,
    `  UK brands: ${ukBooks.map((b) => `${b.name} (#${b.id})`).join(", ") || "none"}`,
    `  Others: ${books.filter((b) => !ukBooks.includes(b)).map((b) => b.name).join(", ") || "none"}`
  );
  const bookmakersError = apiFootballErrors(bookmakers.body);
  if (bookmakersError) out.push(`  (error: ${bookmakersError})`);

  const leaguesResult = await call("/leagues?current=true");
  const leagues = leaguesResult.body?.response ?? [];
  const withOdds = leagues.filter((l) => currentSeason(l)?.coverage?.odds === true);
  out.push("", `Competitions with a current season: ${leagues.length} (odds coverage on ${withOdds.length})`);
  const leaguesError = apiFootballErrors(leaguesResult.body);
  if (leaguesError) out.push(`  (error: ${leaguesError})`);
  for (const probe of LEAGUES_OF_INTEREST) {
    const hits = leagues.filter(
      (l) => probe.country.test(l.country?.name ?? "") && probe.name.test(l.league?.name ?? "")
    );
    if (hits.length === 0) {
      out.push(`  ${probe.label.padEnd(26)} not found`);
      continue;
    }
    for (const league of hits) {
      const season = currentSeason(league);
      const coverage = season?.coverage ?? {};
      out.push(
        `  ${probe.label.padEnd(26)} #${league.league.id} ${league.league.name} (season ${season?.year ?? "?"}): events ${yesNo(coverage.fixtures?.events)}, stats ${yesNo(coverage.fixtures?.statistics_fixtures)}, lineups ${yesNo(coverage.fixtures?.lineups)}, odds ${yesNo(coverage.odds)}`
      );
    }
  }

  const premierLeague = leagues.find((l) => l.league?.id === 39);
  const seasonYear = currentSeason(premierLeague)?.year;
  out.push("", "Premier League odds sample (page 1):");
  if (!seasonYear) {
    out.push("  skipped: Premier League season not found");
    return;
  }
  const odds = await call(`/odds?league=39&season=${seasonYear}&page=1`);
  const oddsError = apiFootballErrors(odds.body);
  if (oddsError) {
    out.push(`  ${oddsError}`);
    return;
  }
  const fixtures = odds.body?.response ?? [];
  out.push(`  ${fixtures.length} fixtures on this page (${odds.body?.paging?.total ?? "?"} pages in total)`);
  const betTypesByBook = new Map();
  for (const fixture of fixtures) {
    for (const book of fixture.bookmakers ?? []) {
      const count = (book.bets ?? []).length;
      betTypesByBook.set(book.name, Math.max(betTypesByBook.get(book.name) ?? 0, count));
    }
  }
  const ranked = [...betTypesByBook.entries()].sort((a, b) => b[1] - a[1]);
  for (const [name, count] of ranked) {
    out.push(`    ${UK_BOOKMAKER_PATTERN.test(name) ? "UK " : "   "}${String(name).padEnd(20)} up to ${count} bet types per fixture`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }
  const keys = loadKeys();
  const report = [`# Provider probe, ${new Date().toISOString()}`];

  const section = async (title, key, run) => {
    report.push("", `## ${title}`);
    if (!key) {
      report.push("  skipped: no key set");
      return;
    }
    try {
      await run(key);
    } catch (err) {
      report.push(`  failed: ${err?.cause?.code ?? err?.name ?? "Error"}: ${err?.message ?? err}`);
    }
  };

  await section("The Odds API", keys.ODDS_API_KEY, (k) => probeOddsApi(k, args, report));
  await section("football-data.org", keys.FOOTBALL_DATA_API_KEY, (k) => probeFootballData(k, report));
  await section("API-Football", keys.API_FOOTBALL_KEY, (k) => probeApiFootball(k, report));

  console.log(redact(report.join("\n"), Object.values(keys)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
