# Tiki Acca — AI video ad production brief

> **Concept:** "The Rondo." A floodlit tiki-taka passing move where every pass is a
> member submitting their leg to the Tiki Acca app. Produced entirely with generative
> AI video plus real screen recordings — no live-action shoot, no crew, no budget.

| Field | Value |
|-------|-------|
| **Status** | Draft brief — approved for production, not yet shot |
| **Date** | September 2026 |
| **Deliverables** | 30s hero cut (16:9), 15s cutdown (9:16), 6s loop (1:1 and 9:16) |
| **Constraints** | Floodlight palette + Triangle rondo logo are **locked** ([BRAND.md](./BRAND.md)). Positioning and voice per [MARKETING_BRIEF.md](./MARKETING_BRIEF.md). |
| **Compliance** | UK CAP Code gambling rules apply — see [§8](#8-compliance-non-negotiable) before generating a single frame |
| **Budget** | £150–£400 all-in |

---

## 1. The core idea

The brand name is a tiki-taka pun and the logo is a rondo: three players passing,
one in the middle. The ad makes that literal.

Six mates play a one-touch passing move on a floodlit pitch. **Every pass cuts to a
thumb tapping "Submit leg" in the real app.** The pass and the tap are the same
action. The move builds, the odds build, the acca locks, the ball hits the net.

The rhythm *is* the product: one touch each, no hiding, keep it moving.

### The structural rule

**AI generates the football. The real app generates the app.**

| Source | Covers | How |
|--------|--------|-----|
| **AI video** | Pitch, players, passes, celebration, floodlights | Veo / Kling / Runway (§4) |
| **Real screen recordings** | Every "submitting a leg" beat | iOS screen recording on a real build (§6) |

Never generate the UI. [MARKETING_BRIEF.md](./MARKETING_BRIEF.md) already sets this rule —
*"the real UI is the best marketing asset; never illustrate what can be screenshotted."*
It also happens to solve the unsolvable production problem: nobody plays 11-a-side
holding a phone. The **cut** carries the metaphor, so the phone never has to be on the pitch.

---

## 2. Setting — floodlit amateur pitch (decided)

**Full-size 11-a-side municipal pitch at night, under four floodlight pylons.**
Not a professional stadium. Five reasons:

1. **Brand fit.** "Mates first, not a tipster." A pro stadium reads broadcaster or
   bookmaker — the two things Tiki Acca explicitly is not.
2. **The joke only works here.** Tiki-taka is elite Barcelona football. Performed by
   six blokes on a wet council pitch it is funny, warm and self-aware. Performed in a
   stadium it is just football, and the gag evaporates.
3. **Compliance.** Stadium imagery pulls toward real clubs, real kits and real
   competitions — straight into CAP "strong appeal to under-18s" territory (§8).
4. **AI hit rate.** Crowds are where generative video fails hardest: repeating faces,
   melting hands, smeared stands. An empty amateur pitch has nothing to break. Expect
   roughly double the usable-clip rate versus a stadium prompt.
5. **The palette is already this.** Floodlight — `#091422` navy dark, `#38bdf8` sky
   accent — *is* a night pitch under cold metal-halide lamps. The set dresses itself.

### Locked art direction

| Element | Spec |
|---------|------|
| Time | Night, fully dark beyond the light pools |
| Light | 4 pylons, cold blue-white (~5600K), hard top-down key, long wet shadows |
| Weather | Just rained — wet grass, standing surface water, breath visible, light mist in the beams |
| Ground | Full 11-a-side markings, worn centre circle, slightly patchy grass, low rail or chain fence |
| Background | Dark treeline, a portakabin changing block, a handful of parked cars. **No stands. No crowd.** |
| Camera | Low, close, handheld-adjacent. 35mm and 50mm looks. Shallow depth. Slight lens flare off the pylons |
| Grade | Push navy in the shadows toward `#091422`; let floodlight spill sit near `#7dd3fc` |

---

## 3. Cast and wardrobe

### Cast — six heroes

Six recurring faces, not eleven. Eleven consistent AI identities is a budget sink and
a drift nightmare. Six carry every pass; remaining players appear only in wide shots,
backs to camera, or out of focus. The pitch is 11-a-side; the *cast* is six.

Aim for a recognisable friend group: mixed build, mixed ethnicity, at least two women,
one visibly the least athletic of the group (he gets the celebration reaction shot).

**Ages: 27–30.** Prompt them as **"late twenties, clearly adult"** with explicit
maturity markers — stubble, laugh lines, a receding hairline, a beard with grey in it.
Generative models render faces younger than prompted, routinely by 4–6 years, and the
CAP Code bars anyone who **is or seems** under 25 (§8). Treat 27–30 as the target
*render*, which means prompting at the top of that range and rejecting hard.

### Wardrobe

| Team | Kit | Notes |
|------|-----|-------|
| **Ours (hero)** | **Deep red / claret**, plain, no sponsor, no badge | Target ~`#7f1d1d`–`#991b1b` |
| Opposition | **Pale powder blue**, plain, no sponsor, no badge | Target ~`#93c5fd` |

Plain modern amateur kit — solid colour, simple collar, plain white or black shorts,
mismatched boots, one player in a long-sleeve base layer. **No club badges, no
sponsor logos, no real kit designs, no numbers over 11.**

> **Brand note — flagged, and proceeding as directed.** Red is a semantic colour in
> this product: `#f87171` means a lost leg. Putting the hero team in red sits against
> that system, and powder blue on the opposition sits near the brand accent. Two
> mitigations are baked into the specs above and should be held to: (a) the hero kit is
> a **deep claret**, visibly darker and browner than the danger red, never the bright
> `#f87171` tone; (b) **sky blue stays the app's**, carried by the floodlights, the UI
> and the grade, so `#38bdf8` still reads as Tiki Acca on screen even while blue is on
> the opposition's backs. The opposition are barely featured — they chase, they never
> hold the ball — so the association stays weak.

---

## 4. Tool stack

| Role | Tool | Why |
|------|------|-----|
| **Primary generator** | **Google Veo 3.1** (via Google Flow) | Strongest photorealism and prompt adherence; native 4K landscape *and* portrait; native audio gives usable temp crowd/boot sound |
| **Volume + motion** | **Kling 3.0** | Best value per generation; strongest on ball physics, fabric, hair, water spray. Multi-shot storyboard mode holds a look across cuts |
| **Control shots** | **Runway Gen-4.5** | Motion brush and explicit camera control for the tracking and orbit shots; best reference-driven identity hold |
| **Character bible (stills)** | **Midjourney** or **Flux** | Generate the six reference faces *before* any video |
| **Upscale / cleanup** | **Topaz Video AI** | Rescue soft or low-res generations |
| **Music** | **Suno** or **Udio** | Owned licence — do not use library music in paid media |
| **VO (optional)** | **ElevenLabs** | Only if the closing line is read rather than typeset |
| **Edit + grade** | **DaVinci Resolve** (free) | Resolve's colour tools pull everything to Floodlight |

Reasonable minimum: one month of Google AI Pro/Ultra plus one Kling or Runway tier.
Add Runway only if the tracking shots refuse to come out of Veo.

---

## 5. Shot list — AI generated

Twelve clips, 4–7s each. Generate every one **image-to-video** from a locked reference
still. Numbering is edit order.

| # | Shot | Duration | Description |
|---|------|----------|-------------|
| 1 | **Floodlights** | 2s | Low angle. Pylon lamps snap on in sequence, four banks, ballast flicker, mist catching in the beams. Dark sky behind |
| 2 | **Establisher** | 3s | Wide, low, from behind the goal. Empty wet pitch, six players in red scattered across the centre circle, breath steaming |
| 3 | **Pass 1 — the start** | 4s | Close on boots. Player A receives, one touch, side-foots it away. Water sprays off the strike |
| 4 | **Pass 2 — the turn** | 4s | Mid shot, camera orbits right. Player B takes it on the half-turn, first time, away from an onrushing blue shirt |
| 5 | **Pass 3 — the flick** | 3s | Tight. Player C, outside-of-the-boot flick, doesn't look up |
| 6 | **Pass 4 — the rondo** | 5s | The hero shot. Overhead-ish 3/4 crane. Three red shirts triangle around one blue shirt in the middle, ball zipping between them. **This is the logo, alive** |
| 7 | **Pass 5 — the slide** | 4s | Low tracking dolly at grass height, following the ball through the passing lane, blue shirt slides in and misses behind it |
| 8 | **Reaction** | 2s | Mid. Player E waiting on the edge of the box, checks his shoulder, calls for it, breath steaming |
| 9 | **The strike** | 3s | Slow motion. Player F meets it first time. Boot, ball, spray |
| 10 | **The net** | 2s | Behind the goal. Ball hits the net, rain shakes off the mesh |
| 11 | **The pile-on** | 4s | Handheld. Six players collapse into each other, genuine laughing, the least athletic one arriving last |
| 12 | **Six phones** | 4s | Wide, from above. The group scattered on the grass on their backs, six phone screens glowing sky-blue in the dark |

### Prompt template

Reuse this skeleton for every shot — only the action line changes:

```
Photorealistic 35mm cinematic footage. Night. A full-size amateur 11-a-side football
pitch under four tall floodlight pylons, cold blue-white light, heavy mist in the
beams, wet grass with standing water, dark treeline beyond, no stands and no crowd.

[ACTION LINE]

Players are [N] adults in their late twenties, clearly adult faces with stubble and
laugh lines, plain deep claret-red football kits with no badges or sponsors; opposing
players in plain pale blue. Shallow depth of field, lens flare off the floodlights,
visible breath, handheld camera feel, dark navy shadows. No text, no logos, no
on-screen graphics.
```

Always append the negative direction: `no crowd, no stadium, no club badges, no
sponsor logos, no text overlays, no young faces, no teenagers`.

### Consistency method

1. **Build the character bible first.** Six characters × 3 stills each (face, 3/4,
   full body) in final kit. Lock these before any video generation.
2. **Frame-chain.** Generate a shot, export a clean final frame, feed that frame as the
   reference image for the next shot. This is the standard fix for identity drift.
3. **Batch by shot size.** All close-ups, then all mid shots, then all wides. Switching
   distance mid-session is where faces wander.
4. **Budget a 10:1 reject ratio.** 12 usable clips means expect 100–150 generations.
   Hands, boots striking the ball, and faces at distance are the common failures.

---

## 6. Shot list — real screen recordings

Capture on a real device against the seeded demo data. Do **not** generate or mock these.

> Setup: `npm run marketing:seed` then `npm run dev` — see
> [marketing-posts/README.md](../marketing-posts/README.md). The demo seed only touches
> `@demo.tikiacca.com` users and the `DEMO24` group. Never point local `DATABASE_URL`
> at production.

| # | Beat | Capture |
|---|------|---------|
| S1 | Thumb taps **Submit your leg** | Close on the device, real thumb, screen at full brightness in a dark room |
| S2 | **Submitting…** → **Submitted** | The state flip. Slow it 50% in the edit |
| S3 | Member list filling | Avatars flipping from waiting to submitted, one at a time |
| S4 | **Combined odds** counting up | The odds badge as each leg lands — the "build" of the move |
| S5 | **Acca locked** | The lock moment. This is shot 9's cut point |
| S6 | Six phones, group view | Locked round card with all six legs in — matches AI shot 12 |

Shoot S1–S5 **in a dark room** so the screen glow matches the floodlit night grade and
the cuts don't jar.

---

## 7. The edit

### 30-second hero cut

| Time | Picture | Sound |
|------|---------|-------|
| 0:00 | **1** Floodlights snap on | Ballast hum, a distant shout |
| 0:02 | **2** Establisher | Boots on wet grass |
| 0:05 | **3** Pass 1 → **S1** thumb taps Submit | Ball strike lands *on* the tap |
| 0:08 | **4** Pass 2 → **S2** Submitted | Music enters |
| 0:11 | **5** Pass 3 → **S4** odds tick up | Tempo lifts |
| 0:14 | **6** The rondo → **S3** avatars filling | Fastest section |
| 0:18 | **7** The slide → **S4** odds again, higher | |
| 0:21 | **8** Reaction beat | Music drops out. One breath |
| 0:23 | **9** The strike → **S5 ACCA LOCKED** | Hard cut on the strike |
| 0:25 | **10** The net | Music returns, full |
| 0:26 | **11** The pile-on | Laughing |
| 0:28 | **12** Six phones glowing | Music settles |
| 0:29 | End card | |

**The one rule that makes this work:** each pass-to-tap cut comes faster than the last.
Shot 3 holds four seconds; by shot 6 the cuts are under a second. The edit accelerates
into the lock, then stops dead for the reaction beat at 0:21. That silence is what
makes the strike land.

### End card

> **Your mates. One acca. Every leg counts.**
>
> Triangle rondo + wordmark · `tikiacca.com`
>
> *We're not a bookmaker. You bet with licensed UK bookmakers — we keep the score. 18+. GambleAware.*

Headline is the locked homepage line from [MARKETING_BRIEF.md](./MARKETING_BRIEF.md).
For paid campaign variants, test the Territory D line — *"Think you know football? Prove it."*

### Cutdowns

- **15s (9:16):** shots 1, 5, 6, 9, 10, 12 + S1, S4, S5. Generate the verticals natively
  in portrait — do not crop the 16:9.
- **6s loop (1:1):** shot 6 (the rondo) + S4 + end card. This is the logo in motion and
  the strongest single asset for paid social.

---

## 8. Compliance (non-negotiable)

UK gambling advertising rules govern this ad. Get these wrong and it gets pulled.

| Rule | What it means here |
|------|--------------------|
| **CAP 16.3.14 — under-25s** | Nobody who **is or seems** under 25 may play a significant role. AI renders young: prompt "late twenties" with explicit maturity markers and **bin any generation where a face could read as 22**. When in doubt, cut it |
| **Strong appeal to under-18s** | No real footballers, no lookalikes, no Premier League or top-European club references. The ASA has ruled against ads featuring current top-flight players on social. Amateur pitch + invented kit is the safe territory — a second reason for §2 |
| **Trademark** | No club badges, no sponsor logos, no real kit designs, no competition trophies or branding |
| **ASA monitoring** | The ASA began active monitoring of gambling ads on social media in June 2026. Assume scrutiny |
| **Not a bookmaker** | The trust line stays in the cut: *not a bookmaker, 18+, GambleAware*. Same wording as the homepage trust strip |
| **Platform rules** | Meta and TikTok both require a gambling advertiser permit **and** age-gating before this can run as paid media |
| **AI disclosure** | Meta and TikTok require AI-generated content to be labelled. Declare it — this is a disclosure obligation, not a nicety |

### Pre-flight checklist

- [ ] Every visible face reads unambiguously 25+
- [ ] No badge, sponsor mark or real kit design anywhere in frame
- [ ] No real player likeness
- [ ] Trust line legible for ≥3s on the end card
- [ ] 18+ and GambleAware present
- [ ] AI-generated label applied on every platform
- [ ] Advertiser permit in place before any paid spend

---

## 9. Budget

| Line | Cost |
|------|------|
| Google AI Pro / Ultra (1 month, Veo 3.1 via Flow) | £20–£200 |
| Kling 3.0 or Runway (1 month, overflow generations) | £10–£70 |
| Midjourney or Flux (character bible) | £10–£25 |
| Suno / Udio (licensed track) | £8–£25 |
| Topaz Video AI (optional, perpetual) | £0–£250 |
| DaVinci Resolve | £0 |
| **Total** | **£150–£400** |

Comparable live-action shoot — pitch hire, floodlights, crew, six actors, one day:
**£15,000–£40,000**.

A 6-second vertical loop alone can be produced on a single £20 month.

---

## 10. Production order

1. **Character bible** — six characters, 18 stills, kit locked. Nothing else starts first.
2. **Look development** — one hero still of the pitch. Iterate until it's right; it
   becomes the style reference for all 12 shots.
3. **Screen recordings** — S1–S6 captured against the demo seed. Cheap, fast, and they
   set the timing the AI shots must cut against.
4. **Shot 6 first** — the rondo is the hardest and the most important. If it can't be
   generated to standard, the concept needs rethinking before any more spend.
5. **Remaining AI shots**, batched by shot size, frame-chained.
6. **Assembly, grade, sound, end card.**
7. **Compliance pre-flight** (§8) before any export goes near a platform.

---

## 11. Open items

| Item | Owner | Status |
|------|-------|--------|
| Which generator wins the rondo shot (Veo vs Kling vs Runway) | — | Decide after step 4 |
| VO or typeset end card | — | Open — typeset is cheaper and safer for compliance |
| Campaign line: Territory A (locked homepage) vs Territory D ("Prove it") | — | Test both as paid variants |
| Whether the 9:16 cutdown needs its own native generations | — | Assume yes; budget for it |

---

## Related docs

- [BRAND.md](./BRAND.md) — palette, logo, typography (locked)
- [MARKETING_BRIEF.md](./MARKETING_BRIEF.md) — positioning, taglines, voice
- [marketing-posts/README.md](../marketing-posts/README.md) — demo seed and UI capture workflow
