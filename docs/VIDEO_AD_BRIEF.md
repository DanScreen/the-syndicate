# Tiki Acca — AI video ad production brief

> **Concept:** "The Cage." Two acts on a floodlit 5-a-side pitch, watched from a
> neutral touchline. Every pass is a member submitting their leg to the Tiki Acca app.
> One group's acca dies on the last leg because someone got greedy; the other group's
> acca lands and their points go up. Produced entirely with generative AI video plus
> real screen recordings — no live-action shoot, no crew, no budget.

| Field | Value |
|-------|-------|
| **Status** | Draft brief — approved for production, not yet shot |
| **Date** | September 2026 |
| **Deliverables** | 45s hero cut (16:9), 30s cutdown, 15s Act 1 only (9:16), 6s loop (1:1) |
| **Constraints** | Floodlight palette + Triangle rondo logo are **locked** ([BRAND.md](./BRAND.md)). Positioning and voice per [MARKETING_BRIEF.md](./MARKETING_BRIEF.md). |
| **Compliance** | UK CAP Code gambling rules apply — see [§9](#9-compliance-non-negotiable) before generating a single frame |
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
| **Real screen recordings** | Every pick, every submit, the dead leg, the locked acca | iOS screen recording on a real build (§7) |

Never generate the UI. [MARKETING_BRIEF.md](./MARKETING_BRIEF.md) already sets this rule —
*"the real UI is the best marketing asset; never illustrate what can be screenshotted."*
It also solves the unsolvable production problem: nobody plays 5-a-side holding a phone.
The **cut** carries the metaphor, so the phone never has to be on the pitch.

This structure has a second payoff here. The joke only works if the audience can *read
the daft pick*, and a real screenshot of a real betslip is both funnier and more
legible than anything a video model would invent.

---

## 2. Setting — the floodlit cage (decided)

**A caged 5-a-side astro pitch at night, under floodlights.** Not a professional
stadium, and — changed from the earlier 11-a-side version of this brief — not a full
grass pitch either. Going to 5-a-side makes the cage the right venue, and the cage is
better on every axis:

1. **Brand fit.** "Mates first, not a tipster." A Tuesday-night cage booking is the
   actual ritual this product attaches to. A stadium reads broadcaster or bookmaker —
   the two things Tiki Acca explicitly is not.
2. **The joke lives here.** Tiki-taka is elite Barcelona football. Performed by eight
   blokes in a council cage, and then ruined by one of them, is funny, warm and
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

This is up from six in the previous version of the brief and it is the main cost driver
of the two-act structure. Mitigate it: **the four red players get full character
bibles** (they carry the comedy and all the close-ups), while **the four blue players
are built lighter** — they're seen in motion, in mid-shot, and their sequence is fast.
Blue faces need to be consistent, not memorable.

Aim for a recognisable friend group: mixed build, mixed ethnicity, at least two women
across the eight, a spread of ability that reads on screen.

### The four red characters

| # | Character | Role in Act 1 |
|---|-----------|---------------|
| R1 | **The organiser.** Calm, competent, the one who set the round up | Receives first, one-touch pass. His pick is the safe banker |
| R2 | **The show-off.** Quick, technical, enjoys himself too much | The nutmeg. Celebrates his own pass |
| R3 | **The quiet one.** Genuinely the best player, says nothing | The no-look flick. Doesn't react to it at all |
| R4 | **The liability.** Everyone has one. Enthusiastic, overconfident, allergic to the simple option | The greedy pick. Ignores the unmarked man, skies the shot. Gets the treatment |

**R4 is the most important character in the ad.** He is the reason the product exists.
Build him first and build him hardest: he needs to be instantly likeable, visibly
pleased with himself in the run-up, and completely deflated in the aftermath. He's not
the villain — he's the mate, and on another night his 5/1 comes in and he's a legend.
The teasing has to land as affection, not contempt.

### Ages

**27–30.** Prompt them as **"late twenties, clearly adult"** with explicit maturity
markers — stubble, laugh lines, a receding hairline, a beard with grey in it.
Generative models render faces younger than prompted, routinely by 4–6 years, and the
CAP Code bars anyone who **is or seems** under 25 (§9). Treat 27–30 as the target
*render*, which means prompting at the top of that range and rejecting hard.

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

The picks are the script. They appear as real screenshots (§7), held long enough to
read — roughly 12–15 frames each, which is about half a second.

### Markets

Only the six markets the product actually offers (`MARKET_TYPES` in
`packages/shared/src/constants.ts`) may appear on screen:

`match_winner` · `both_teams_score` · `over_under_15` · `over_under_25` ·
`over_under_35` · `double_chance`

There is **no clean-sheet market**, so R4's pick is a `match_winner` longshot. Spreading
the other picks across the remaining markets is worth doing for its own sake — it shows
the product's real range without a word of copy.

### The picks table

Points follow `legPointsForOutcome` in `packages/shared/src/scoring.ts` exactly:
**won = `odds − 1`, lost = `−1`**. A round with any lost leg scores **`−1`** for the
whole group (`groupAccaRoundPoints`). Use these numbers on screen; they are the real
ones the app would produce.

**Red — the acca that dies**

| Player | Market | Pick | Odds | Result | Points |
|--------|--------|------|------|--------|--------|
| R1 | `over_under_15` | Over 1.5 goals | 1.40 | **Won** | **+0.40** |
| R2 | `both_teams_score` | Both teams to score | 2.10 | **Won** | **+1.10** |
| R3 | `match_winner` | Home win, mid-price | 3.25 | **Won** | **+2.25** |
| **R4** | `match_winner` | **Coventry to win** | **6.00 (5/1)** | **Lost** | **−1.00** |

**Combined odds after three legs: 9.55. After R4's leg: 57.33.** Round points for the
group: **−1.00.**

**That jump is the story.** R4's single leg multiplies the badge by six — 9.55 becomes
57.33 — and 57.33 is a number that hurts to look at. The odds badge does the
characterisation for you: you can watch the recklessness arrive, and you can see
exactly how much was riding on it when it dies.

Two things keep the greed read working at these prices. **R4's 6.00 is the longest on
the slip by a distance** — nearly double R3's 3.25, which is what marks him out as the
one reaching. And **the multiplier is his alone**: whatever the first three legs total,
the badge leaps six-fold because of him.

A tighter alternative was considered and rejected: 1.25 / 1.40 / 1.80 for a 3.15 treble
going to 18.90. That makes R1–R3 unarguably dull and the contrast starker, but 18.90 is
a far less striking number on screen and the acca stops looking like one a real group
would actually build. **Decision: keep 57.33.**

**Blue — the acca that lands**

| Player | Market | Pick | Odds | Result | Points |
|--------|--------|------|------|--------|--------|
| B1 | `over_under_15` | Over 1.5 goals | 1.50 | **Won** | **+0.50** |
| B2 | `double_chance` | Home or draw | 1.80 | **Won** | **+0.80** |
| B3 | `both_teams_score` | Both teams to score | 2.00 | **Won** | **+1.00** |
| B4 | `match_winner` | Home win | 2.50 | **Won** | **+1.50** |

Combined odds at lock: **13.50.** Round points for the group: **+12.50.**

Note that blue's combined odds (13.50) come in well *below* red's (57.33). The acca that
landed was the less greedy one. Let the numbers carry that — never say it in copy, and
don't imply short prices are a strategy; it's one round, and
[MARKETING_BRIEF.md](./MARKETING_BRIEF.md) rules out claiming lasting skill from a
short sample.

Match the app's own odds format in the capture rather than hand-writing fractions.

### R4's pick — the joke is greed, not stupidity

**Coventry to win at 5/1.** This is better than a novelty market, and better than the
"obviously idiotic bet" framing in the previous draft, for a reason worth stating
plainly: **a 5/1 away win is not a stupid pick — it's a greedy one.** Three bankers are
already in at 9.55, and R4 swings for the fences anyway — sending the badge to 57.33 on
his own.
Every group has done exactly this, which is why it will land harder than anything
absurd would.

It also aligns the football perfectly. R1–R3 played simple passes and took sensible
prices. R4 had a simple pass on and went for the worldie. **The shot is the bet.** The
unmarked teammate in frame is what turns it from bad luck into a crime.

**Alternative, if Coventry doesn't suit:** Man Utd to win. It works, but it's weaker on
both counts — United are frequently favourites, so the price won't carry the "greedy"
read, and a globally famous club is a materially worse strong-appeal risk under the CAP
rules than a Championship side (§9). **Recommendation: Coventry.**

**Club naming throughout:** prefer Championship and League One sides for every pick and
avoid the big six entirely. It costs nothing, it reads more authentically like a real
group's betslip, and it keeps the under-18 appeal argument well away from the ad.

The dialogue-free tease works better than a line read, but if you do add VO or a
caption, the line is *"Five to one."* — nothing more.

## 5. Tool stack

| Role | Tool | Why |
|------|------|-----|
| **Primary generator** | **Google Veo 3.1** (via Google Flow) | Strongest photorealism and prompt adherence; native 4K landscape *and* portrait; native audio gives usable temp boot/ball/laughter |
| **Volume + motion** | **Kling 3.0** | Best value per generation; strongest on ball physics, fabric, water spray. Multi-shot storyboard mode holds a look across cuts |
| **Control shots** | **Runway Gen-4.5** | Motion brush and explicit camera control for the tracking shots and the ball-over-the-fence arc; best reference-driven identity hold |
| **Character bible (stills)** | **Midjourney** or **Flux** | Generate the eight reference faces *before* any video |
| **Upscale / cleanup** | **Topaz Video AI** | Rescue soft or low-res generations |
| **Music** | **Suno** or **Udio** | Owned licence — do not use library music in paid media |
| **VO (optional)** | **ElevenLabs** | Only if you add the *"Mate."* or a read end card |
| **Edit + grade** | **DaVinci Resolve** (free) | Resolve's colour tools pull everything to Floodlight |

Reasonable minimum: one month of Google AI Pro/Ultra plus one Kling or Runway tier.

---

## 6. Shot list — AI generated

Seventeen clips, 2–6s each. Generate every one **image-to-video** from a locked
reference still. Numbering is edit order.

### Act 1 — the acca that dies

| # | Shot | Dur | Description |
|---|------|-----|-------------|
| 1 | **Floodlights** | 2s | Low angle through the mesh. Cage floodlights snap on in sequence, ballast flicker, mist in the beams |
| 2 | **Establisher** | 3s | Wide, shot through the fence. Wet astro, eight players in claret and powder-blue bibs, breath steaming |
| 3 | **R1 — the first touch** | 4s | Close on boots. R1 receives, kills it dead, side-foots it away. Spray off the surface |
| 4 | **R2 — the nutmeg** | 4s | Mid, camera tracks right. R2 slips it through a blue player's legs and grins at his own audacity |
| 5 | **R3 — the no-look** | 3s | Tight. R3 flicks it with the outside of his boot, already looking the other way. No reaction |
| 6 | **R4 receives** | 3s | R4 takes the ball on the edge of the box. Sets himself. Visibly, fatally confident. **A red teammate is unmarked and free in the same frame, arms up, calling for it** |
| 7 | **The sky** | 3s | Slow motion. R4 ignores him, leans back and absolutely launches it. Boot through the ball, wrong shape, wrong everything |
| 8 | **Over the fence** | 3s | Low and wide. The ball clears the cage, clears the floodlight, disappears into the black. Hold on the empty sky one beat too long |
| 9 | **The treatment** | 5s | Handheld mid. R1 hands on head. R2 doubled over laughing. R3 slow-clapping, deadpan. All three turned toward R4 |
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
| 17 | **Blue pile-on** | 4s | Handheld. Four blue players collapse into each other, genuine laughing |

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
   full body) in final bib. R4 gets extra: a confident expression and a deflated one.
   Lock all of this before any video generation.
