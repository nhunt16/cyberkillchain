# Color Palette · Cyber Kill Chain

The whole site runs off a tight, deliberately-restricted dark palette
defined as CSS custom properties at the top of
[`static/css/style.css`](static/css/style.css). Every screen — home,
lessons, quiz challenges, results — pulls from these tokens. This
document maps each color to the role you asked about (base, accent,
dark grey, light grey, white) and shows where each one actually shows
up across the four screen types.

> Swatches throughout this document are tiny PNGs in
> [`docs/swatches/`](docs/swatches) — they render inline in any
> markdown viewer (Cursor preview, GitHub, VSCode, etc.) without
> needing a network connection.

---

## TL;DR · The five roles

| Swatch | Role | Hex | Token | Used for |
| :---: | --- | --- | --- | --- |
| <img src="docs/swatches/bg-primary.png" width="28" alt=""> | **Base** | `#06060b` | `--bg-primary` | The page itself. Near-black, slightly blue-shifted. |
| <img src="docs/swatches/accent-gradient.png" width="96" alt=""> | **Accent** | `#00c8ff` → `#7c5cfc` | `--accent` + `--accent-purple` (`--accent-gradient`) | The single brand color. Used only on the things you should look at or click. |
| <img src="docs/swatches/bg-card.png" width="28" alt=""> <img src="docs/swatches/bg-elevated.png" width="28" alt=""> | **Dark grey** | `#16161f` / `#1c1c28` | `--bg-card` / `--bg-elevated` | Card surfaces that sit one or two levels above the base. The "I'm a panel" color. |
| <img src="docs/swatches/text-secondary.png" width="28" alt=""> | **Light grey** | `#7e7e8f` | `--text-secondary` | Body copy, subtitles, secondary info. Most words on screen are this color. |
| <img src="docs/swatches/text-primary.png" width="28" alt=""> | **White** | `#ededf0` | `--text-primary` | Titles, key numbers, the things the eye should land on first. |

Plus three semantic accents that only show up when the UI needs to
say something has succeeded, failed, or warrants caution:

| Swatch | Role | Hex | Token | Meaning |
| :---: | --- | --- | --- | --- |
| <img src="docs/swatches/success.png" width="28" alt=""> | **Success** | `#00e676` | `--success` | "Viable", "Defended", correct quiz pick, completed step. |
| <img src="docs/swatches/danger.png" width="28" alt=""> | **Danger** | `#ff4757` | `--danger` | "Burned", "Breached", incorrect quiz pick, alert breach dot. |
| <img src="docs/swatches/warning.png" width="28" alt=""> | **Warning** | `#ffb84d` | `--warning` | Mid-state — partially-defended results, terminal warn lines. |

---

## The full token list (all 17 swatches)

| Swatch | Token | Value | Role |
| :---: | --- | --- | --- |
| <img src="docs/swatches/bg-primary.png" width="28" alt="">     | `--bg-primary`       | `#06060b`                                    | The page background — true base.                          |
| <img src="docs/swatches/bg-secondary.png" width="28" alt="">   | `--bg-secondary`     | `#0c0c14`                                    | Slightly lighter base for a few section bands.            |
| <img src="docs/swatches/bg-surface.png" width="28" alt="">     | `--bg-surface`       | `#111119`                                    | First card-tier surface (lesson scenes, quiz dropzones).  |
| <img src="docs/swatches/bg-card.png" width="28" alt="">        | `--bg-card`          | `#16161f`                                    | Standard card surface (chain nodes, profile cards).       |
| <img src="docs/swatches/bg-elevated.png" width="28" alt="">    | `--bg-elevated`      | `#1c1c28`                                    | Top-tier elevated surface (mascot panel, lesson nav bar). |
| <img src="docs/swatches/text-primary.png" width="28" alt="">   | `--text-primary`     | `#ededf0`                                    | Off-white for titles, headings, score numbers.            |
| <img src="docs/swatches/text-secondary.png" width="28" alt=""> | `--text-secondary`   | `#7e7e8f`                                    | Light grey for body copy, descriptions, subtitles.        |
| <img src="docs/swatches/text-tertiary.png" width="28" alt="">  | `--text-tertiary`    | `#53535f`                                    | Mid-dark grey for labels, kickers, footer text.           |
| <img src="docs/swatches/border.png" width="28" alt="">         | `--border`           | `rgba(255,255,255,0.06)`                     | Hairline divider on cards (rendered on the base bg).      |
| <img src="docs/swatches/border-hover.png" width="28" alt="">   | `--border-hover`     | `rgba(255,255,255,0.12)`                     | Slightly stronger hairline on hover.                      |
| <img src="docs/swatches/accent.png" width="28" alt="">         | `--accent`           | `#00c8ff`                                    | Primary accent (cyan).                                    |
| <img src="docs/swatches/accent-purple.png" width="28" alt="">  | `--accent-purple`    | `#7c5cfc`                                    | Secondary accent (electric purple).                       |
| <img src="docs/swatches/accent-gradient.png" width="96" alt="">| `--accent-gradient`  | `linear-gradient(135deg, #00c8ff → #7c5cfc)` | Brand gradient for the most important CTAs + numbers.     |
| <img src="docs/swatches/accent-dim.png" width="28" alt="">     | `--accent-dim`       | `rgba(0,200,255,0.15)`                       | Washed cyan used for soft button fills + glow halos.      |
| <img src="docs/swatches/success.png" width="28" alt="">        | `--success`          | `#00e676`                                    | Semantic green for correct / viable / defended.           |
| <img src="docs/swatches/danger.png" width="28" alt="">         | `--danger`           | `#ff4757`                                    | Semantic red for incorrect / burned / breached / alert.   |
| <img src="docs/swatches/warning.png" width="28" alt="">        | `--warning`          | `#ffb84d`                                    | Semantic amber for partial states + terminal `WARN` lines.|

