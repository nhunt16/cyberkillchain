# Fonts Guide · Cyber Kill Chain

This is the simplified font reference for the project. It focuses on
the **main styles only** (not every selector).

---

## Primary Font Families

| Font | CSS Token / Stack | Main Use |
| --- | --- | --- |
| **Inter** | `--font`, `--font-sans` | All general UI text: headings, paragraphs, buttons, nav, labels |
| **SF Mono** (fallback mono stack) | `--font-mono` | Terminal/code-like UI: IPs, logs, system tags, step counters |

Defined in `static/css/style.css` and loaded from
`templates/base.html` (Inter via Google Fonts).

---

## Main Text Styles

These are the core styles to reuse when adding or editing content.

| Style Role | Font | Typical Size | Typical Weight | Used For |
| --- | --- | --- | --- | --- |
| **Display Title** | Inter | `clamp(48px, 8vw, 88px)` | 800 | Home hero title (`The Cyber Kill Chain`) |
| **Section/Screen Heading** | Inter | `26px–52px` (often `clamp`) | 700 | Lesson titles, quiz titles, results title |
| **Body Copy** | Inter | `15px–17px` | 400 | Paragraphs, descriptions, narration text |
| **UI Label / Button Text** | Inter | `12px–15px` | 500–600 | Nav links, buttons, chips, small labels |
| **System/Terminal Text** | Mono stack | `10px–13px` | 400–700 | Terminal output, IPs, status tags, counters |

---

## Where Fonts Are Used Across Screens

### 1) Home (`/`)
- **Inter 800, very large**: hero headline.
- **Inter 400, medium**: hero subtitle/body line.
- **Inter 600**: primary CTA text (`Begin Learning`).
- **Inter 400-500**: nav links and footer text.

### 2) Lessons (`/learn/<n>`)
- **Inter 700**: section and phase headings.
- **Inter 400 (15-17px)**: lesson explanations and scene narration.
- **Inter 500-600**: buttons, tabs, chips, helper labels.
- **Mono (10-13px)**: terminal panels, OSINT/log snippets, step counters.

### 3) Quiz (`/quiz/1`, `/quiz/2`)
- **Inter 700**: challenge titles.
- **Inter 400**: challenge descriptions and rationale text.
- **Inter 600**: option/button labels.
- **Mono**: attacker workbench terminal styling, compact state tags.

### 4) Results (`/quiz/result`)
- **Inter 800**: large score numerals.
- **Inter 700**: result headings and card titles.
- **Inter 400**: review details and explanations.
- **Mono**: tiny step/kicker labels (system-style metadata).

---

## Quick Rules (Keep It Consistent)

1. Use **Inter** for almost all content.
2. Use **Mono** only for technical/system-looking text.
3. Keep body text around **15-17px / 400**.
4. Use **700-800** only for important titles or big numbers.
5. Use small uppercase labels sparingly (chips/kickers/tags).

---

## Example Mapping (simple)

- `p` / descriptive copy -> **Inter, 15-17px, 400**
- `h1` hero headline -> **Inter, large clamp, 800**
- section title (`h2`/screen title) -> **Inter, 28-52px, 700**
- button text -> **Inter, 13-15px, 600**
- terminal/log line -> **SF Mono stack, 11-13px, 400**

# Type System · Cyber Kill Chain

The whole site runs on **two font families and one numeric scale**.
Everything you see — headings, body, buttons, terminals, eyebrows —
is some combination of those two families with one of ~10 sizes and
one of ~5 weights. This document catalogues those choices, shows the
five "roles" they collapse into, and traces every role to a real
element on every screen.

The font stacks are declared as CSS custom properties at the top of
[`static/css/style.css`](static/css/style.css):

```css
--font:        'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-sans:   var(--font);
--font-mono:   'SF Mono', ui-monospace, Menlo, Consolas, monospace;
```

Inter is loaded from Google Fonts in
[`templates/base.html`](templates/base.html) with weights
`300, 400, 500, 600, 700, 800, 900` available. The mono stack is
system-only (no web font), which means terminal scenes render
instantly and pixel-crisp on macOS / Windows / Linux.