2. **Frame-chain.** Generate a shot, export a clean final frame, feed that frame as the
   reference image for the next shot. This is the standard fix for identity drift.
3. **Batch by shot size.** All close-ups, then all mid shots, then all wides. Switching
   distance mid-session is where faces wander.
4. **Budget a 10:1 reject ratio.** 17 usable clips means expect 150–200 generations.
   Hands, boots striking the ball, and faces at distance are the common failures.
   **Shot 9 (the treatment) will be the hardest in the film** — three simultaneous
   genuine reactions is much harder than one. Budget extra for it.

---

## 7. Shot list — real screen recordings

Capture on a real device against the seeded demo data. Do **not** generate or mock these.

> Setup: `npm run marketing:seed` then `npm run dev` — see
> [marketing-posts/README.md](../marketing-posts/README.md). The demo seed only touches
> `@demo.tikiacca.com` users and the `DEMO24` group. Never point local `DATABASE_URL`
> at production.

| # | Beat | Capture | Cuts against |
|---|------|---------|--------------|
| S1 | Thumb taps **Submit your leg**, R1's Over 1.5 at 1.40 visible | Close on device, real thumb, dark room | Shot 3 |
| S2 | **Submitting…** → **Submitted**, R2's BTTS at 2.10 | The state flip, slowed 50% | Shot 4 |
| S3 | **Combined odds** settling at 9.55 after R3's leg | The badge before the damage. This is the "before" | Shot 5 |
| S4 | **R4's pick, held long enough to read** | Coventry to win, 6.00 — and the badge jumping 9.55 → **57.33**. The single most important frame in the ad | Shot 6 |
| S5 | Leg marked **Lost** — red state | The acca dies | Shot 8 |
| S6 | **R4's points: −1.00**, and his row dropping on the group leaderboard | The cost, in points | Shot 10 |
| S7 | Blue group's legs landing **Won** in sequence | Green state, one after another | Shots 12–14 |
| S8 | **Acca locked**, all four Won, combined odds 13.50 | The payoff | Shot 16 |
| S9 | **Points ticking up** — each blue member's total rising, then the **group leaderboard** reordering | Counting animation on the numbers if the UI has one; otherwise cut the before and after | Shot 17 / end card |