Why two greys? Because three text tones (white → light grey → dark
grey) lets the eye rank importance without ever needing to bump
font-weight or font-size: titles, descriptions, and labels can all
share the same typographic scale and still read in a clear hierarchy.

---

## Where each color shows up · screen-by-screen

### 1. Home screen (`/`)

The home screen is essentially "all base, with one cyan thing". The
restraint is the point — there's exactly one place to click.

| Element                                         | Color used                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| Page background                                 | <img src="docs/swatches/bg-primary.png" width="20" alt=""> **Base** plus the animated `world.png`-derived canvas |
| Faint grid overlay & glow halos                 | <img src="docs/swatches/accent.png" width="20" alt=""> **Accent** at very low alpha (`rgba(0,200,255,0.04–0.12)`) |
| `Cybersecurity Fundamentals` badge pill         | <img src="docs/swatches/text-secondary.png" width="20" alt=""> **Light grey** text on a 1px white-alpha border |
| `The Cyber Kill Chain` title                    | <img src="docs/swatches/text-primary.png" width="20" alt=""> **White** (`--text-primary`) |
| Subtitle ("Understand the five phases…")        | <img src="docs/swatches/text-secondary.png" width="20" alt=""> **Light grey** |
| `Begin Learning →` CTA button                   | <img src="docs/swatches/accent-gradient.png" width="64" alt=""> **Accent gradient** background, **base** text on it |
| Lesson + challenge count meta line              | <img src="docs/swatches/text-tertiary.png" width="20" alt=""> **Dark grey** |
| Footer credit                                   | <img src="docs/swatches/text-tertiary.png" width="20" alt=""> **Dark grey** |

Result: one cyan-purple gradient button surrounded by grey informational
copy on a near-black field.

---

### 2. Lesson screens (`/learn/<n>`)

Lessons are the most surface-heavy screens — every phase has its own
mini scene (terminal, email, file picker, etc.) — so you'll see the
greys do most of the work, with accent reserved for current state and
interactive primitives.

| Element                                              | Color used                                                                 |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| Page background                                      | <img src="docs/swatches/bg-primary.png" width="20" alt=""> **Base** |
| Lesson stepper · current dot                         | <img src="docs/swatches/accent-gradient.png" width="64" alt=""> **Accent gradient** with a cyan glow ring |
| Lesson stepper · past dots                           | <img src="docs/swatches/success.png" width="20" alt=""> **Success** ✓ |
| Lesson stepper · future dots                         | <img src="docs/swatches/text-tertiary.png" width="20" alt=""> **Dark grey** outline |
| Mascot narrator card                                 | <img src="docs/swatches/bg-elevated.png" width="20" alt=""> **Elevated dark grey** with cyan/purple gradient glow |
| Scene cards (recon panel, email mockup, terminal…)   | <img src="docs/swatches/bg-card.png" width="20" alt=""> <img src="docs/swatches/bg-surface.png" width="20" alt=""> **Dark grey** surfaces (`--bg-card`, `--bg-surface`) |
| Section title (e.g. *Phase 1 · Reconnaissance*)      | <img src="docs/swatches/text-primary.png" width="20" alt=""> **White** |
| Section subtitle / body paragraphs                   | <img src="docs/swatches/text-secondary.png" width="20" alt=""> **Light grey** |
| `LinkedIn Harvesting`-style kickers + chip labels    | <img src="docs/swatches/text-tertiary.png" width="20" alt=""> **Dark grey** + <img src="docs/swatches/accent.png" width="20" alt=""> **Accent** for the active one |
| Buttons (`Start Scan`, `Run Step`)                   | <img src="docs/swatches/accent.png" width="20" alt=""> **Accent** outline on idle → <img src="docs/swatches/accent-gradient.png" width="64" alt=""> **Accent gradient** filled on primary action |
| Terminal output                                      | <img src="docs/swatches/text-secondary.png" width="20" alt=""> body, <img src="docs/swatches/success.png" width="20" alt=""> green prompt, <img src="docs/swatches/warning.png" width="20" alt=""> amber for warns, <img src="docs/swatches/danger.png" width="20" alt=""> red for errors |
| Lesson nav arrows (`Previous` / `Next Lesson →`)     | Ghost: **Light grey** text on transparent · Primary: <img src="docs/swatches/accent-gradient.png" width="64" alt=""> **Accent gradient** |

