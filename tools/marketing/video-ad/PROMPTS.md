# "The Cage" — prompt pack

Ready-to-paste prompts for the AI video ad in
[`docs/VIDEO_AD_BRIEF.md`](../../../docs/VIDEO_AD_BRIEF.md). The brief is the source of
truth for story, timing and compliance; this file is only the words you type into the
tools. Names match `scenario.json`.

**Nothing here is generated until CAP Copy Advice has replied** (brief §11 step 1).

Order of use: character stills (§1) → look-dev still (§2) → shot first frames (§3) →
image-to-video motion prompts (§4) → Act-Two driving videos for shots 9–10 (§5).

---

## 1. Character bible — stills (Midjourney / Flux)

Generate three stills per red player (face, 3/4, full body), one headshot + one full
body per blue player. Kev gets two extra expressions. **Reject any face that could
read as under 25** (CAP 16.3.14) — models render 4–6 years young, so prompt old.

### Shared suffix (append to every character prompt)

```
photorealistic portrait photograph, 50mm lens, night, lit by a single cold blue-white
floodlight from above, wet hair, visible breath, dark navy background, shallow depth of
field, natural skin texture with pores, no retouching, clearly adult, late twenties to
early thirties. No text, no logos, no badges, no sponsor marks.
```

Wardrobe insert — red: `wearing a plain deep claret-red mesh training bib over a plain
dark long-sleeve top`. Blue: `wearing a plain pale powder-blue mesh training bib over a
plain dark top`.

### Characters

| Key | Prompt (then wardrobe insert + shared suffix) |
|-----|-----|
| `kev` — **build first** | `A 30-year-old white British man, stocky build, short messy brown hair starting to recede at the temples, three-day stubble, crow's feet, broad friendly face, cheeky grin — the likeable mate who always goes for the hero shot` |
| `kev` confident | same + `chin up, eyes narrowed, visibly pleased with himself, about to do something ambitious` |
| `kev` deflated | same + `hands raised in apology, sheepish half-grin, eyebrows up, embarrassed but good-natured` |
| `rob` | `A 30-year-old white British man, tall and lean, neat short dark hair, trimmed beard with a few grey hairs, calm steady expression — the organiser of the group` |
| `jay` | `A 29-year-old Black British man of Ghanaian heritage, athletic build, short twists, neat moustache and stubble, laugh lines, wide mischievous grin — the show-off who enjoys himself too much` |
| `nadia` | `A 29-year-old British Punjabi woman, athletic, dark hair tied back tightly, faint lines at the eyes, composed, completely unimpressed expression — quietly the best player on the pitch` |
| `tom` | `A 30-year-old white British man, average build, ginger hair, short ginger beard, freckles, easy-going expression` |
| `aisha` | `A 29-year-old British Bangladeshi woman, slim athletic build, dark hair in a low bun, focused expression, faint laugh lines` |
| `callum` | `A 30-year-old white Scottish man, wiry, shaved head, dark stubble, weathered face, alert expression` |
| `femi` | `A 30-year-old Black British man of Nigerian heritage, tall powerful build, close-cropped hair, full beard, confident relaxed expression` |