Shoot everything **in a dark room** so the screen glow matches the floodlit night grade
and the cuts don't jar.

**S4 is the joke.** Give it more frames than feels comfortable in the edit — the
audience needs time to read the price, watch the badge leap from 9.55 to 57.33, and get
there half a beat before the shot is skied.

**S6 and S9 are the payoff, and they are points, never money.** The reward the ad shows
is a number going up on a leaderboard and a row moving. Nothing else. See §9.

---

## 8. The edit

### 45-second hero cut

| Time | Picture | Sound |
|------|---------|-------|
| 0:00 | **1** Floodlights snap on | Ballast hum, a distant shout |
| 0:02 | **2** Establisher through the fence | Boots on wet astro |
| 0:05 | **3** R1 first touch → **S1** Submit, 1.40 | Ball strike lands *on* the tap. Music in |
| 0:09 | **4** R2 nutmeg → **S2** Submitted, 2.10 | Tempo lifts |
| 0:13 | **5** R3 no-look → **S3** combined odds settle at 9.55 | Fastest section. Everything is going right |
| 0:16 | **6** R4 receives, unmarked man in frame → **S4 Coventry 6.00, badge jumps 9.55 → 57.33** | **Music thins.** Hold the screenshot |
| 0:19 | **7** The sky (slow motion) | Boot through ball. Music stops dead |
| 0:22 | **8** Over the fence, into the black | Silence. One long beat on empty sky |
| 0:25 | **S5** Leg marked **Lost** | A single low note |
| 0:26 | **9** The treatment | Laughter. No music |
| 0:31 | **10** R4 deflated → **S6 −1.00**, his row slides down | The laughter tails off |
| 0:33 | **11** Blue turnover | **Music returns, different, driving** |
| 0:35 | **12–14** Blue move → **S7** legs landing Won | Fast cuts, accelerating |
| 0:40 | **15** The finish → **S8 Acca locked**, 13.50 | Hard cut on the strike |
| 0:42 | **16** The net + **17** pile-on | Music full |
| 0:44 | **S9** Points ticking up, leaderboard reorders → end card | Settles |

