# Tiki Acca — AI video ad production brief

> **Concept:** "The Cage." Two acts on a floodlit 5-a-side pitch, watched from a
> neutral touchline. Every pass is a member submitting their leg to the Tiki Acca app.
> One group's acca dies on the last leg because someone got greedy; the other group's
> acca lands and their points go up. Produced entirely with generative AI video plus
> real app captures — no live-action shoot, no crew, no budget.

| Field | Value |
|-------|-------|
| **Status** | Draft brief — app captures built (§7); CAP Copy Advice before any footage spend (§9) |
| **Date** | September 2026 |
| **Deliverables** | 50s hero cut (16:9), 30s cutdown, 15s Act 1 only (9:16), 6s loop (1:1) |
| **Constraints** | Floodlight palette + Triangle rondo logo are **locked** ([BRAND.md](./BRAND.md)). Positioning and voice per [MARKETING_BRIEF.md](./MARKETING_BRIEF.md). |
| **Compliance** | UK gambling advertising rules apply to this ad — see [§9](#9-compliance-non-negotiable) before generating a single frame |
| **Budget** | £200–£450 all-in |

---

## 1. The core idea

The emotional engine of this product, straight from [MARKETING_BRIEF.md](./MARKETING_BRIEF.md),
is **shared accountability**: *"When it lands, everyone's a hero. When it dies, everyone
knows exactly whose leg killed it."* No bookmaker can sell that. This ad is ninety
percent about the second half of that sentence.

Two attacks. Two accas.

**Act 1 — the acca that dies.** Four red players. The first three submit sensible picks
and the football is gorgeous: one-touch passing, a nutmeg, a no-look flick. The fourth
gets greedy — the longest price on the slip by a distance — and, with a teammate
completely unmarked beside him, tries to smash it himself and skies it over the fence
into the dark. The other three turn and give him the full treatment: hands on heads, a
slow clap, one of them genuinely unable to stop laughing.

**Act 2 — the acca that lands.** Four blue players. Everyone delivers. The move is
clean, fast and inevitable, it ends in the net, and their points go up.

The gag in Act 1 is the reason anyone remembers the ad. Act 2 is the reason they
download it.

### The hook

The first five seconds have to explain the idea to someone scrolling with the sound
off. The name does the work:

> **VO:** *"Tiki-taka is football's great passing game: everyone touches the ball.
> In a group acca, everyone touches the bet."*

About seven seconds at a natural read, laid over the floodlights, the establisher, the
first touch and the first leg landing on the slip (§8) — so *"everyone touches the
bet"* lands on the first name appearing on the betslip. For sound-off viewing the
same idea runs as two supers, one per half:

1. **Tiki-taka: everyone touches the ball.**
2. **Tiki Acca: everyone touches the bet.**

### The spine: the shot *is* the bet

The first three red players play simple passes and take sensible prices. R4 has a
simple pass on — and goes for the worldie instead. That is precisely what taking the
longest price on the slip *is*, and it is why the teasing is justified. Keep the
unmarked teammate visible in frame when R4 shoots. Without him it's bad luck; with
him it's a crime.

**Point of view is neutral throughout.** The camera watches both teams from the
touchline and takes no side. Neither team is "the Tiki Acca team" — both groups are
users, the ad is a spectator at someone else's Tuesday night, and the audience is
free to recognise themselves in either one.

### The structural rule

**AI generates the football. The real app generates the app.**

| Source | Covers | How |
|--------|--------|-----|
| **AI video** | The cage, the players, the passes, the skied shot, the teasing, the goal | Veo / Kling / Runway (§5) |
| **Real app captures** | Every leg landing on the slip, the lock, the dead leg, the settled cards, the leaderboard | Seeded demo data, captured automatically (§7) |

Never generate the UI. [MARKETING_BRIEF.md](./MARKETING_BRIEF.md) already sets this rule —
*"the real UI is the best marketing asset; never illustrate what can be screenshotted."*
It also solves the unsolvable production problem: nobody plays 5-a-side holding a phone.
The **cut** carries the metaphor, so the phone never has to be on the pitch.

This structure has a second payoff here. The joke only works if the audience can *read
the price*, and a real betslip with a real name on the leg is both funnier and more
legible than anything a video model would invent.

**Every leg shows who picked it** — name and profile picture — so "one leg each" reads
at a glance and the payoff is unambiguous about whose leg died.

---

## 2. Setting — the floodlit cage (decided)

**A caged 5-a-side astro pitch at night, under floodlights.** Not a professional
stadium, and not a full grass pitch either. The cage is better on every axis:

1. **Brand fit.** "Mates first, not a tipster." A Tuesday-night cage booking is the
   actual ritual this product attaches to. A stadium reads broadcaster or bookmaker —
   the two things Tiki Acca explicitly is not.
2. **The joke lives here.** Tiki-taka is elite Barcelona football. Performed by eight
   mates in a council cage, and then ruined by one of them, is funny, warm and
   self-aware. In a stadium it's just football and the gag evaporates. A neutral
   touchline POV also only makes sense somewhere you could actually stand and watch —
   which is a cage, not a stadium.
3. **The skied shot needs a fence.** Ball over the cage, into the dark, gone. That beat
   is the punchline and the cage is what makes it read instantly.
4. **AI hit rate.** Crowds are where generative video fails hardest — repeating faces,
   melting hands, smeared stands. A cage has no crowd, a hard boundary that contains
   the frame, and a repeating mesh pattern that models handle well. Expect roughly
   double the usable-clip rate of a stadium prompt.
5. **The palette is already this.** Floodlight — navy `#091422`, sky `#38bdf8` — *is*
   cold metal-halide light on wet astro. The set dresses itself.

### Locked art direction

| Element | Spec |
|---------|------|
| Venue | Caged 5-a-side pitch, green astroturf with sand infill, chain-link or mesh fence ~4m high, small recessed goals |
| Time | Night, fully dark beyond the cage |
| Light | 4–6 floodlights mounted on the cage frame, cold blue-white (~5600K), hard top-down key, long shadows through the mesh |
| Weather | Just rained — wet astro with a sheen, standing water in the corners, breath visible, light mist in the beams |
| Background | Dark beyond the fence. A portakabin, a few parked cars, a distant treeline. **No stands. No crowd.** Maybe two people waiting for the next booking |
| Camera | Low, close, handheld-adjacent. 35mm and 50mm looks. Shallow depth. Shooting *through* the mesh for texture on the wider shots |
| Grade | Push navy in the shadows toward `#091422`; let floodlight spill sit near `#7dd3fc` |

---

## 3. Cast and characters

### Eight hero faces

Four red outfield, four blue outfield. Two keepers who are never seen in close-up —
shoot them from behind, at distance, or cropped at the shoulder, so they cost nothing
to build.

**The four red players get full character bibles** (they carry the comedy and all the
close-ups), while **the four blue players are built lighter** — they're seen in motion,
in mid-shot, and their sequence is fast. Blue faces need to be consistent, not
memorable.

Aim for a recognisable friend group: mixed build, mixed ethnicity, at least two women
across the eight (Nadia and Aisha below), a spread of ability that reads on screen.

**The character-bible headshots double as profile pictures.** The same face that
skies the shot is the face beside *Kev Doyle* on the betslip. Export one square
headshot per character into `tools/marketing/video-ad/avatars/` (§7).

### The cast

Names are in `tools/marketing/video-ad/scenario.json`; change them there and every
capture follows.

| # | Name | Character | Role |
|---|------|-----------|------|
| R1 | **Rob Hale** | **The organiser.** Calm, competent, set the round up | Receives first, one-touch pass. The safe banker |
| R2 | **Jay Mensah** | **The show-off.** Quick, technical, enjoys himself too much | The nutmeg. Celebrates his own pass |
| R3 | **Nadia Kaur** | **The quiet one.** Genuinely the best player, says nothing | The no-look flick. Doesn't react to it at all |
| R4 | **Kev Doyle** | **The liability.** Everyone has one. Enthusiastic, overconfident, allergic to the simple option | The greedy pick. Ignores the unmarked man, skies the shot. Gets the treatment |
| B1–B4 | **Tom Barker, Aisha Rahman, Callum Reid, Femi Adeyemi** | The other lot. Tidy, unshowy | The move that works |

**Kev is the most important character in the ad.** He is the reason the product
exists. Build him first and build him hardest: he needs to be instantly likeable,
visibly pleased with himself in the run-up, and completely deflated in the aftermath.
He's not the villain — he's the mate. The teasing has to land as affection, not
contempt.

### Ages

**27–30.** Prompt them as **"late twenties, clearly adult"** with explicit maturity
markers — stubble, laugh lines, a receding hairline, a beard with grey in it.
Generative models render faces younger than prompted, routinely by 4–6 years, and the
CAP Code bars anyone who **is or seems** under 25 (§9). Treat 27–30 as the target
*render*, which means prompting at the top of that range and rejecting hard. The same
rule applies to the profile pictures.

### Wardrobe

| Team | Kit | Notes |
|------|-----|-------|
| Red | **Deep claret-red** bibs over plain dark tops | Target ~`#7f1d1d`–`#991b1b` |
| Blue | **Pale powder blue** bibs over plain dark tops | Target ~`#93c5fd` |

Bibs, not kits — that's what 5-a-side actually looks like, it's cheaper to keep
consistent than a full strip, and it lets both teams wear the same base layer.
Mismatched shorts and boots. One player in a long-sleeve base layer. **No club badges,
no sponsor logos, no real kit designs.**

> **Brand note.** Red is a semantic colour in this product — `#f87171` means a lost
> leg. That now works *for* the ad rather than against it, since red is the team whose
> acca dies, but keep the bibs a **deep claret**, visibly darker and browner than the
> danger red, so the UI's own red stays unambiguous. **Sky blue stays the app's**,
> carried by the floodlights, the UI and the grade, so `#38bdf8` reads as Tiki Acca on
> screen even with powder blue on a team.
>
> **Neither team is badged as ours.** No rondo on a bib, no wordmark in the cage. The
> POV is a neutral spectator and both groups are users; the brand appears only on the
> phone screens and the end card.

---

## 4. The picks

The picks are the script. Every one is in `tools/marketing/video-ad/scenario.json`,
which drives the seed and the captures (§7), so the numbers below are exactly what
appears on screen.

### Markets

Only the six markets the product actually offers (`MARKET_TYPES` in
`packages/shared/src/constants.ts`) may appear on screen:

`match_winner` · `both_teams_score` · `over_under_15` · `over_under_25` ·
`over_under_35` · `double_chance`

There is **no clean-sheet market**, so Kev's pick is a `match_winner` longshot. The
other picks spread across the remaining markets, which shows the product's real range
without a word of copy.

### How the points work on screen

Two different scores appear, both computed by `packages/shared/src/scoring.ts`:

- **Team (group) points** — `groupAccaRoundPoints`: an acca that lands scores
  `combined odds − 1`; any lost leg scores `−1` for the group.
- **Player points** — `memberAccaLegPoints`: **each pick scores on its own result**,
  whatever happens to the acca. Won = `odds − 1`, lost = `−1`.

So when Kev kills the red acca, Rob, Jay and Nadia *still gain points* for their own
correct picks. **Only Kev goes negative.** The leaderboard singles out the culprit —
*"Whose leg lost the acca? Now there's proof,"* made literal.

The app formats points with `formatLegPoints` — no plus sign, trailing zeros dropped
(`0.4 pts`, `12.5 pts`, `-1 pts`) — and odds to two decimals. The "On screen" column
below is what the captures show.

**Tuesday Reds — the acca that dies**

| # | Player | Fixture | Pick | Odds | Result | On screen |
|---|--------|---------|------|------|--------|-----------|
| R1 | Rob Hale | Brighton v Brentford | Over/Under 1.5 Goals: Over 1.5 | 1.40 | **Won** | `0.4 pts` |
| R2 | Jay Mensah | Everton v Crystal Palace | Both Teams to Score: Yes | 2.10 | **Won** | `1.1 pts` |
| R3 | Nadia Kaur | Ipswich v Newcastle | Match Result: Ipswich | 3.25 | **Won** | `2.25 pts` |
| **R4** | **Kev Doyle** | **Aston Villa v Coventry** | **Match Result: Coventry** | **6.00 (5/1)** | **Lost** | **`-1 pts`** |

Combined odds as the slip fills: **1.40 → 2.94 → 9.55 → 57.33.** Team points: **`-1 pts`**.

**Tuesday Blues — the acca that lands**

| # | Player | Fixture | Pick | Odds | Result | On screen |
|---|--------|---------|------|------|--------|-----------|
| B1 | Tom Barker | Hull v Sunderland | Over/Under 1.5 Goals: Over 1.5 | 1.50 | **Won** | `0.5 pts` |
| B2 | Aisha Rahman | Stoke v Norwich | Double Chance: Stoke or Draw | 1.80 | **Won** | `0.8 pts` |
| B3 | Callum Reid | Bournemouth v Nottingham Forest | Both Teams to Score: Yes | 2.00 | **Won** | `1 pts` |
| B4 | Femi Adeyemi | Middlesbrough v QPR | Match Result: Middlesbrough | 2.50 | **Won** | `1.5 pts` |

Combined odds: **13.50.** Team points: **`12.5 pts`**.

**Fixtures are plausible placeholders.** Before capturing, swap in real fixtures and
prices from the target weekend — one edit to `scenario.json`. Keep Kev's pick a
`match_winner` at around 6.00.

### Why these prices

**That jump is the story.** Kev's single leg multiplies the badge by six — 9.55
becomes 57.33 — and 57.33 is a number that hurts to look at. The odds badge does the
characterisation for you: you can watch the recklessness arrive, and you can see
exactly how much was riding on it when it dies.

Two things keep the greed read working at these prices. **Kev's 6.00 is the longest on
the slip by a distance** — nearly double Nadia's 3.25, which is what marks him out as
the one reaching. And **the multiplier is his alone**: whatever the first three legs
total, the badge leaps six-fold because of him.

A tighter alternative was considered and rejected: 1.25 / 1.40 / 1.80 for a 3.15 treble
going to 18.90. That makes R1–R3 unarguably dull and the contrast starker, but 18.90 is
a far less striking number on screen and the acca stops looking like one a real group
would actually build. **Decision: keep 57.33.**

Blue's combined odds (13.50) come in well *below* red's (57.33). The acca that landed
was the less greedy one. Let the numbers carry that — never say it in copy, and don't
imply short prices are a strategy; it's one round, and
[MARKETING_BRIEF.md](./MARKETING_BRIEF.md) rules out claiming lasting skill from a
short sample.

### Kev's pick — the joke is greed, not stupidity

**Coventry to win at Aston Villa, 5/1.** A 5/1 away win is not a stupid pick — it's a
greedy one. Three legs are already in at 9.55, and Kev swings for the fences anyway —
sending the badge to 57.33 on his own. Every group has done exactly this, which is why
it will land harder than anything absurd would.

It also aligns the football perfectly. R1–R3 played simple passes and took sensible
prices. Kev had a simple pass on and went for the worldie. **The shot is the bet.** The
unmarked teammate in frame is what turns it from bad luck into a crime.

**Alternative:** Man Utd to win. It works, but it's weaker on both counts — United are
frequently favourites, so the price won't carry the greedy read, and one of the most
famous clubs in the world carries far more under-18 appeal than Coventry (§9).
**Recommendation: Coventry.**

**Club naming throughout:** avoid the big six entirely. It costs nothing, it reads more
like a real group's betslip, and it keeps the under-18 appeal argument away from the ad.

If the teasing gets a caption, the line is *"Five to one."* — nothing more. Silent is
better.

---

## 5. Tool stack

| Role | Tool | Why |
|------|------|-----|
| **Primary generator** | **Google Veo 3.1** (via Google Flow) | Strongest photorealism and prompt adherence; native 4K landscape *and* portrait; native audio gives usable temp boot/ball/laughter |
| **Volume + motion** | **Kling 3.0** | Best value per generation; strongest on ball physics, fabric, water spray. Multi-shot storyboard mode holds a look across cuts |
| **Control shots** | **Runway Gen-4.5** | Motion brush and explicit camera control for the tracking shots and the ball-over-the-fence arc; best reference-driven identity hold |
| **Character bible (stills)** | **Midjourney** or **Flux** | The eight reference faces — and the profile pictures — *before* any video |
| **Upscale / cleanup** | **Topaz Video AI** | Rescue soft or low-res generations |
| **Music** | **Suno** or **Udio** | Owned licence — do not use library music in paid media. Confirm export and commercial terms first (§12) |
| **VO** | **ElevenLabs** | The hook line (§1). Or a real voice — it's one sentence |
| **Edit + grade** | **DaVinci Resolve** (free) | Resolve's colour tools pull everything to Floodlight |

Reasonable minimum: one month of Google AI Pro/Ultra plus one Kling or Runway tier.

---

## 6. Shot list — AI generated

Seventeen clips, 2–6s each as generated (trimmed in the edit, §8). Generate every one
**image-to-video** from a locked reference still. Numbering is edit order.

### Act 1 — the acca that dies

| # | Shot | Dur | Description |
|---|------|-----|-------------|
| 1 | **Floodlights** | 2s | Low angle through the mesh. Cage floodlights snap on in sequence, ballast flicker, mist in the beams |
| 2 | **Establisher** | 3s | Wide, shot through the fence. Wet astro, eight players in claret and powder-blue bibs, breath steaming |
| 3 | **R1 — the first touch** | 4s | Close on boots. Rob receives, kills it dead, side-foots it away. Spray off the surface |
| 4 | **R2 — the nutmeg** | 4s | Mid, camera tracks right. Jay slips it through a blue player's legs and grins at his own audacity |
| 5 | **R3 — the no-look** | 3s | Tight. Nadia flicks it with the outside of her boot, already looking the other way. No reaction |
| 6 | **R4 receives** | 3s | Kev takes the ball on the edge of the box. Sets himself. Visibly, fatally confident. **A red teammate is unmarked and free in the same frame, arms up, calling for it** |
| 7 | **The sky** | 3s | Slow motion. Kev ignores him, leans back and absolutely launches it. Boot through the ball, wrong shape, wrong everything |
| 8 | **Over the fence** | 3s | Low and wide. The ball clears the cage, clears the floodlight, disappears into the black. Hold on the empty sky one beat too long |
| 9 | **The treatment** | 5s | Handheld mid. Rob hands on head. Jay doubled over laughing. Nadia slow-clapping, deadpan. All three turned toward Kev |
| 10 | **R4 deflated** | 3s | Close. Hands up, sheepish half-grin, mouths an apology nobody accepts |

### Act 2 — the acca that lands

| # | Shot | Dur | Description |
|---|------|-----|-------------|
| 11 | **Blue turnover** | 2s | The blue keeper rolls it out. Tempo change — the music shifts here |
| 12 | **B1 — one touch** | 3s | Low tracking dolly at surface height, following the ball through the passing lane |
| 13 | **B2 — the wall pass** | 3s | Mid. Quick one-two off B3, played round a red shirt |
| 14 | **B3 — the through ball** | 3s | The rondo shot: three blue shirts triangling round one red player, ball zipping between them, then released |
| 15 | **B4 — the finish** | 3s | Slow motion. First time, low, across the keeper |
| 16 | **The net** | 2s | Inside the goal. Ball hits the mesh, water shakes off |
| 17 | **Blue pile-on** | 4s | Handheld. Four blue players collapse into each other, genuine laughing. **They're celebrating the goal** — nobody checks a phone, nobody is congratulated for a pick (§9) |

### Prompt template

Reuse this skeleton for every shot — only the action line changes:

```
Photorealistic 35mm cinematic footage. Night. A caged 5-a-side astroturf football
pitch, green surface with sand infill, four-metre chain-link fence, floodlights
mounted on the cage frame casting cold blue-white light, heavy mist in the beams,
wet surface with standing water, total darkness beyond the fence, no stands and
no crowd.

[ACTION LINE]

Players are [N] adults in their late twenties, clearly adult faces with stubble and
laugh lines, wearing plain [deep claret-red / pale powder blue] training bibs over
dark tops, no badges or sponsors. Shallow depth of field, lens flare off the
floodlights, visible breath, handheld camera feel, dark navy shadows. No text, no
logos, no on-screen graphics.
```

Always append the negative direction: `no crowd, no stadium, no club badges, no
sponsor logos, no text overlays, no young faces, no teenagers`.

### Consistency method

1. **Build the character bible first.** Eight characters × 3 stills each (face, 3/4,
   full body) in final bib. Kev gets extra: a confident expression and a deflated one.
   Lock all of this before any video generation.
2. **Frame-chain.** Generate a shot, export a clean final frame, feed that frame as the
   reference image for the next shot. This is the standard fix for identity drift —
   and do the same for the **ball**: each pass must leave frame travelling the way the
   next clip receives it, or the move reads as random clips.
3. **Batch by shot size.** All close-ups, then all mid shots, then all wides. Switching
   distance mid-session is where faces wander.
4. **Budget a 10:1 reject ratio.** 17 usable clips means expect 150–200 generations.
   Hands, boots striking the ball, and faces at distance are the common failures.
   **Shot 9 (the treatment) will be the hardest in the film** — three simultaneous
   genuine reactions is much harder than one. Budget extra for it.

---

## 7. App captures — seeded and automated

Every app beat is a real screen from the running app, rebuilt from seeded data for
each moment of the story and captured at iPhone 15 Pro resolution (1179×2556).
Nothing is mocked except the two additions noted below.

```bash
docker compose up -d && npm run db:migrate:deploy
npm run dev                                          # keep running
npm run video-ad:capture                             # every beat
npm run video-ad:capture -- --leaderboard-frames     # plus L1 count-up frames
```

Full instructions, options and output layout: [tools/marketing/README.md](../tools/marketing/README.md)
→ *Video ad captures*. The pieces:

| Piece | Path |
|-------|------|
| Cast, picks, odds, stages | `tools/marketing/video-ad/scenario.json` |
| Seed (two groups at any stage) | `packages/database/prisma/video-ad-seed.ts` — `npm run video-ad:seed -- --stage=<name>` |
| Capture | `tools/marketing/scripts/capture-video-ad.mjs` |
| Profile pictures | `tools/marketing/video-ad/avatars/<member key>.png` |
| Output (git-ignored) | `tools/marketing/video-ad/captures/<beat>-<stage>/` |

### The beats

| Beat | Stage | What's on screen | Cuts against |
|------|-------|------------------|--------------|
| **S1** | `red-1` | Rob's leg on the slip, 1.40. "Waiting on 3 legs" | Shot 3 |
| **S2** | `red-2` | Jay's leg joins, combined 2.94 | Shot 4 |
| **S3** | `red-3` | Nadia's leg joins, combined **9.55**. Kev still **Pending** | Shot 5 |
| **S4** | `red-locked` | Kev's **Coventry 6.00** in — "Acca locked", **Locked combined odds 57.33**. The single most important frame in the ad | Shot 6 |
| **S5** | `red-settled` | Settled card: Rob, Jay, Nadia **Won**; Kev **Lost** in red; group `-1 pts`, Acca @ 57.33 | Shot 8 |
| **S6** | `blue-won-1`…`3` | Blue legs turning **Won** one by one — "Acca in progress: 2 of 4 legs settled" | Shots 12–14 |
| **S7** | `blue-settled` | Settled card: all four **Won**, group `12.5 pts`, Acca @ 13.50 | Shot 16 |
| **L1** | `leaderboard` | Team points (Blues `12.5 pts`, Reds `-1 pts`), then every player's points — Kev alone in red at the bottom | End of Act 2 |

Each betslip stage saves a full phone screen from the group tabs down (`screen.png`),
one scrolled to the combined odds (`screen-odds.png`), and element crops of the status
banner, picks and odds. S1–S3 share framing, so cutting between them reads as a new
leg dropping onto the slip. Settled stages save the History card; L1 saves the board
and, with `--leaderboard-frames`, a one-second count-up as 31 PNG frames.

### What the capture changes

- **Profile pictures** beside every name (legs, submission list, settled cards,
  leaderboard). **The app has no profile pictures today** — see §9. `--initials`
  captures the app exactly as it ships.
- **L1 is a composite**, built inside the running app from its own components,
  fonts and colours. No single app screen compares two groups' team points.
- **Viewer-neutral tidying:** leg lists restored to pass order (the active betslip has
  no defined leg order — worth a real `orderBy` in the group API), the signed-in
  member's own Change/Remove buttons hidden, the Next.js dev badge hidden.

**The tap beat is gone.** Earlier drafts cut each pass to a thumb tapping *Submit leg*.
The pick screen reads live odds, so it can't be made to offer Coventry at 6.00 without
changing app code — and the betslip gaining a named leg carries the metaphor better
anyway: it shows *who*.

**Bookmaker names appear on screen** — *Locked at Bet365*, *Open Bet365*. See §9.

---

## 8. The edit

### 50-second hero cut

| Time | Picture | Sound · VO · supers |
|------|---------|---------------------|
| 0:00 | **1** Floodlights snap on | VO *"Tiki-taka is football's great passing game…"* · super 1 |
| 0:02 | **2** Establisher through the fence | VO *"…everyone touches the ball."* |
| 0:04 | **3** Rob's first touch | VO *"In a group acca…"* · super 2 |
| 0:06 | **S1** Rob's leg on the slip, 1.40 | VO *"…everyone touches the bet."* Ball strike lands on the cut. Music in |
| 0:08 | **4** Jay's nutmeg | |
| 0:10 | **S2** Jay's leg, 2.94 | Tempo lifts |
| 0:11 | **5** Nadia's no-look | |
| 0:12.5 | **S3** Nadia's leg, **9.55** — Kev pending | Fastest section. Everything is going right |
| 0:13.5 | **6** Kev receives, unmarked man in frame | **Music thins** |
| 0:16 | **S4** Coventry 6.00 → **Acca locked, 57.33** | Hold it |
| 0:18.5 | **7** The sky (slow motion) | Boot through ball. Music stops dead |
| 0:21 | **8** Over the fence, into the black | **Silence.** Three full seconds |
| 0:24 | **S5** Settled — Kev's leg **Lost**, group `-1 pts` | A single low note |
| 0:25.5 | **9** The treatment | Laughter. No music |
| 0:29.5 | **10** Kev deflated | The laughter tails off |
| 0:31 | **11** Blue turnover | **Music returns, different, driving** |
| 0:32 | **12–14** Blue move, intercut **S6** legs landing Won | Fast cuts, accelerating |
| 0:37 | **15** The finish | |
| 0:38.5 | **16** The net | Music full |
| 0:39.5 | **S7** Settled — four Won, `12.5 pts` | |
| 0:41 | **17** Pile-on — celebrating the goal | |
| 0:43 | **L1** Leaderboard: 1s count-up, 2s hold | Music settles |
| 0:46 | **End card** | 4s |
| 0:50 | — | |

Act 1 runs **31s** (0:00–0:31), Act 2 **12s** (0:31–0:43), leaderboard 3s, end card 4s.

**The rules that make this work:**

1. **Each pass-to-slip pair is faster than the last** through Act 1: 4s (Rob), 3s
   (Jay), 2.5s (Nadia). The edit accelerates into the mistake.
2. **The silence at 0:21 is the whole ad.** Three full seconds of nothing — empty sky,
   no music, no laughter yet. Resist cutting it short. Comedy needs the gap between the
   error and the reaction.
3. **Act 2 must be shorter than Act 1** — 12s against 31s. The failure is the story;
   the success is the resolution. If Act 2 runs long the ad becomes a product demo and
   loses its nerve.
4. **The last thing before the end card is a leaderboard, not a betslip.** The ad
   resolves on standing, not on a return. Nobody on screen reacts to it — it's a
   record, not a trophy (§9).

### End card

> **Your mates. One acca. Every leg counts.**
>
> Triangle rondo + wordmark · `tikiacca.com`
>
> *We're not a bookmaker. You bet with licensed UK bookmakers — we keep the score. 18+. BeGambleAware.org*

Headline is the locked homepage line from [MARKETING_BRIEF.md](./MARKETING_BRIEF.md).
*Every leg counts* is literally the plot, and Kev's `-1 pts` is the proof. Test
*"Whose leg lost the acca? Now there's proof."* as the paid variant.

### Cutdowns

Every cut carries the trust line for at least three seconds.

**30s (16:9)** — supers carry the hook; VO optional in a short form (*"Tiki-taka:
everyone touches the ball. Tiki Acca: everyone touches the bet."*)

| Time | Picture |
|------|---------|
| 0:00 | **2** Establisher · super 1 |
| 0:02 | **3** Rob's first touch |
| 0:03.5 | **S1** Rob's leg · super 2 |
| 0:05 | **4** Jay's nutmeg |
| 0:06.5 | **S3** Three legs, 9.55, Kev pending |
| 0:07.5 | **6** Kev receives |
| 0:09.5 | **S4** Acca locked, 57.33 |
| 0:11.5 | **7** The sky |
| 0:13.5 | **8** Over the fence — 2.5s silence |
| 0:16 | **S5** Kev's leg Lost |
| 0:17 | **9** The treatment |
| 0:20 | **14** Blue through ball |
| 0:22 | **15** The finish |
| 0:23 | **S7** Blue settled |
| 0:24 | **L1** Leaderboard |
| 0:27 | **End card** (3s) |

**15s (9:16) — Act 1 only.** The best social asset in the set — the banter is the
shareable half, and cutting before the payoff is what makes people send it to the
group chat. Generate the verticals natively in portrait; do not crop the 16:9.

| Time | Picture |
|------|---------|
| 0:00 | **4–5** Two quick passes · super *"Everyone touches the ball."* |
| 0:02 | **S3** Three legs in · super *"Everyone touches the bet."* |
| 0:03 | **6** Kev receives |
| 0:05 | **S4** Acca locked, 57.33 |
| 0:07 | **7** The sky |
| 0:08.5 | **8** Over the fence — 2s silence |
| 0:10.5 | **9** The treatment |
| 0:12 | **End card** (3s) |

**6s loop (1:1):** **6** → **S4** → **7** → **8**, 1.5s each. Pick, sky, gone. No room
for an end card, so a **persistent footer** runs all six seconds: *Tiki Acca · Not a
bookmaker · 18+ · BeGambleAware.org*.

---

## 9. Compliance (non-negotiable)

### Do these rules apply to us?

**Yes — to the same standard as a bookmaker's ads, and in practice more strictly.**

- The CAP Code's gambling rules (section 16) cover marketing for gambling, including
  marketing by third parties such as **affiliates** acting on an operator's behalf.
  Once Tiki Acca carries affiliate links, its ads are marketing for those bookmakers.
- Licensed operators are responsible for their affiliates under the Gambling
  Commission's licence conditions (LCCP social responsibility code 1.1.2) and must
  ensure their marketing follows the CAP and BCAP codes (5.1.6). Every bookmaker
  affiliate agreement will pass those obligations to us — typically with creative
  approval rights and termination for breaches.
- Even without affiliate links, an ad that encourages people to build accas and bet
  with bookmakers is advertising gambling, and the ASA would assess it that way.
- Tiki Acca doesn't need a gambling licence to be an affiliate. The rules attach to
  the marketing, not the licence.

### The rules, applied

| Rule | What it means here |
|------|--------------------|
| **CAP 16.3.14 — under-25s** | Nobody who **is or seems** under 25 may play a significant role. AI renders young: prompt "late twenties" with explicit maturity markers and **bin any generation where a face could read as 22**. Applies to the profile pictures too |
| **CAP 16.3.6 — recognition and admiration** | Ads must not suggest gambling is a way to gain recognition or admiration. The blue pile-on celebrates the **goal**, not the picks; nobody is praised for a pick; the leaderboard is shown as a record that nobody on screen reacts to |
| **CAP 16.3.7 — peer pressure** | Ads must not suggest peer pressure to gamble or disparage not gambling. The teasing targets **Kev's pick**, never someone for not betting. The hook (*"everyone touches the bet"*) describes the mechanic. Put both in front of Copy Advice |
| **Strong appeal to under-18s** | No real footballers, no lookalikes, no club badges, kits, crests or stadiums. The ASA has ruled against ads featuring current top-flight players on social. A club **name in betslip text** is standard practice and materially lower risk — keep it to text. **Avoid the big six entirely** |
| **Trademark** | No club badge, sponsor logo, real kit design, competition branding or trophy in frame |
| **Bookmaker names on screen** | The real captures show *Locked at Bet365* and an *Open Bet365* button. Only show a bookmaker whose affiliate agreement permits its name in our ads; otherwise change `bookmaker` in `scenario.json` to one that does, or crop to the picks |
| **Illustrative UI** | **Profile pictures and the cross-group leaderboard (L1) are not in the app today.** Showing features the product lacks risks a misleading-advertising finding (CAP 3.1). Before the ad runs: ship profile pictures, or recapture with `--initials`; and ship a matching leaderboard, or replace L1 with the two real settled cards (S5, S7) |
| **No win-promise** | Act 2 must not imply that using Tiki Acca makes you win money. **Never show a cash return figure, stake, payout, balance or currency symbol at any point.** The reward shown is **points** and **Settled** — never money. [MARKETING_BRIEF.md](./MARKETING_BRIEF.md) is explicit: no promise of profit, no claim of lasting skill from a short sample. Combined odds (57.33, 13.50) are a factual product display and are fine; a cash equivalent beside them is not |
| **ASA monitoring** | The ASA began active monitoring of gambling ads on social media in June 2026. Assume scrutiny |
| **Not a bookmaker** | The trust line stays in every cut: *not a bookmaker, 18+, BeGambleAware.org*. Same wording as the homepage trust strip |
| **Platform rules** | Meta requires a gambling advertiser permit and age-gating. Confirm TikTok accepts this category in the UK at all before making the vertical the lead asset |
| **AI disclosure** | Meta and TikTok require AI-generated content to be labelled. Declare it — this is a disclosure obligation, not a nicety |
| **CAP Copy Advice** | Send the script, this brief and the storyboard to CAP's Copy Advice team **before any footage spend** — free for non-broadcast ads, and 16.3.6 / 16.3.7 are judgement calls |

### Pre-flight checklist

- [ ] CAP Copy Advice response received and actioned
- [ ] Every visible face — footage and profile pictures — reads unambiguously 25+
- [ ] No badge, sponsor mark, crest or real kit design anywhere in frame
- [ ] No real player likeness
- [ ] No cash figure, stake, payout, balance or currency symbol shown at any point
- [ ] The payoff reads as points and leaderboard standing, not returns
- [ ] Celebrations are about the goal; nobody on screen is admired for a pick
- [ ] Club names appear only as betslip text, and none are big-six clubs
- [ ] Any bookmaker named on screen is covered by an affiliate agreement
- [ ] Every UI feature shown exists in the shipping app (profile pictures, leaderboard)
- [ ] Trust line legible for ≥3s in every cut (persistent footer in the 6s loop)
- [ ] 18+ and BeGambleAware.org present
- [ ] AI-generated label applied on every platform
- [ ] Advertiser permit in place before any paid spend

---

## 10. Budget

| Line | Cost |
|------|------|
| Google AI Pro / Ultra (1 month, Veo 3.1 via Flow) | £20–£200 |
| Kling 3.0 or Runway (1 month, overflow generations) | £10–£70 |
| Midjourney or Flux (eight-character bible + profile pictures) | £10–£25 |
| Suno / Udio (two licensed cues — Act 1 and Act 2 differ) | £8–£25 |
| ElevenLabs (hook VO) | £0–£5 |
| Topaz Video AI (optional) | £0–£250 |
| DaVinci Resolve | £0 |
| App captures | £0 — automated (§7) |
| **Total** | **£200–£450** |

Against **£15,000–£40,000** for the equivalent live-action shoot — pitch hire,
floodlights, crew, eight actors, one day. A 6-second punchline loop alone can still be
produced on a single £20 month. Check the generator's monthly credit allowance against
150–200 generations; use the fast mode for drafts and the quality mode for finals.

---

## 11. Production order

1. **CAP Copy Advice** — script, this brief, a storyboard. Nothing is generated until
   it comes back.
2. **Kev's character bible.** He carries the ad. Confident face, deflated face, full
   body — and his profile picture. If Kev isn't likeable, nothing else matters.
3. **Remaining seven characters** — four red in full detail, four blue built lighter.
   Export all eight headshots to `tools/marketing/video-ad/avatars/`.
4. **Look development** — one hero still of the cage. Iterate until it's right; it
   becomes the style reference for all 17 shots.
5. **App captures** — put real fixtures in `scenario.json`, then
   `npm run video-ad:capture -- --leaderboard-frames`. Minutes, not days, and the
   captures set the timing the AI shots must cut against.
6. **Shot 9 (the treatment) next.** It is the hardest shot in the film and the one the
   whole concept rests on. If three genuine simultaneous reactions can't be generated to
   standard, the comedy needs rethinking before any more spend.
7. **Shots 7 and 8 (the sky and the fence).** Second-hardest, and the punchline.
8. **Remaining AI shots**, batched by shot size, frame-chained.
9. **Assembly, grade, VO, sound, end card.** Guard the silence at 0:21 in every review
   pass.
10. **Compliance pre-flight** (§9) before any export goes near a platform.

---

## 12. Open items

| Item | Status |
|------|--------|
| CAP Copy Advice on 16.3.6 / 16.3.7 (celebration, teasing, hook line) | Before any footage spend |
| Profile pictures in the app — ship before launch, or recapture with `--initials` | Product decision |
| L1 cross-group leaderboard — ship a matching screen, or cut to S5 + S7 | Product decision |
| Bookmaker shown on screen — which affiliate partner permits its name | Commercial |
| Real fixtures and prices for the capture weekend | Edit `scenario.json`, recapture |
| Betslip leg order — add an `orderBy` to the group API's active-round legs | Product backlog (capture works around it) |
| Which generator wins shot 9 (Veo vs Kling vs Runway) | Decide after production step 6 |
| Music: Suno/Udio export and commercial-use terms; Topaz licensing | Verify before purchase |
| TikTok UK eligibility for this category | Verify before planning the vertical as the lead |
| Campaign line: Territory A vs *"Whose leg lost the acca?"* | Test both as paid variants |

---

## Related docs

- [BRAND.md](./BRAND.md) — palette, logo, typography (locked)
- [MARKETING_BRIEF.md](./MARKETING_BRIEF.md) — positioning, taglines, voice
- [tools/marketing/README.md](../tools/marketing/README.md) — video ad capture workflow and demo seed