---

## TL;DR · The five typographic roles

| Role | Font | Size | Weight | Tracking | Where you see it |
| --- | --- | --- | --- | --- | --- |
| **Display** | Inter | `clamp(48px → 88px)` | 800 | `-0.04em` | Hero title on `/` ("The Cyber Kill Chain"), big stat numerals (score ring, dossier "5 / 5"). |
| **Heading** | Inter | `clamp(26px → 52px)` | 700 | `-0.02em` to `-0.03em` | Lesson section titles ("Phase 1 · Reconnaissance"), challenge titles, results title. |
| **Body** | Inter | 15–17px | 400 | default (`normal`) | Paragraphs, scene narration, subtitles, descriptions. **Most words on screen are this.** |
| **UI / Label** | Inter | 12–14px | 500–600 | `0.01em` (buttons) / `0.08–0.16em` UPPERCASE (kickers) | Buttons, nav links, status pills, "PHASE 01"-style eyebrows. |
| **Mono** | SF Mono → Fira Code → Menlo → Consolas | 10–13px | 400–700 | `0.04em` | Terminal output, IP addresses, file paths, step numbers, OSINT pills, code blocks. |

That's the whole system. Everything below is just a more granular
breakdown of those five roles.

---

## The full scale (every size that actually ships)

Every numeric size in the codebase, in the order the eye encounters
them on screen. Sizes marked `clamp(min → max)` are responsive
(small on phones, large on desktops).

| px | Family | Common weight | Used for |
| --: | --- | --: | --- |
|  10 | Inter / Mono | 600–800 | Tiny status badges (`HTTPS`, `LOCK`), corner-of-card meta, file-size labels. |
|  11 | Inter / Mono | 400–600 | Profile sub-roles, install-log timestamps, terminal IPs, exfil progress. |
|  12 | Inter | 500–700 | Mockup URLs, email metadata, c2-ip labels. |
|  12 | Inter | 600 + UPPERCASE | **Eyebrow / kicker** style (`PHASE 02 · WEAPONIZATION`) with `letter-spacing: 0.08–0.16em`. |
|  13 | Inter | 400–600 | Small body, hint text, terminal output, button text. |
|  13 | Mono  | 400 | Phase counter (`02 / 07`), terminal scenes. |
|  14 | Inter | 400–500 | Nav link labels, scene action icons, case-step descriptions. |
|  15 | Inter | 400 | Scene paragraphs, intro card labels, results sub-line, challenge desc. |
|  15 | Inter | 600 | "Begin Learning →" CTA, scene-prompt strong text. |
|  16 | Inter | 400 | `<body>` base size — every `rem` derives from this. |
|  17 | Inter | 400 | Lesson section body (`.section-body`), `line-height: 1.8`. |
|  18 | Inter | 800 | Recon-mockup logo, case-step title. |
|  20 | Inter | 700 | Chain-detail H4 ("Phase X · Name"). |
|  22 | Inter | 800 | Phase counter current digit ("**02** / 07"). |
|  28 | Inter | 700 | Quiz challenge title, results title. |
|  36 | Inter | 800 | Case-impact stat numbers, results emoji size. |
|  48 | Inter | 800 | Chain-detail phase numeral (large stylized "01"). |
|  64 | Inter | 800 | Intro-card-number ("the chain is **5** / 7 phases…"). |
|  80 | Inter | 800 | Intro-card-number "large" variant. |
|  `clamp(26 → 38)`  | Inter | 700 | Scene-name (per-phase title in lessons). |
|  `clamp(32 → 52)`  | Inter | 700 | `.section-title` (lesson H2s). |
|  `clamp(42 → 64)`  | Inter | 800 (gradient) | `.scene-num` (huge phase numeral, clipped to gradient). |
|  `clamp(48 → 88)`  | Inter | 800 | `.hero-title` ("The Cyber Kill Chain" on `/`). |
|  `clamp(16 → 20)`  | Inter | 400 | `.hero-subtitle`, `line-height: 1.7`. |