**The three rules that make this work:**

1. **Each pass-to-tap cut comes faster than the last** through Act 1. Shot 3 holds four
   seconds; by shot 5 the cuts are under a second. The edit accelerates into the
   mistake.
2. **The silence at 0:22 is the whole ad.** Three full seconds of nothing — empty sky,
   no music, no laughter yet. Resist cutting it short. Comedy needs the gap between the
   error and the reaction.
3. **Act 2 must be shorter than Act 1.** Roughly 11 seconds against 28. The failure is
   the story; the success is the resolution. If Act 2 runs long the ad becomes a
   product demo and loses its nerve.
4. **The last thing on screen before the end card is a leaderboard, not a betslip.**
   The ad resolves on standing, not on a return. That is both the compliance position
   (§9) and the more interesting promise: the reward for being right is that everyone
   can see you were right.

### End card

> **Your mates. One acca. Every leg counts.**
>
> Triangle rondo + wordmark · `tikiacca.com`
>
> *We're not a bookmaker. You bet with licensed UK bookmakers — we keep the score. 18+. GambleAware.*

Headline is the locked homepage line from [MARKETING_BRIEF.md](./MARKETING_BRIEF.md).
Given this cut, the Territory A line lands harder than ever — *every leg counts* is
literally the plot, and R4's **−1.00** is the proof. Test *"Whose leg lost the acca? Now there's proof."* as the paid
variant; this ad is the thirty-second version of that sentence.