The pattern: every scene's frame is grey-on-grey, every state-change
(*scanning…*, *running…*, *complete*) gets a semantic color, and the
nav bar at the bottom is the only place the brand gradient appears.

---

### 3. Quiz screens (`/quiz/1`, `/quiz/2`)

The quiz screens deliberately push contrast harder than lessons —
everything you click is meant to feel decisive, and feedback is
instant and color-coded.

#### Challenge 1 · Plan the Breach (attacker workbench)

| Element                                          | Color used                                                   |
| ------------------------------------------------ | ------------------------------------------------------------ |
| Workbench background                             | <img src="docs/swatches/bg-primary.png" width="20" alt=""> **Base** with subtle cyan + purple corner glows |
| Terminal title bar (`root@redteam:~/ops/acme#`)  | <img src="docs/swatches/accent.png" width="20" alt=""> **Accent** for the prompt, <img src="docs/swatches/text-secondary.png" width="20" alt=""> **Light grey** for the body |
| Step pills (`TARGET → PRETEXT → …`)              | Default <img src="docs/swatches/text-tertiary.png" width="20" alt=""> **dark grey** outline, current = <img src="docs/swatches/accent-gradient.png" width="64" alt=""> **accent gradient** number on cyan-tinted pill, done = <img src="docs/swatches/success.png" width="20" alt=""> **success** check |
| Option cards (target / pretext / channel / lure / payload) | <img src="docs/swatches/bg-card.png" width="20" alt=""> **Dark grey** surface, <img src="docs/swatches/text-secondary.png" width="20" alt=""> light grey title becomes <img src="docs/swatches/text-primary.png" width="20" alt=""> **white** on hover, cyan border tint on hover |
| Selected (correct) option                        | <img src="docs/swatches/success.png" width="20" alt=""> **Success** border + soft green glow; CTA chip turns green ✓ |
| Selected (wrong) option                          | <img src="docs/swatches/danger.png" width="20" alt=""> **Danger** border + soft red glow; CTA chip turns red ✗ |
| Other options after pick                         | Faded to ~35% opacity                                        |
| `INTEL` ribbon header                            | <img src="docs/swatches/accent.png" width="20" alt=""> **Accent** badge on <img src="docs/swatches/accent-dim.png" width="20" alt=""> cyan-dim fill |
| `VIABLE` / `BURNED` verdict pill                 | <img src="docs/swatches/success.png" width="20" alt=""> / <img src="docs/swatches/danger.png" width="20" alt=""> depending on outcome |
| Intel rationale text                             | <img src="docs/swatches/text-secondary.png" width="20" alt=""> **Light grey** body |
| `Next step: …` button                            | <img src="docs/swatches/accent-gradient.png" width="64" alt=""> **Accent gradient** filled |
| **ATTACK DOSSIER** recap banner                  | Border + radial glow tinted by score: all-correct = <img src="docs/swatches/success.png" width="20" alt="">, mostly-correct = <img src="docs/swatches/warning.png" width="20" alt="">, mostly-wrong = <img src="docs/swatches/danger.png" width="20" alt=""> |
| Dossier score number (e.g. *5 / 5*)              | <img src="docs/swatches/accent-gradient.png" width="64" alt=""> **Accent gradient** (clipped to text) |

#### Challenge 2 · Defend the Network (blue-team simulation)