The whole scale is "tight at the top, generous at the bottom":
display sizes use negative letter-spacing to keep them feeling
densely set, body sizes use comfortable `1.6–1.8` line-heights to
keep paragraphs scannable.

---

## The weight ladder (only 5 weights are actually used)

Inter ships 9 weights but the codebase only references 5. The other
four are loaded but unused, kept available so future content can
grow into them without re-touching `base.html`.

| Weight | Name | Used for |
| --: | --- | --- |
| **400** | Regular  | All body copy, descriptions, terminal text, hero subtitles. |
| **500** | Medium   | Nav link labels, lesson-nav buttons, scene action chips. |
| **600** | Semibold | Small UPPERCASE labels, button text, `.scene-prompt strong`, profile names. |
| **700** | Bold     | Chain ring numbers, recon-mockup logo, weapon-file names, headings (`section-title`, `scene-name`, `quiz-challenge-title`, `results-title`). |
| **800** | Extra-bold | Display heads (`hero-title`, `intro-card-number`), score numerals, gradient-clipped `scene-num`, `case-impact-value`, `phases-counter-current`. |

The tight 5-weight palette is what makes the site read as a single
voice across very different scenes — terminal, hero, quiz card,
result ring all share the same vocabulary.

---

## Where each role shows up · screen-by-screen

### 1. Home screen (`/`)

Two display moments, one line of body copy, one CTA. That's it —
the home screen exists to rank importance, and the type does the
ranking on its own without colour or imagery.

| Element | Selector | Family · Size · Weight · Tracking |
| --- | --- | --- |
| Top nav logo ("■ Cyber Kill Chain") | `.nav-logo` | Inter · 15px · 700 |
| Top nav links ("Home", "Lessons") | `.nav-link` | Inter · 14px · 400 (500 on hover) |
| Eyebrow badge ("CYBERSECURITY FUNDAMENTALS") | `.section-label` | Inter · 12px · 600 · `letter-spacing: 0.16em` · `text-transform: uppercase` |
| Hero title ("The Cyber Kill Chain") | `.hero-title` | Inter · `clamp(48px → 88px)` · 800 · `-0.04em` · `line-height: 1` |
| Hero subtitle ("Understand the five phases…") | `.hero-subtitle` | Inter · `clamp(16px → 20px)` · 400 · `line-height: 1.7` |
| `Begin Learning →` CTA | `.btn-primary` | Inter · 15px · 600 · `letter-spacing: 0.01em` |
| "5 lessons · 2 challenges" meta line | `.hero-meta` | Inter · 13px · 500 |
| Footer credit | `.footer p` | Inter · 12px · 400 |

---

### 2. Lesson screens (`/learn/<n>`)

Lessons stack a *lot* of typographic ideas — eyebrow → big numeral
→ heading → body → scene mockup with its own internal hierarchy.
The mono stack pulls heavy weight here for everything that wants
to feel like "actual machinery".

#### 2a. Page chrome

| Element | Selector | Family · Size · Weight · Tracking |
| --- | --- | --- |
| Stepper digits (`01 02 03…`) | `.stepper-dot` | Mono · 11px · 400 · `0.04em` |
| Lesson nav buttons (`Previous` / `Next →`) | `.lesson-nav-btn` | Inter · 14px · 500 · `0.01em` |

#### 2b. Section / Scene framing