### Cutdowns

- **30s:** trim the Act 1 build to two passes (drop shot 5), tighten the treatment,
  keep the full silence.
- **15s (9:16) — Act 1 only.** Ends on shot 10, R4 deflated, then straight to end card.
  **This is the best social asset in the set** — the banter is the shareable half, and
  cutting before the payoff is what makes people send it to the group chat. Generate
  the verticals natively in portrait; do not crop the 16:9.
- **6s loop (1:1):** shot 6 → S4 → shot 7 → shot 8. Pick, sky, gone. Pure punchline.

---

## 9. Compliance (non-negotiable)

UK gambling advertising rules govern this ad. Get these wrong and it gets pulled.

| Rule | What it means here |
|------|--------------------|
| **CAP 16.3.14 — under-25s** | Nobody who **is or seems** under 25 may play a significant role. AI renders young: prompt "late twenties" with explicit maturity markers and **bin any generation where a face could read as 22**. When in doubt, cut it |
| **Strong appeal to under-18s** | No real footballers, no lookalikes, no club badges, kits, crests or stadiums. The ASA has ruled against ads featuring current top-flight players on social. A club **name in betslip text** is standard practice and materially lower risk — keep it to text. **Prefer Championship and League One clubs and avoid the big six entirely** (§4): Coventry carries far less under-18 appeal than Man Utd, at no cost to the joke |
| **Trademark** | No club badge, sponsor logo, real kit design, competition branding or trophy in frame |
| **No win-promise** | Act 2 must not imply that using Tiki Acca makes you win money. **Never show a cash return figure, stake, payout, balance or currency symbol at any point.** The reward shown is **points** — individual totals rising (S9), a row climbing the **group leaderboard**, plus **Won** and **Acca locked**. [MARKETING_BRIEF.md](./MARKETING_BRIEF.md) is explicit: no promise of profit, no claim of lasting skill from a short sample. Combined odds (57.33, 13.50) are a factual product display and are fine; a cash equivalent beside them is not |
| **ASA monitoring** | The ASA began active monitoring of gambling ads on social media in June 2026. Assume scrutiny |
| **Not a bookmaker** | The trust line stays in the cut: *not a bookmaker, 18+, GambleAware*. Same wording as the homepage trust strip |
| **Platform rules** | Meta and TikTok both require a gambling advertiser permit **and** age-gating before this can run as paid media |
| **AI disclosure** | Meta and TikTok require AI-generated content to be labelled. Declare it — this is a disclosure obligation, not a nicety |