| Element                                  | Color used                                            |
| ---------------------------------------- | ----------------------------------------------------- |
| `INCOMING THREAT` alert badge dot        | <img src="docs/swatches/danger.png" width="20" alt=""> **Danger** (pulsing red) |
| Alert phase label                        | <img src="docs/swatches/text-secondary.png" width="20" alt=""> **Light grey** |
| Defensive option buttons                 | <img src="docs/swatches/bg-card.png" width="20" alt=""> **Dark grey** surface with subtle border hover |
| Correct pick after reveal                | <img src="docs/swatches/success.png" width="20" alt=""> **Success** border + glow |
| Incorrect pick after reveal              | <img src="docs/swatches/danger.png" width="20" alt=""> **Danger** border + glow |
| Phase-timeline node · active             | <img src="docs/swatches/accent.png" width="20" alt=""> **Accent** ring |
| Phase-timeline node · defended           | <img src="docs/swatches/success.png" width="20" alt=""> **Success** filled |
| Phase-timeline node · breached           | <img src="docs/swatches/danger.png" width="20" alt=""> **Danger** filled |
| Result emoji & summary card              | <img src="docs/swatches/text-secondary.png" width="20" alt=""> body, <img src="docs/swatches/text-primary.png" width="20" alt=""> **white** large numerals |

---

### 4. Result screen (`/quiz/result`)

The result screen reverses the quiz's hot-color density: the score
ring uses the brand gradient as a celebration moment, but the per-
challenge breakdown returns to the calm grey palette with thin
success/danger stripes.

| Element                                       | Color used                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| Score ring stroke                             | <img src="docs/swatches/accent-gradient.png" width="64" alt=""> **Accent gradient** (defined inline via SVG `<linearGradient id="scoreGradient">`) |
| `100%` score numeral                          | <img src="docs/swatches/text-primary.png" width="20" alt=""> **White** |
| `Outstanding!` / `Great Work!` etc. title     | <img src="docs/swatches/text-primary.png" width="20" alt=""> **White** |
| Sub-line ("You got X out of Y…")              | <img src="docs/swatches/text-secondary.png" width="20" alt=""> **Light grey**, with bolded numerals in <img src="docs/swatches/text-primary.png" width="20" alt=""> **white** |
| `Review Lessons` ghost button                 | <img src="docs/swatches/text-secondary.png" width="20" alt=""> **Light grey** text on transparent border |
| `Start Over` primary button                   | <img src="docs/swatches/accent-gradient.png" width="64" alt=""> **Accent gradient** |
| `Challenge Review` heading                    | <img src="docs/swatches/text-primary.png" width="20" alt=""> **White** |
| Per-challenge card surface                    | <img src="docs/swatches/bg-card.png" width="20" alt=""> **Dark grey** (`--bg-card`) |
| Per-step row · correct                        | Faint <img src="docs/swatches/success.png" width="20" alt=""> **success** tint (`rgba(0,224,168,0.05)`) + green border |
| Per-step row · incorrect                      | Faint <img src="docs/swatches/danger.png" width="20" alt=""> **danger** tint (`rgba(255,71,87,0.05)`) + red border |
| Per-step labels (`STEP 1 · TARGET`)           | <img src="docs/swatches/text-tertiary.png" width="20" alt=""> **Dark grey** mono kicker |
| Rationale italic copy                         | <img src="docs/swatches/text-tertiary.png" width="20" alt=""> **Dark grey** for de-emphasis |

---

## Design rules baked into the palette

A handful of conventions that fall out of the token choices above and
that the rest of the codebase respects:

1. **Accent is rationed.** Cyan and the cyan→purple gradient mark
   exactly one of three things on any given screen: the *single*
   primary action, the *single* current state, or a brand surface
   (the score ring). If a second cyan element creeps in, the screen
   loses its visual hierarchy.
2. **Greys carry the weight.** Body content lives in
   `--text-secondary`. Titles in `--text-primary`. Microcopy in
   `--text-tertiary`. No element should bypass this three-step
   ladder by inventing a new grey.
3. **Surfaces stack in three tiers.** `--bg-primary` (page) →
   `--bg-card` / `--bg-surface` (panels) → `--bg-elevated` (the
   mascot card, lesson nav bar). Going beyond three tiers tends to
   make dark UIs feel muddy.
4. **Semantic colors mean state, not category.** `--success`,
   `--danger`, and `--warning` *only* appear when the UI is
   reporting whether something worked. They never decorate static
   content.
5. **Borders are alpha-white, not flat grey.** The two `--border`
   tokens are translucent so they read consistently against any
   surface tier without needing a per-tier override.

If you want to verify any of the above, every reference is grep-able:

```bash
rg 'var\(--accent\)' static/css/style.css
rg 'var\(--success\)' static/css/style.css
rg 'var\(--bg-' static/css/style.css
```