| Element | Selector | Family · Size · Weight · Tracking |
| --- | --- | --- |
| Section eyebrow ("PHASE 02 · WEAPONIZATION") | `.section-label` | Inter · 12px · 600 · `0.16em` UPPERCASE |
| Section title ("Weaponization") | `.section-title` | Inter · `clamp(32px → 52px)` · 700 · `-0.03em` · `line-height: 1.15` |
| Section body paragraph | `.section-body` | Inter · 17px · 400 · `line-height: 1.8` |
| Scene number (giant gradient "02") | `.scene-num` | Inter · `clamp(42px → 64px)` · 800 · `-0.04em` · clipped to `--accent-gradient` |
| Scene name ("Weaponization") | `.scene-name` | Inter · `clamp(26px → 38px)` · 700 · `-0.02em` |
| Scene "aka" tag ("aka exploit-pairing") | `.scene-aka` | Inter · 13px · 600 |
| Scene prompt (contextual narration) | `.scene-prompt` | Inter · 15px · 400 · `line-height: 1.7` |
| Scene prompt `strong` (highlighted noun) | `.scene-prompt strong` | Inter · 15px · 600 (color shift) |
| Scene prompt `em` (cyan accent word) | `.scene-prompt em` | Inter · 15px · 600 · cyan color |
| Scene action button | `.scene-action` | Inter · 13px · 600 (button text) |
| Scene hint copy | `.scene-hint` | Inter · 13px · 400 · `line-height: 1.5` |

#### 2c. Mockup interiors (the "scenes")

The scene mockups (browser, email client, terminal, file picker)
intentionally use slightly different type to feel like real apps.

| Element | Selector | Family · Size · Weight |
| --- | --- | --- |
| Browser mockup URL bar | `.mockup-url` | Inter · 12px · 400 |
| Recon-tool logo ("LinkedIn") | `.recon-logo` | Inter · 18px · 800 |
| Recon profile name | `.recon-profile-name` | Inter · 13px · 600 |
| Recon profile sub-role | `.recon-profile-role` | Inter · 11px · 400 |
| Recon side-rail OSINT log | `.recon-osint-log` | Mono · 11px · 400 |
| Email "From" line | `.email-msg-from` | Inter · 13px · 700 |
| Email "To" / "Subject" | `.email-msg-to`, `.email-msg-subject` | Inter · 12px · 400 |
| Email body | `.email-msg-body` | Inter · 13px · 400 |
| Spoof badge ("⚠ SPOOFED") | `.email-spoof` | Inter · 10px · 700 UPPERCASE |
| Document banner warning | `.doc-banner` | Inter · 13px · 400 |
| Doc-banner severity tag | `.doc-banner .badge` | Inter · 12px · 700 UPPERCASE |
| Weapon file name ("invoice.pdf") | `.weapon-file-name` | Inter · 15px · 700 |
| Weapon file metadata | `.weapon-file-meta` | Inter · 12px · 400 |
| Terminal title bar | `.exploit-terminal-title` | Inter · 11px · 400 |
| Terminal body output | `.exploit-terminal-body` | Mono · 11px · 400 |
| Install log lines | `.install-log` | Mono · 12px · 400 |
| Install log type tag (`OK`, `WARN`, `ERR`) | `.install-log-type` | Mono · 10px · 700 UPPERCASE |
| Install filesystem tree | `.install-fs` | Mono · 12px · 400 |
| C2 IP address chip | `.c2-ip` | Mono · 11px · 400 |
| C2 label | `.c2-label` | Inter · 12px · 600 |
| Exfil file name | `.exfil-file-name` | Inter · 12px · 600 |
| Exfil file size | `.exfil-file-size` | Inter · 10px · 400 |
| Exfil progress label | `.exfil-progress-label` | Inter · 11px · 400 |
| Exfil progress bytes counter | `.exfil-progress-bytes` | Mono · 11px · 400 |
| Phase tab name | `.phases-tab-name` | Inter · 13px · 400 |
| Phase counter current ("**02** / 07") | `.phases-counter-current` | Mono · 22px · 800 · `-0.02em` |
| Phase counter total ("02 / **07**") | `.phases-counter-total` | Mono · 13px · 400 |

#### 2d. Big intro / outro panels