Export one square headshot per character to `tools/marketing/video-ad/avatars/<key>.png`
(see that folder's README) — the same face appears on the betslip.

---

## 2. Look-dev still — the cage

Iterate this one image until it's right; it's the style reference for every shot.

```
Photorealistic 35mm cinematic still. Night. A caged 5-a-side astroturf football pitch
seen through a four-metre chain-link fence, green artificial grass with sand infill,
wet surface with a sheen and standing water in the corners. Four floodlights mounted on
the cage frame casting hard cold blue-white 5600K light from above, mist hanging in the
beams, long shadows of the mesh across the pitch. Small recessed goals. Total darkness
beyond the fence: a portakabin, two parked cars and a distant treeline barely visible.
No stands, no crowd, no signage. Shadows pushed toward deep navy, floodlight spill pale
icy blue. Shallow depth of field, subtle lens flare. No text, no logos.
```

---

## 3. Shot first frames (stills)

Make each shot's opening frame as a still first, using the character and look-dev
stills as references, then animate it (§4). Use the brief's full prompt template
(§6 "Prompt template") with these action lines:

| # | First-frame action line |
|---|------|
| 1 | `Low angle through the mesh looking up at a floodlight tower, lights off, mist in the dark` |
| 2 | `Wide through the fence: eight players, four in claret bibs and four in powder-blue bibs, spread across the pitch, breath steaming` |
| 3 | `Close on boots on wet astro, a ball rolling in toward the right boot, spray lifting off the surface` |
| 4 | `Mid shot: Jay in a claret bib dribbling toward a powder-blue defender whose legs are apart` |
| 5 | `Tight shot: Nadia in a claret bib, ball at her feet, head already turned away from where she's about to pass` |
| 6 | `Kev in a claret bib receiving the ball on the edge of the box, setting himself, confident. In the same frame, Rob in a claret bib stands completely unmarked two metres away, both arms raised, calling for it` |
| 7 | `Kev leaning back with his right leg swinging through the ball, body shape completely wrong, ball starting to rise` |
| 8 | `Low wide shot from inside the cage looking up at the fence and floodlights, a football high in the air rising toward the top of the fence` |
| 9 | `Three players in claret bibs turned toward camera-left: Rob hands on head, Jay doubled over laughing, Nadia mid slow-clap, deadpan` |
| 10 | `Close on Kev in a claret bib, hands raised in apology, sheepish half-grin` |
| 11 | `A goalkeeper in a dark top seen from behind, rolling the ball out along wet astro to a powder-blue bib` |
| 12 | `Surface-level view along wet astro, a ball skimming toward camera between two powder-blue players` |
| 13 | `Mid shot: two powder-blue players exchanging a quick pass around a claret defender` |
| 14 | `Three powder-blue players in a triangle around one claret player, ball between them` |
| 15 | `Femi in a powder-blue bib striking the ball first time, low, keeper diving the wrong way` |
| 16 | `Inside a small goal looking out, net mesh in the foreground, water droplets on the net` |
| 17 | `Four powder-blue players colliding into a laughing group hug on wet astro` |

Always append: `no crowd, no stadium, no club badges, no sponsor logos, no text
overlays, no young faces, no teenagers`.

---

## 4. Image-to-video motion prompts

The still already carries the look, so **describe only motion and camera** —
re-describing the scene tends to make the output drift. This is the Runway style; for
Veo/Kling paste the brief's full template with the same action line instead.

| # | Tool | Motion prompt |
|---|------|------|
| 1 | Veo | `The floodlights snap on one after another with a ballast flicker, mist glowing in the beams. Static camera.` |
| 2 | Veo | `Players jog into position, breath steaming. Slow push-in through the fence.` |
| 3 | Veo / Kling | `The player kills the ball dead with one touch and side-foots it out of frame right. Water sprays off the surface. Static low camera.` |
| 4 | Runway | `Jay slips the ball through the defender's legs, runs past him and grins. Camera tracks right at hip height.` |
| 5 | Kling | `Nadia flicks the ball away with the outside of her boot without looking. Her expression doesn't change. Static tight shot.` |
| 6 | Veo | `Kev controls the ball and sets himself, pleased with himself. Rob waves both arms, shouting for the pass. Kev ignores him. Slow push-in.` |
| 7 | Runway | `Slow motion. Kev leans back and swings through the ball with terrible technique; the ball flies steeply upward out of the top of frame. Camera static, low.` |
| 8 | Runway — camera control | `The ball rises in a steep arc, clears the top of the fence and the floodlight, and disappears into the black sky. Camera tilts up slowly to follow, then holds on empty dark sky.` |
| 9 | **Runway Act-Two** (§5) | three separate close-ups — see §5 |
| 10 | **Runway Act-Two** (§5) | see §5 |
| 11 | Kling | `The keeper rolls the ball out along the wet surface to a teammate. Static camera from behind.` |
| 12 | Runway — camera control | `The ball skims along the surface between players. Camera dollies forward at ground level following the ball, fast.` |
| 13 | Kling | `Quick one-two pass around the defender, one touch each. Camera pans with the ball.` |
| 14 | Kling | `The three players pass the ball quickly around the triangle, then one plays it through out of frame. Static overhead-ish angle.` |
| 15 | Veo | `Slow motion. Femi strikes the ball first time, low across the keeper into the corner.` |
| 16 | Kling | `The ball hits the back of the net; the mesh bulges and water shakes off. Static.` |
| 17 | Veo | `The four players pile into each other laughing, celebrating the goal. Handheld camera.` |

For every clip: export a clean final frame and use it as the next clip's first frame
(brief §6 "Consistency method"). Draft with the fast/turbo model; re-run the keeper
at full quality.

---

## 5. Act-Two driving videos — shots 9 and 10

Act-Two transfers a real person's filmed performance onto a character still. It
replaces "generate three simultaneous genuine reactions" (the brief's riskiest shot)
with three single-character close-ups cut together, driven by real people.

**Shoot on any phone, one performer per clip:**

- Framed chest-up, face fully visible, even light, plain background, phone on a tripod
  or propped — **no camera movement** (add handheld shake in the edit).
- 5–6 seconds each. Look slightly camera-left, as if at Kev.
- Real reactions beat acted ones: show the performer the actual skied shot (any
  5-a-side fail clip) and film them watching it.

| Clip | Character still | Performance |
|------|-----------------|-------------|
| 9a | `rob` | Watches it go, both hands slowly onto head, exhales |
| 9b | `jay` | Starts laughing, can't stop, doubles over |
| 9c | `nadia` | Deadpan. Slow clap, three claps, eyes never leave Kev |
| 10 | `kev` deflated | Hands up, sheepish half-grin, mouths "sorry" |

Edit: 9a → 9b → 9c at ~1.3s each, then 10. Laughter from 9b carries across the cuts.