### Pre-flight checklist

- [ ] Every visible face reads unambiguously 25+
- [ ] No badge, sponsor mark, crest or real kit design anywhere in frame
- [ ] No real player likeness
- [ ] No cash figure, stake, payout, balance or currency symbol shown at any point
- [ ] The payoff reads as points and leaderboard standing, not returns
- [ ] Club names appear only as betslip text, and none are big-six clubs
- [ ] Trust line legible for ≥3s on the end card
- [ ] 18+ and GambleAware present
- [ ] AI-generated label applied on every platform
- [ ] Advertiser permit in place before any paid spend

---

## 10. Budget

| Line | Cost |
|------|------|
| Google AI Pro / Ultra (1 month, Veo 3.1 via Flow) | £20–£200 |
| Kling 3.0 or Runway (1 month, overflow generations) | £10–£70 |
| Midjourney or Flux (eight-character bible) | £10–£25 |
| Suno / Udio (two licensed cues — Act 1 and Act 2 differ) | £8–£25 |
| Topaz Video AI (optional, perpetual) | £0–£250 |
| DaVinci Resolve | £0 |
| **Total** | **£200–£450** |

Up from the single-act version: eight faces instead of six, seventeen shots instead of
twelve, and two music cues. Still against **£15,000–£40,000** for the equivalent
live-action shoot — pitch hire, floodlights, crew, eight actors, one day.

A 6-second vertical punchline loop alone can still be produced on a single £20 month.

---

## 11. Production order

1. **R4's character bible first.** He carries the ad. Confident face, deflated face,
   full body. If R4 isn't likeable, nothing else matters.
2. **Remaining seven characters** — four red in full detail, four blue built lighter.
3. **Look development** — one hero still of the cage. Iterate until it's right; it
   becomes the style reference for all 17 shots.
4. **Screen recordings** — S1–S9 against the demo seed, R4's Coventry pick first.
   Cheap, fast, and they set the timing the AI shots must cut against. Check the demo
   seed can produce a −1.00 leg and a rising leaderboard before you shoot.
5. **Shot 9 (the treatment) next.** It is the hardest shot in the film and the one the
   whole concept rests on. If three genuine simultaneous reactions can't be generated to
   standard, the comedy needs rethinking before any more spend.
6. **Shots 7 and 8 (the sky and the fence).** Second-hardest, and the punchline.
7. **Remaining AI shots**, batched by shot size, frame-chained.
8. **Assembly, grade, sound, end card.** Guard the silence at 0:22 in every review pass.
9. **Compliance pre-flight** (§9) before any export goes near a platform.

---

## 12. Open items

| Item | Owner | Status |
|------|-------|--------|
| R4's exact pick — Coventry 5/1 vs Man Utd to win | — | §4 recommends Coventry: greedier read, lower under-18 exposure |
| Whether the demo seed can show a rising leaderboard and a −1.00 leg | — | Verify before shooting S6 and S9 |
| Which generator wins shot 9 (Veo vs Kling vs Runway) | — | Decide after step 5 |
| VO *"Five to one."* or silent | — | Open — silent is funnier and safer |
| Whether the S9 leaderboard reorder needs a UI counting animation | — | Check what the app does today; cut before/after if not |
| Campaign line: Territory A vs *"Whose leg lost the acca?"* | — | Test both as paid variants |
| Whether the 9:16 cutdown needs its own native generations | — | Assume yes; budget for it |

---

## Related docs

- [BRAND.md](./BRAND.md) — palette, logo, typography (locked)
- [MARKETING_BRIEF.md](./MARKETING_BRIEF.md) — positioning, taglines, voice
- [marketing-posts/README.md](../marketing-posts/README.md) — demo seed and UI capture workflow