| Element | Selector | Family · Size · Weight |
| --- | --- | --- |
| Intro card numeral (default) | `.intro-card-number` | Inter · 64px · 800 · `-0.04em` · `line-height: 1` |
| Intro card numeral (large variant) | `.intro-card-number--large` | Inter · 80px · 800 |
| Intro card label | `.intro-card-label` | Inter · 15px · 500 · `line-height: 1.4` |
| Chain-node ring number | `.chain-node-ring span` | Inter · 16px · 700 |
| Chain-node label ("RECONNAISSANCE") | `.chain-node-label` | Inter · 12px · 600 · `0.08em` UPPERCASE |
| Chain-detail giant phase numeral | `.chain-detail-phase` | Inter · 48px · 800 · `line-height: 1` |
| Chain-detail H4 ("Phase 1 · Reconnaissance") | `.chain-detail-text h4` | Inter · 20px · 700 |
| Chain-detail body | `.chain-detail-text p` | Inter · 15px · 400 · `line-height: 1.7` |
| Case-step title ("Stuxnet") | `.case-step-title` | Inter · 18px · 700 |
| Case-step description | `.case-step-desc` | Inter · 14px · 400 |
| Case-impact stat number ("$**100M**") | `.case-impact-value` | Inter · 36px · 800 |
| Case-impact label ("damage caused") | `.case-impact-label` | Inter · 13px · 400 |

---

### 3. Quiz screens (`/quiz/1`, `/quiz/2`)

Quiz screens push hierarchy further: the challenge title is bigger
than the lesson section title, descriptions are tighter, and every
interactive thing wears a 13px / 600 button label.

#### Shared quiz chrome

| Element | Selector | Family · Size · Weight |
| --- | --- | --- |
| Challenge number eyebrow ("CHALLENGE 1 OF 2") | `.quiz-challenge-number` | Inter · 12px · 600 · `0.08em` UPPERCASE |
| Challenge title ("Plan the Breach") | `.quiz-challenge-title` | Inter · 28px · 700 · `-0.02em` |
| Challenge description | `.quiz-challenge-desc` | Inter · 15px · 400 · `line-height: 1.6` |
| Generic quiz card label | `.quiz-card-text` | Inter · 15px · 400 |
| `Submit Answer` chip | `.quiz-submit-chip` | Inter · 16px · 700 |

#### Challenge 1 · Plan the Breach (attacker workbench)

The workbench is the most "terminal-flavoured" surface on the site —
it leans heavily on the mono stack to sell the red-team aesthetic.

| Element | Family · Size · Weight |
| --- | --- |
| Terminal title bar (`root@redteam:~/ops/acme#`) | Mono · 13px · 600 (`root@redteam` accent) / 400 (path) |
| Step pill labels (`TARGET`, `PRETEXT`, …) | Mono · 11px · 600 · `0.08em` UPPERCASE |
| Step pill numbers (`01 → 05`) | Mono · 13px · 700 (gradient on current) |
| Step heading ("Pick your initial foothold") | Inter · 22px · 700 · `-0.02em` |
| Step prompt body | Inter · 14px · 400 · `line-height: 1.6` |
| Option card title (e.g. "**Sales Director, ACME Corp**") | Inter · 15px · 600 |
| Option card subtitle | Inter · 13px · 400 |
| Option card chips (`OSINT`, `LinkedIn`, `2FA-bypass`) | Mono · 10px · 700 · `0.08em` UPPERCASE |
| `INTEL` ribbon badge | Mono · 10px · 800 · `0.16em` UPPERCASE |
| `VIABLE` / `BURNED` verdict pill | Mono · 11px · 800 UPPERCASE |
| Intel rationale body | Inter · 14px · 400 · `line-height: 1.6` |
| `Next step: Pretext →` button | Inter · 13px · 600 · `0.01em` |
| **ATTACK DOSSIER** banner heading | Mono · 12px · 800 · `0.16em` UPPERCASE |
| Dossier score numeral ("**5 / 5**") | Inter · 64px · 800 · gradient-clipped |
| Dossier per-step recap row | Inter · 13px · 400 + Mono · 10px · 700 (step label) |

#### Challenge 2 · Defend the Network (blue-team simulation)

| Element | Family · Size · Weight |
| --- | --- |
| `INCOMING THREAT` alert eyebrow | Mono · 11px · 800 · `0.16em` UPPERCASE |
| Threat phase label ("PHASE 02 · WEAPONIZATION") | Mono · 11px · 600 · `0.08em` UPPERCASE |
| Defensive option button | Inter · 14px · 600 · `0.01em` |
| Phase-timeline node label | Mono · 10px · 700 UPPERCASE |
| Result emoji (✅ / ❌) | Inter · 36px (the emoji glyph itself) |
| Final summary numeric ("**3** of 5 defended") | Inter · 28px · 800 (digit) + 15px · 400 (rest) |

---

### 4. Result screen (`/quiz/result`)

The result screen reuses the lesson/quiz vocabulary but inverts the
emphasis — the score numeral is the loudest thing on the page,
everything else is calm 13–15px Inter.

| Element | Selector | Family · Size · Weight |
| --- | --- | --- |
| Score ring percentage ("100%") | `.results-score` | Inter · 48–64px · 800 · `-0.04em` (gradient-clipped) |
| Result title ("Outstanding!") | `.results-title` | Inter · 28px · 700 · `-0.02em` |
| Result message ("You got 7 out of 7…") | `.results-message` | Inter · 15px · 400, with bolded `<strong>` numerals at 600 |
| `Review Lessons` ghost button | `.btn-secondary` | Inter · 14px · 500 · `0.01em` |
| `Start Over` primary button | `.btn-primary` | Inter · 15px · 600 · `0.01em` |
| `Challenge Review` H2 | `.results-section h2` | Inter · 20px · 700 |
| Per-challenge card title | `.result-card h3` | Inter · 18px · 700 |
| Per-step kicker (`STEP 1 · TARGET`) | `.result-step-label` | Mono · 10px · 700 · `0.16em` UPPERCASE |
| Per-step body (your answer / correct answer) | `.result-step-body` | Inter · 13px · 400 · `line-height: 1.6` |
| Per-step rationale (italic) | `.result-step-rationale` | Inter · 13px · 400 italic |

---

## Design rules baked into the type system

A handful of conventions that fall out of the choices above and that
the rest of the codebase respects:

1. **One sans, one mono.** No third family is allowed. If a design
   moment needs to feel "different", reach for a different
   *weight* or *case* (UPPERCASE + tight tracking) before reaching
   for a different family.
2. **Mono earns its place.** `--font-mono` is used only when the
   content is literally machine output — terminal lines, IPs,
   file paths, step numbers, OSINT chips — or when a label needs
   to feel like a system tag (`INTEL`, `VIABLE`, `BURNED`,
   `ATTACK DOSSIER`). Body copy never uses mono.
3. **Display heads are tight, body is loose.** Sizes ≥ 28px use
   negative letter-spacing (`-0.02em` to `-0.04em`) and
   `line-height: 1` to feel densely set. Sizes ≤ 17px use
   `line-height: 1.6–1.8` for comfortable reading.
4. **Eyebrows are 12px / 600 / 0.08–0.16em UPPERCASE.** Every
   "PHASE 02 · NAME"-style kicker on the site uses that exact
   formula. Don't invent new eyebrow styles.
5. **Buttons are 13–15px / 600 / 0.01em.** Three sizes, one
   weight, one tracking. Primary CTAs lean 15px, secondary buttons
   lean 14px, in-component chips lean 13px.
6. **Numerals use 800 weight.** Any standalone number you want the
   eye to land on (score, stat, phase numeral) gets weight 800 and
   tight tracking. Inter at 800 is the closest the system gets to
   a "celebration" voice.
7. **Body weight is 400, never lighter.** Inter 300 is loaded but
   never used — at the small sizes this UI runs at, anything
   lighter than 400 starts to disappear on dark backgrounds.

If you want to verify any of the above, every reference is grep-able:

```bash
rg 'font-family' static/css/style.css
rg 'font-size:\s*1[5-7]px' static/css/style.css   # body sizes
rg 'font-weight:\s*800' static/css/style.css      # display numerals
rg 'text-transform:\s*uppercase' static/css/style.css
```