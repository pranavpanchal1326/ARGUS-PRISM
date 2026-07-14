# ARGUS-PRISM V3 — THE SECURITY PRESS
## Master UI Design Blueprint & Department Audit · v1.0

| | |
|---|---|
| **Document** | UI-MASTER-BLUEPRINT — the complete design-department audit and 100x enhancement specification |
| **Product** | ARGUS-PRISM — Pre-crime Intelligence System for Mule Detection |
| **Theme** | "The Security Press" — an interface engraved like a banknote, designed so it cannot be faked |
| **Authors** | Design Department (full review board: Creative Director, Type Director, Motion Director, Interaction Director, Accessibility Lead, Performance Engineer) |
| **Status** | APPROVED FOR BUILD — this document supersedes all prior visual specifications |
| **Parent** | PRD-V3 (contract, roles, laws). Laws 1–3 of PRD-V3 apply to every pixel of this document. |
| **Review method** | Every section below was written twice: first as critique (what is lacking, lame, generic, or rough), then as the enhanced final specification. Nothing ships that hasn't survived the critique pass. |

---

# TABLE OF CONTENTS

- PART 0 — The Verdict: Department Review Summary
- PART 1 — Identity & The Five Design Laws
- PART 2 — Color: Audit & Final System (NOTE and PLATE)
- PART 3 — Typography: Audit & Final System
- PART 4 — Space, Grid, Layout Architecture
- PART 5 — Iconography & Engraved Glyph Language
- PART 6 — Texture, Paper, and Surface Physics
- PART 7 — Motion: The Press Mechanics System
- PART 8 — The Guilloché Engine (the art infrastructure)
- PART 9 — Component Canon: Full Audit, Anatomy & States (24 components)
- PART 10 — The Sheets: Every Screen, Audited & Perfected (13 sheets)
- PART 11 — Interaction Patterns & Operator Loops
- PART 12 — Microcopy, Voice & The Press Lexicon
- PART 13 — Accessibility: The Large Print Standard
- PART 14 — Performance: The Smoothness Contract
- PART 15 — Quality: Torture Matrix & Hostile Judge Protocol
- PART 16 — Governance, Tokens, File Architecture
- PART 17 — Delivery Roadmap & Definition of Done
- PART 18 — Demo Choreography: The Ten-Minute Performance
- PART 19 — The Folio Registry & Information Architecture Record
- PART 20 — Open Questions & Pre-committed Decisions
- PART 21 — Final Review Statement
- APPENDIX A — Full Token Tables
- APPENDIX B — Keyboard Map
- APPENDIX C — Contrast Verification Matrix
- APPENDIX D — The Ration Ledger (per-sheet art budget)

---

# PART 0 — THE VERDICT: DEPARTMENT REVIEW SUMMARY

## 0.1 What the review board found

The board reviewed the prior three visual directions shipped or specified for this product:

1. **v1 "Heritage Bank"** (brass/bottle-green/Playfair) — REJECTED. Verdict: costume. A 1930s
   pastiche that communicated "theme park," not "instrument." Playfair Display undermined
   credibility. Brass-on-green sat on the contrast borderline. The metaphor (old bank) had no
   necessary connection to the product's function (detecting fraud).
2. **v2 "Modern Vault"** (champagne gold gradients, mint, curves) — REJECTED. Verdict: luxury
   template. Gradient gold text is a recognized template/AI tell. It signaled decorative
   where the product must signal authoritative.
3. **v3-draft "Spectral Intelligence"** (deep space + refracted spectrum) — REJECTED. Verdict:
   the dominant 2024–2026 AI-startup aesthetic. Dark void + neon spectrum + glass + grotesk
   is what every generator defaults to. Beautiful, common, forgettable.

**The approved direction — "The Security Press" — survives review because it is the only one
whose art is load-bearing:** the visual language of banknote engraving is the one design
tradition invented specifically to defeat fraud. The product hunts fake money; the interface
is drawn in the language of real money. Concept, color, type, layout, motion, and microcopy
all descend from that single idea. Nothing is decoration; everything is evidence.

## 0.2 The ten deficiencies this blueprint corrects

Each was found during the critique pass and is resolved in the named section:

| # | Deficiency found | Severity | Resolved in |
|---|---|---|---|
| 1 | Screens were designed; operator LOOPS were not. Triage required navigation churn. | CRITICAL | Part 10, Sheet 04 (Examination Desk); Part 11.1 |
| 2 | Explainability was label-deep. Scores lacked evidence trails. | CRITICAL | Part 9.4 (Worksheet); Part 11.3 |
| 3 | The design argued only "guilty" — no exonerating surface. | HIGH | Part 9.4 (Counterweight columns) |
| 4 | Time — fraud's native dimension — had no first-class UI. | HIGH | Part 9.13 (Replay); Sheets 05/06 |
| 5 | Live data would rug-pull readers at 50 ev/s. | CRITICAL | Part 11.2 (Freeze-on-focus / pull principle) |
| 6 | Priority policy was fuzzy ("sorted by severity" is not an ops policy). | HIGH | Sheet 04 (Docket order) |
| 7 | The analyst→MLRO handoff (the product's climax) was unspecified. | HIGH | Part 9.14 (Routing Slip); Sheet 03 |
| 8 | No comparison surface; judgment is relative. | MEDIUM | Part 9.12 (Comparator) |
| 9 | Edge cases undesigned (long names, ₹ crores, 0/10k rows, overdue SLA). | HIGH | Part 15 (Torture Matrix) |
| 10 | No governance; solo-build drift and kitsch creep guaranteed. | HIGH | Part 16; Appendix D (Ration Ledger) |

## 0.3 Reading rule for this document

Sections marked **⊘ AUDIT** contain the critique — what was lacking, lame, or generic, and why.
Sections marked **✦ SPEC** contain the corrected, final, buildable specification. Where a value
appears in a ✦ SPEC table it is normative: deviation requires a documented review-board note.

---

# PART 1 — IDENTITY & THE FIVE DESIGN LAWS

## 1.1 The concept, restated for the record

**The Security Press.** Every screen is a printed sheet from the press of a great institution.
Two rendering environments exist — **NOTE** (the printed banknote: cotton-cream paper, engraving
ink) and **PLATE** (the engraver's steel negative: ink-black field, cream line-work). They are
not "light mode and dark mode"; they are the same artwork, positive and negative, like a note
and the plate that printed it. This framing governs every mode decision in Part 2.

**The creed:** *Quiet paper instrument. Everything important is ink. Authority strikes like a seal.*

## 1.2 The Five Design Laws (UI-level, non-negotiable)

These extend PRD-V3's Laws 1–3 (contract-first, no fake anything, no secrets on glass) into
the visual layer. Violations are release blockers, not style notes.

### LAW I — INK, NEVER GLOW
No gradients. No blur-glow. No neon. No drop-shadow "lift" hovers. Color arrives only as
printed ink: solid, matte, confident. Depth is communicated through line weight, hatching
density, and paper shadow (a single soft ambient occlusion under raised cards). The moment a
gradient or glow appears anywhere in the console, the design has been counterfeited.

*Enforcement:* stylelint rule bans `linear-gradient`, `radial-gradient`, `box-shadow` values
containing blur radii > 24px, and any `filter: blur|glow` in component CSS. Exceptions live in
exactly two files (paper shadow token; Plate canvas renderer) and are code-owner protected.

### LAW II — THE RATION
Per sheet: at most ONE focal rosette, at most ONE seal/stamp event per user action, folios
always. Everything else is typography, rules, and hatching. Data zones (tables, ledgers,
worksheets) are ornament-free — the art lives at the edges and in the identity moments, never
between the operator and a number. Density always beats decoration in any conflict.

*Enforcement:* Appendix D is the per-sheet art budget; PR review checks against it.

### LAW III — DATA WEARS MONO
Every numeral, reference, timestamp, hash, serial, and machine-generated string renders in
Martian Mono with tabular figures. A number set in the text face is a defect of the same class
as a failing test. Rationale: numbers in this product are *evidence*; the mono face is the
typographic equivalent of an evidence bag — instantly recognizable, never confusable with prose.

*Enforcement:* the `<Num>`, `<Ref>`, `<Stamp>`, `<Money>`, `<When>` primitives (Part 9.23) are
the only sanctioned way to render machine data; raw numerals in JSX text nodes fail lint.

### LAW IV — AUTHORITY IS HELD
Every consequential action — freeze, escalate, approve, seal, cancel, unmask, revoke — is
press-and-hold (900ms) on a Seal control while the seal visibly inks and then strikes. Release
early and nothing happens. There are no dangerous single-clicks anywhere in the product, and
no "Are you sure?" modal dialogs — the hold IS the confirmation, embodied.

*Rationale:* prevents misclicks (real safety), creates a felt sense of exercising authority
(real theatre), unifies all dangerous actions under one learnable gesture (real UX).

### LAW V — THE OPERATOR PULLS; THE SYSTEM NEVER SHOVES
Live data accumulates in counters, margins, and folio indicators. It never reorders a list the
operator is reading, never moves content under the cursor, never interrupts an examination.
The operator feeds the press when ready. Under 50 events/second the interface must feel
*calmer*, not busier — velocity is shown as marginal tick density and the folio aperture's
perturbation, not as churn.

## 1.3 The brand mark — the Master Rosette

**⊘ AUDIT:** prior specs referenced "the rosette" everywhere but never designed it. An identity
system whose central artifact doesn't exist is a promissory note, not a brand. It must be the
FIRST artifact built, because favicon, watermark, seals, empty states, and the login all
derive from it.

**✦ SPEC:**
- Construction: a guilloché rose of exactly three interleaved hypotrochoid harmonics
  (see Part 8 for the mathematics), 720 sample points, stroke-only, single ink.
- Center: an aperture-shaped NEGATIVE space — the hundred-eyed watcher survives as absence,
  not as a drawn eye. At small sizes the negative center reads as a pupil; at large sizes it
  reads as a lens. This is the only "eye" in the product.
- Lockup: `ARGUS PRISM` set in Zodiak Medium, letterspaced +12%, on a microtext baseline rule
  (the rule is 4px repeating `ARGUSPRISM·ARGUSPRISM·` — see Part 6.3).
- Variants: FULL (login, landing hero seal, 96–220px) · SMALL (folio, favicon, 14–24px, reduced
  to 2 harmonics for legibility) · WATERMARK (8% ink opacity, any size, idle states and paper
  backgrounds) · SEAL (enclosed in a serrated seal ring for strike animations).
- The favicon is a live canvas rosette: calm geometry when the stream is healthy, visibly
  perturbed when CRITICAL alerts are open, struck-through when the session is disconnected.
  (16×16 and 32×32; redraw at most once per 2s; no animation loop.)
- Forbidden: the rosette never appears filled, never gradient-tinted, never rotated as a
  loading spinner (loading has its own language — Part 7.6).

---

# PART 2 — COLOR: AUDIT & FINAL SYSTEM

## 2.1 ⊘ AUDIT — what was lame and why

1. **v1's brass `#B08D3E` on green `#0E2A23`** measured ≈4.6:1 — borderline AA for body text,
   failing below 18px for thin weights. An interactive layer living on the compliance edge is
   a lawsuit against your own design. REJECTED.
2. **v2's gold gradients** violated what became LAW I before it was written. Gradient-as-accent
   is the single most recognizable template tell of 2024–26. REJECTED.
3. **v3-draft's spectrum** was disciplined in theory ("only as refracted light") but the palette
   itself — cyan/violet/magenta on near-black — is the house palette of the AI industry.
   Distinctiveness cannot be achieved with the industry's default crayons. REJECTED.
4. **General failure across all three:** no dual-mode strategy (PRD said "the theme is the
   mode" — the client has overruled this; both modes are now required), no semantic token
   architecture (components referenced raw palette names, guaranteeing drift), and no
   per-surface mode policy.

## 2.2 ✦ SPEC — the philosophy

Ink on paper, twice. NOTE mode is the printed note: warm cotton-cream paper carrying warm
near-black ink. PLATE mode is the engraver's negative: the SAME artwork with ink and paper
exchanged, exactly as a printing plate reverses the print. Accents are inks a security printer
actually stocks: a reserve blue (the blue of cheque backgrounds and official seals), a
vermilion (the red of SPECIMEN overprints and cancellation stamps), an intaglio green
(currency-engraving green, permitted ONLY in line-art and hatching, never as fill or text).

No color in this product is decorative. Each ink has a legal meaning:

| Ink | Meaning | Never used for |
|---|---|---|
| Ink (black/cream) | Fact. Printed truth. | — |
| Reserve blue | Interactivity and elevated (non-critical) severity. | Decoration, large fills |
| Vermilion | CRITICAL/IMMINENT, seals, cancellation, misprints. | Anything routine. Ever. |
| Intaglio green | Engraved line-art and hatching only. | Fills, text, icons |
| Verified green | Positive confirmation (ledger intact, package sealed). | General "success" noise |

## 2.3 ✦ SPEC — the full palette

### 2.3.1 NOTE mode (the printed note — light)

| Token | Value | Measured role |
|---|---|---|
| `--paper` | `#F1EDE3` | Base surface. Cotton-cream; warmer than white by design — pure white is a screen color, this is a paper color. |
| `--paper-raised` | `#F7F4EC` | Cards, index cards, panels — half a step brighter, like a fresh sheet on the pile. |
| `--paper-sunken` | `#E9E4D6` | Input wells, code/ledger backgrounds, pressed states. |
| `--paper-aged` | `#E4DCC8` | SLA-decayed documents, historical entries. |
| `--ink` | `#1A1B18` | Primary text and line. Warm black — carbon ink, not RGB black. |
| `--ink-mut` | `rgba(26,27,24,0.62)` | Secondary text. |
| `--ink-faint` | `rgba(26,27,24,0.38)` | Tertiary, placeholders, disabled. |
| `--rule` | `rgba(26,27,24,0.14)` | Hairlines, ledger rules, table borders. |
| `--rule-strong` | `rgba(26,27,24,0.30)` | Section rules, card borders. |
| `--reserve` | `#1F3FB5` | Interactive accent; elevated severity. |
| `--reserve-ink` | `#16308F` | Reserve pressed/active state. |
| `--reserve-wash` | `rgba(31,63,181,0.08)` | Selection wash, focus row background. |
| `--vermilion` | `#E33F1E` | CRITICAL, seals, cancellation. |
| `--vermilion-ink` | `#C13317` | Vermilion pressed state. |
| `--vermilion-wash` | `rgba(227,63,30,0.07)` | Critical row background wash. |
| `--intaglio` | `#2E5D4B` | Engraved line-art/hatching only. |
| `--verified` | `#2E7D52` | Intact/sealed confirmations. |
| `--shadow-card` | `0 1px 0 rgba(26,27,24,0.10), 0 6px 24px rgba(26,27,24,0.08)` | The ONLY elevation shadow. |

### 2.3.2 PLATE mode (the engraver's negative — dark)

| Token | Value | Notes |
|---|---|---|
| `--paper` | `#12130F` | Plate black — warm, never blue-black. |
| `--paper-raised` | `#1A1B16` | |
| `--paper-sunken` | `#0C0D0A` | |
| `--paper-aged` | `#181712` | |
| `--ink` | `#EFE9DA` | Cream line-work. |
| `--ink-mut` | `rgba(239,233,218,0.62)` | |
| `--ink-faint` | `rgba(239,233,218,0.38)` | |
| `--rule` | `rgba(239,233,218,0.14)` | |
| `--rule-strong` | `rgba(239,233,218,0.30)` | |
| `--reserve` | `#5C77E6` | Brightened one printing step for dark ground. |
| `--reserve-ink` | `#7D93F0` | |
| `--reserve-wash` | `rgba(92,119,230,0.10)` | |
| `--vermilion` | `#FF5A38` | |
| `--vermilion-ink` | `#FF7A5C` | |
| `--vermilion-wash` | `rgba(255,90,56,0.09)` | |
| `--intaglio` | `#7FA694` | |
| `--verified` | `#5FBF8F` | |
| `--shadow-card` | `0 1px 0 rgba(0,0,0,0.5), 0 6px 24px rgba(0,0,0,0.45)` | |

### 2.3.3 Mode policy (per-surface, final)

| Surface | Mode | Rationale |
|---|---|---|
| Landing, Login | NOTE always | Public documents are printed notes. First impression = the concept. |
| Compliance register | NOTE default | Ledgers are paper; the security thread reads best on cream. |
| Command Center | PLATE always | The press floor at night; live light-work needs the negative. |
| Network Graph, Recruiter Map | PLATE always | Engraving on the plate IS their art; non-negotiable. |
| Alert Queue, Accounts, Cases, AutoSTR, Admin | Operator's lever | Persisted per operator; `prefers-color-scheme` seeds first visit. |

The mode lever in the Register is labeled `NOTE / PLATE` and flips with a single 320ms
plate-flip wipe. It never animates content — the sheet re-prints instantly in the other ink.

### 2.3.4 Severity → ink mapping (the only status colors that exist)

| Band | Ink treatment |
|---|---|
| CLEAN | `--ink-faint` mark, no wash |
| WARMING | `--ink` mark |
| HOT | `--reserve` mark |
| CRITICAL | `--vermilion` mark + `--vermilion-wash` row |
| IMMINENT | `--vermilion` mark + wash + the slip's rosette renders at maximum distortion |

Severity is NEVER communicated by color alone: each band pairs its ink with a distinct
printed mark shape (Part 5.3) and its label. Color-blind operators lose nothing.

## 2.4 Contrast verification (headline results; full matrix in Appendix C)

| Pair | Ratio | Verdict |
|---|---|---|
| ink on paper (NOTE) | 13.9:1 | AAA all sizes |
| ink-mut on paper | 8.1:1 | AAA body |
| reserve on paper | 8.3:1 | AAA body |
| vermilion on paper | 4.9:1 | AA — restricted to ≥16px or ≥600 weight; enforced by the `<Critical>` primitive |
| ink on paper (PLATE) | 14.2:1 | AAA |
| reserve on plate | 6.9:1 | AA+ body |
| vermilion on plate | 6.2:1 | AA+ body |
| ink-faint (both) | ~3.4:1 | Decorative/disabled only — never carries information alone |

---

# PART 3 — TYPOGRAPHY: AUDIT & FINAL SYSTEM

## 3.1 ⊘ AUDIT

1. **Playfair Display** (v1): a Google-Fonts wedding serif. On a system that freezes bank
   accounts it read as costume jewelry. REJECTED.
2. **Inter everywhere** (v2/v3-draft): the most competent and most generic choice available.
   Inter is what a design system uses when nobody made a typographic decision. The client's
   brief explicitly bans generic faces. REJECTED for display and text.
3. **No numeric discipline existed.** Scores appeared in text faces; timestamps mixed faces;
   tabular figures were an afterthought. In an evidence product this is a credibility leak.
4. **No microtypography spec existed:** no tracking rules, no rag control, no hanging
   punctuation on the display face, no unit treatment for ₹/%.

## 3.2 ✦ SPEC — the three voices

| Voice | Face | Source & license | Character |
|---|---|---|---|
| **DISPLAY** | **Zodiak** | Fontshare (ITF Free Font License — commercial OK, self-host) | A sharp contemporary serif with blade-like contrast; banknote-engraving elegance with modern bones. Nothing like Playfair's softness. |
| **TEXT** | **Supreme** | Fontshare (same license) | Crisp neutral grotesk with quiet personality; superb at 12–14px dense UI; humanist enough to never feel cold. |
| **MACHINE** | **Martian Mono** | SIL OFL (Google Fonts; self-host) | Wide, slab-technical monospace — serial-number DNA. The face of evidence. |

All three self-hosted as subset WOFF2 (Latin + Latin-ext + ₹; Devanagari fallback stack for
names: `"Supreme", "Noto Sans Devanagari", system-ui`). `font-display: swap` with
metric-matched fallbacks (`size-adjust` computed per face) so paper never reflows.

### 3.2.1 Weights loaded (and nothing else)

| Face | Weights | Justification |
|---|---|---|
| Zodiak | 400, 500, 700 (bold for landing hero only) | Display needs contrast of SIZE, not weight |
| Supreme | 400, 500, 700 | 700 restricted to labels ≤12px and emphasis runs ≤3 words |
| Martian Mono | 400, 600 | 600 = the score/denomination weight |

## 3.3 ✦ SPEC — the modular scale

`11 · 12 · 13 · 14 · 16 · 20 · 28 · 40 · 64 · 96` (px)

| Step | Voice | Usage |
|---|---|---|
| 96 | Zodiak | Landing hero only |
| 64 | Zodiak | Sheet count numerals (e.g. the "38" on the Examination Desk) |
| 40 | Zodiak | Sheet titles |
| 28 | Zodiak | Section titles, certificate headers |
| 20 | Supreme 500 | Panel titles, dossier headers |
| 16 | Supreme 400 | Long-form copy (landing, compliance annotations) |
| 14 | Supreme 400 | Default UI text |
| 13 | Supreme 400 / Martian 400 | Dense table text / ledger rows |
| 12 | Martian 400 | Timestamps, refs, footnote citations |
| 11 | Supreme 700 caps +8% | Labels, column headers, folio metadata |

Line-heights: display 1.05 · text 1.5 · dense tables 1.4 · mono ledgers 1.45.
Tracking: Zodiak −2% (≥40px −3%) · Supreme 0 (caps labels +8%) · Martian 0.

## 3.4 ✦ SPEC — microtypography rules (the 100x details)

1. **Hanging punctuation** on Zodiak display blocks: quotes and bullets hang into the margin
   (`hanging-punctuation: first` where supported; manual negative text-indent fallback).
2. **The ₹ rule:** currency symbol always Martian Mono, same size as its figures, no space:
   `₹12,45,000`. Short-scale unit set as small caps text face after a thin space: `₹4.2 Cr`.
3. **Tabular everything:** `font-variant-numeric: tabular-nums slashed-zero` on all Machine
   text. Slashed zero is mandatory — O/0 confusion in serials is an evidence defect.
4. **Rag control:** landing/creed copy max 62ch, `text-wrap: balance` on headings, `pretty`
   on paragraphs where supported.
5. **No faux styles:** synthetic bold/italic disabled (`font-synthesis: none`).
6. **Dateline format** is typographic law: `14 JUL 2026` (text face small caps for month) ·
   audit timestamps `14-07-2026 09:12:11 IST` (Machine).
7. **Ellipsis is banned in data:** truncation shows `…` only in prose. Machine strings
   middle-truncate with tooltip full-value (`UBI-••••-0847` pattern preserved).
8. **Numerals in display:** the giant sheet counts use Zodiak — the ONE sanctioned exception
   to LAW III, because they are rhetoric, not evidence; their exact value appears in Machine
   in the adjacent label line.

---

# PART 4 — SPACE, GRID, LAYOUT ARCHITECTURE

## 4.1 ⊘ AUDIT

1. Prior layouts were symmetric dashboard-center: title on top, content below, cards in
   rows — the default of every admin template on earth. Nothing about the ARRANGEMENT was
   ours. The broadsheet identity must live in the bones, not the paint.
2. The 3+9 split was asserted but not systematized: no rules for when the left column
   collapses, no vertical rhythm spec, no margin architecture.
3. Elevation was gestured at ("3 planes") without behavioral rules — when does a drawer open
   vs. an inline expand? Undefined = improvised = inconsistent.

## 4.2 ✦ SPEC — the sheet anatomy (every console screen)

```
┌────────┬─────────────────────────────────────────────────────────┬────┐
│        │  FOLIO STRIP · 32px · sheet nº · dateline · IST · ◉     │    │
│  THE   ├──────────────┬──────────────────────────────────────────┤ M  │
│  REG   │              │                                          │ A  │
│  IST   │  THE MARGIN  │            THE WORKING AREA              │ R  │
│  ER    │  (3 cols)    │              (9 cols)                    │ G  │
│        │              │                                          │ I  │
│ 228px  │  title       │   the instrument: tray, certificate,     │ N  │
│        │  count       │   plate, register, press…                │ A  │
│        │  filters     │                                          │ L  │
│        │  metadata    │                                          │ I  │
│        │              │                                          │ A  │
│        ├──────────────┴──────────────────────────────────────────┤ 40 │
│        │  press-notices dock (bottom-left, max 2 slips)          │ px │
└────────┴─────────────────────────────────────────────────────────┴────┘
```

- **Grid:** 12 columns, 24px gutters, max content 1680px, left-aligned in wider viewports
  (a broadsheet is read from its left edge; centered content is a website tell).
- **The Margin (left 3 cols):** sheet title (Zodiak 40), the count (Zodiak 64 where the sheet
  has one), filters as punch-cards, metadata stack, the docket-policy note. The Margin is the
  only place Display voice appears. On sheets with master-detail (04), the Margin narrows to
  2 cols below 1440px.
- **The Working Area (right 9 cols):** the instrument. Ornament-free per LAW II.
- **Vertical rhythm:** 8px baseline grid; section spacing 48px; intra-block 16/24px. The folio
  strip and Register are fixed; only the Working Area scrolls (the Margin scrolls with it but
  its title block is sticky).
- **Column rules:** a visible 1px `--rule` between Margin and Working Area on every sheet —
  the broadsheet's signature vertical. On identity sheets (03/05/08/09) this rule is the
  **microtext spine** (Part 6.3); elsewhere a plain rule (Ration).

## 4.3 ✦ SPEC — the Register (navigation)

- 228px fixed left rail, `--paper-raised`, right edge `--rule-strong`.
- Not icon nav: a printed INDEX. Each entry: sheet number (Machine 12) + name (Supreme 13):
  `04 · ALERT QUEUE`. 40px hit rows, 2px radius.
- Current sheet: solid ink left bar (3px) + small vermilion bookmark tab bleeding 4px over the
  rail's right edge — the only vermilion allowed outside status semantics (it is a physical
  bookmark, not a status).
- Hover: `--paper-sunken` wash, 140ms. No transforms — printed indices don't move.
- Bottom block: operator credential card (name · role · session serial, set like a press ID),
  the NOTE/PLATE lever, and `LEAVE THE DESK` (logout, quiet).
- Collapsed variant (≤1366px): 64px rail showing sheet numbers only; expands on hover-intent
  (250ms delay) as an overlay, never pushing content.

## 4.4 ✦ SPEC — elevation & container behavior

| Plane | What lives there | Behavior |
|---|---|---|
| 0 — The Sheet | Base surface, tables, ledgers | Scrolls; never shadows |
| 1 — Index Card | Cards, dossier panels, punch-card filters | `--shadow-card`; 3px radius; NEVER moves on hover |
| 2 — The Drawer | Selection details, The Index (⌘K), Examiner | Slides from right (360–480px) or top (Index), 280ms feed ease; scrim `rgba(ink, 0.25)`; dismiss = Esc/scrim/X |

**There is no plane 3.** No center modals exist in this product. Confirmations are Seals
(LAW IV); complex flows are Drawers; the only full-screen takeovers are Login and the
1280px Desk Gate. This single rule removes the entire modal-stacking class of UI rot.

Inline expansion (Worksheet rows, ledger detail rows) is Plane 0 behavior: the row unfolds
with the feed motion, pushing content — used when context must remain visible; Drawers are
used when the detail replaces attention.

## 4.5 ✦ SPEC — responsive policy

| Range | Behavior |
|---|---|
| ≥1680px | Grid caps; extra space becomes right margin beyond the Marginalia (broadsheet gutter) |
| 1440–1679 | Reference design |
| 1366–1439 | Margin drops to 2 cols; dossier pane min-width enforced |
| 1280–1365 | Register collapses to 64px; Comparator becomes Drawer-only |
| <1280 (console) | THE DESK GATE: full-screen NOTE card — "A wider desk is required. The press prints on sheets no narrower than 1280 pixels." |
| <1280 (public) | Landing/Login fully responsive to 360px — the note itself scales beautifully; public pages have no gate |

---

# PART 5 — ICONOGRAPHY & ENGRAVED GLYPH LANGUAGE

## 5.1 ⊘ AUDIT

No icon system was ever specified. Prior builds borrowed nothing consistent; glyphs were
ad-hoc inline SVGs with mixed stroke weights (1.25/1.5/1.6 observed in code review). An
unspecified icon language is where "generic" re-enters through the back door — one imported
icon pack and the whole engraving conceit collapses.

## 5.2 ✦ SPEC — the engraved glyph standard

- **Construction:** 20×20 grid, 1.5px stroke, squared terminals, miter joins, no fills EVER.
  Corners of the grid respected — glyphs are drawn as if scribed with a ruling pen.
- **The engraving accent:** each glyph may include at most one 0.75px hatch detail (a short
  parallel-line shade) — this is what makes the set ours and not Lucide-with-extra-steps.
- **Sizes:** 16 (inline), 20 (default), 28 (empty states). Never scaled between sizes —
  each size is drawn (strokes re-weighted) to stay optically 1.5px.
- **Color:** `currentColor` only. Never intaglio green (reserved for hatching), never filled.
- **Set (28 glyphs, complete):** examine (loupe) · seal · stamp-cancel · feed (paper arrow) ·
  register (book) · plate (diamond die) · thread (S-curve) · punch (circle-void) · lever ·
  serial (## in frame) · dossier · routing (slip arrow) · freeze (die-cross) · escalate ·
  countersign · fingerprint-chip · press (roller) · station (health) · operator · key-cut ·
  tilt (verify) · replay (scrub) · compare (two rosettes) · margin-tick · misprint ·
  index (card) · lens-off (examiner away) · bookmark.
- Every glyph ships with an `aria-label` string in the lexicon file; decorative uses set
  `aria-hidden` explicitly.

## 5.3 ✦ SPEC — severity marks (never color-alone)

| Band | Mark (printed shape) |
|---|---|
| CLEAN | 3px hairline dash |
| WARMING | solid 3px square |
| HOT | 3px double-rule (two stacked strokes) |
| CRITICAL | solid triangle (bleed-printed, vermilion) |
| IMMINENT | triangle + overprint ring (the "double-struck" mark) |

## 5.4 ✦ SPEC — the cursor set

Default: system arrow (never custom — precision tools don't gimmick the pointer).
Plate sheets only: crosshair over canvas, loupe cursor while lens-zoom modifier held.
Hold-Seals: the cursor is irrelevant by design — the control communicates, not the pointer.

---

# PART 6 — TEXTURE, PAPER & SURFACE PHYSICS

## 6.1 ⊘ AUDIT

v1 specified "3% grain" as a checkbox. Grain without physics is an Instagram filter. If the
surface story is paper, the surface must BEHAVE — receive ink, show impressions, age — or the
texture is decoration and dies by LAW II.

## 6.2 ✦ SPEC — paper

- **Fiber texture:** a tiled 240px SVG of literal short fiber strokes (not noise) at 1.6%
  ink opacity on `--paper` and `--paper-raised` in NOTE; at 2.2% cream on PLATE. Rendered via
  CSS `background-image` (data-URI, cached); never on data tables (Ration).
- **Impression physics:** pressed states (buttons, punch-cards, rows on `:active`) darken to
  `--paper-sunken` AND inset their top border 1px — paper compresses, it doesn't tint.
- **Aging:** the SLA-driven document aging maps burn-ratio → interpolation from `--paper` to
  `--paper-aged` plus 0.5px increase of its rules — old paper darkens and its print spreads.
  Applied ONLY to slip SLA strips and case stubs (not whole screens).
- **Deckle edge:** press-notice slips and the Routing Slip carry a subtle torn top edge
  (SVG clip-path, 3px amplitude) — they were pulled from the press.

## 6.3 ✦ SPEC — microtext (the security feature that is also our texture)

- A 4px-tall repeating text pattern `ARGUSPRISM·ARGUSPRISM·` rendered as an SVG pattern
  stroke, usable anywhere a hairline rule is structural: the Margin spine (identity sheets),
  certificate borders, the seal ring, SLA strips (where the text ERODES character by
  character as the deadline burns — the countdown is literally consumed).
- At reading distance it is a rule; zoomed, it is words. Judges with sharp eyes get a gift.
- Budget: max two microtext elements per sheet (Ration).

## 6.4 ✦ SPEC — the watermark behavior

After 90s idle (no pointer/key/scroll), the WATERMARK rosette fades in across the Working
Area over 3s to 8% ink, breathing at ±1% over 8s cycles. First input dissolves it in 400ms.
Suppressed on Plate sheets (the plate is never idle) and under `prefers-reduced-motion`
(static appearance, no breathing).

---

# PART 7 — MOTION: THE PRESS MECHANICS SYSTEM

## 7.1 ⊘ AUDIT — where smoothness was going to die

1. Prior specs mixed metaphors: "spring" easings (v2) beside "mechanical" claims. Springs
   bounce; presses don't. One physics or none.
2. No interruption policy: what happens when the operator acts mid-animation? Undefined =
   janky by default.
3. The v2 landing marquee thrashed the compositor (measured: the screenshot pipeline starved).
   Decorative infinite animation is banned; it also violated LAW V's spirit.
4. No stagger caps, no reduced-motion equivalences, no compositor budget. "Smooth and slick"
   is an engineering contract, not an adjective — Part 14 carries the numbers.

## 7.2 ✦ SPEC — the physics

Everything in this product moves like a precision press: **fast attack, damped settle, zero
overshoot beyond one 2% correction.** Light (verification pulses) is the only thing that
eases differently — linear, because light doesn't accelerate.

| Token | Curve | Duration | Used by |
|---|---|---|---|
| `--press-out` | cubic-bezier(0.16, 1, 0.3, 1) | — | default ease for all movement |
| `--press-settle` | cubic-bezier(0.34, 1.02, 0.44, 1) | — | strikes landing (≤2% overshoot) |
| `--light-linear` | linear | — | thread pulses, verification sweeps |
| `--dur-hover` | | 140ms | washes, ink hovers |
| `--dur-feed` | | 240ms | rows entering, drawer slide, inline unfold |
| `--dur-wipe` | | 320ms | sheet change, mode flip |
| `--dur-draw` | | 600ms | line/border draw-on (once per element ever) |
| `--dur-strike` | | 90ms in + 220ms settle | seals, stamps, punches |
| `--dur-hold` | | 900ms linear | hold-to-authorize fill |

## 7.3 ✦ SPEC — the motion catalogue (every animation in the product)

| # | Name | Trigger | Spec | Reduced-motion |
|---|---|---|---|---|
| M1 | Row feed | list insert | translateY(-6px)→0 + fade, dur-feed, stagger 30ms cap 6; beyond 6, instant | fade only |
| M2 | Seal strike | hold complete | ring scale 1.06→1.0 press-settle, ink spread 220ms | instant state + check |
| M3 | Hold fill | Seal press | radial ink fill, linear 900ms; release <100% = drain back 200ms | unchanged (safety) |
| M4 | Border draw | certificate/doc first mount | stroke-dashoffset draw, dur-draw; once per entity per session (session-cached) | fade in |
| M5 | Plate wipe | route change | horizontal ink wipe 320ms; content pre-rendered beneath | crossfade 150ms |
| M6 | Mode flip | NOTE/PLATE lever | same wipe, vertical | instant |
| M7 | Thread pulse | ledger verify | a 2px light travels the full spine, light-linear, duration = min(entries×8ms, 2400ms) | progress % text |
| M8 | Microtext erosion | SLA burn | characters set to ink-faint progressively; pure CSS steps() on a clipped span; recomputed per minute, not per frame | static % label |
| M9 | Overprint land | status change | stamp: scale 1.12→1 rotate ±1° (deterministic per text), dur-strike | instant |
| M10 | Cancellation wave | freeze-campaign | outward stagger 40ms/copy, each copy fades to 30% + cancel-cross draws 150ms | simultaneous |
| M11 | Watermark surface | 90s idle | 3s fade to 8%, 8s breath ±1% | static, no breath |
| M12 | Aperture perturb | stream velocity | folio rosette redrawn ≤1/2s with new distortion param; CSS transition between paths 400ms | static states |
| M13 | Letterpress digit | TOTP entry | scale 1.08→1, 90ms | instant |
| M14 | Drawer slide | plane 2 open | translateX 100%→0, dur-feed; scrim fade parallel | fade |
| M15 | Loupe lens (Plate) | modifier held | canvas-level 1.4× local magnification following cursor at 60fps | disabled |
| M16 | Replay scrub | scrubber drag | state interpolation at drag-rate; rosette params tween 120ms behind thumb | stepped |
| M17 | Landing lens travel | scroll position | transform-only on passive listener; lens tweens between anchors at scroll velocity, no scroll-jack | static crops |
| M18 | Feed-the-press | folio counter click | accumulated rows M1-feed in, counter decrements per row | instant batch |

**Interruption policy:** every animation is interruptible by its owning interaction — a second
action retargets from current values (CSS transitions native behavior; JS tweens must read
current, never restart from origin). The single exception: M3 hold-fill cannot be "skipped"
— it IS the safety.

**The budget (hard):** per user action, at most one M-catalogue entry ≥240ms plays. Ambient
animation allowed concurrently: M8, M11, M12 only. Everything animates `transform`/`opacity`
exclusively; layout-affecting properties are banned from transitions (lint-enforced list).

## 7.4 ✦ SPEC — loading language

No spinners exist. Loading is UNPRINTED PAPER:
- Table/ledger skeleton: ruled rows present, content areas as faint ink-wash bands (static,
  NO shimmer — shimmer is the template tell), then simple fade-in of real rows.
- Document skeleton: border + letterhead print immediately (M4), fields typeset as they arrive.
- Known-duration jobs (AutoSTR): the press-line states themselves are the progress UI.
- Unknown waits >600ms: the folio aperture shows a slow scan; >4s adds a mono line
  `THE PRESS IS WORKING · 6s`. Honest, quiet, never a wheel.

---

# PART 8 — THE GUILLOCHÉ ENGINE

## 8.1 ⊘ AUDIT

"Signals parameterize curves" was hand-waving. Without locked mathematics the rosettes become
random squiggles — unfalsifiable, unreproducible, and (worst) meaningless. The engine is the
product's artistic signature AND an evidence display; it gets an engineering spec.

## 8.2 ✦ SPEC — the mathematics

Base form: sum of three hypotrochoid harmonics, sampled at 720 points, rendered as a single
closed stroke path.

```
For t in [0, 2π), point P(t) = Σ h=1..3 of:
  A_h · [ cos((R_h)·t + φ_h) , sin((R_h)·t + φ_h) ]
  modulated by asymmetry: r(t) = 1 + α·sin(t + φ_α)·D
```

Deterministic parameter mapping (inputs: S1..S6 in [0,1], W = WarmthScore/100):

| Parameter | Source | Range | Visual meaning |
|---|---|---|---|
| A₁ (base amplitude) | fixed | 1.00 | the rose's body |
| A₂ | S1 (dormancy activation) | 0.18–0.42 | inner petal depth |
| A₃ | S2 (velocity anomaly) | 0.06–0.22 | fine outer ripple |
| R₁ | fixed | 6 | six-fold base symmetry (the six signals) |
| R₂ | 6 + round(S3·4) | 6–10 | petal count drift (structuring) |
| R₃ | 12 + round(S4·6) | 12–18 | fine tooth count (device churn) |
| φ₂ | S5 · π/3 | | phase slip (profile mismatch) |
| φ₃ | S6 · π/2 | | outer phase slip (taint exposure) |
| α (asymmetry) | W² · 0.35 | 0–0.35 | THE WARMTH READ: quadratic so clean accounts stay serene and the top band visibly deforms |
| jitter | W · 0.8px | 0–0.8px | line tremor at high warmth (seeded PRNG from account serial hash — deterministic) |

Properties guaranteed: same inputs ⇒ identical rosette (Law 2); inputs derive ONLY from
signals/score, never PII (a rosette cannot leak identity); W=0 yields perfect 6-fold
symmetry (the visual definition of "clean").

## 8.3 ✦ SPEC — render tiers & performance

| Tier | Size | Renderer | Rules |
|---|---|---|---|
| T1 thumbnail | 12–16px | pre-rendered SVG path, cached keyed by quantized params (S quantized to 1/16, W to 1/32) → cache hit rate >95% in lists | 2 harmonics only; communicates calm-vs-distorted at squint distance (CI screenshot-verified) |
| T2 card | 40–96px | SVG, M4 draw-on on first mount, then static | full 3 harmonics |
| T3 focal | 120–220px | SVG, draw-on, optional param transition when live score changes (400ms path morph) | full detail + microtext ring option |
| T4 plate | canvas | single canvas renderer draws ALL nodes; path caching per node; devicePixelRatio-aware | see Part 10 Sheet 06 budgets |

Generation cost budget: T1 ≤0.3ms, T2/T3 ≤2ms (measured on reference hardware, enforced by
perf test). The engine is a pure function module (`rosette.ts`) with zero DOM dependencies —
unit-tested against golden SVG snapshots.

## 8.4 ✦ SPEC — derived artifacts

- **Master Rosette** = engine output at canonical params (all S=0.5, W=0, α forced 0) —
  "the institution's own note."
- **Favicon** = T1 with live W of the worst open alert; struck-through path overlay on
  disconnect.
- **Seal ring** = T2 enclosed in 48-tooth serration; strikes via M2.
- **Watermark** = Master at 8% ink.
- **Generation-degraded copies** (Recruiter sheet) = parent's params + per-generation noise
  injection (seeded): amplitude noise ±4%·gen, phase noise ±3°·gen — photocopy decay, honest
  to graph distance.

---

# PART 9 — COMPONENT CANON: FULL AUDIT, ANATOMY & STATES

Rules of the canon: every component below ships in Storybook with ALL listed states, both
modes, keyboard operation, and a torture-case story (Part 15 data) before any sheet may use
it. A component absent from this canon may not be invented sheet-side; propose it for the
canon or use typography.

## 9.1 THE SLIP (examination row) — the most important 44 pixels in the product

**⊘ AUDIT:** prior alert rows were generic table rows with chips. The slip must be readable
in under one second at a glance distance of 60cm — severity, identity, evidence, deadline —
without reading left-to-right like prose.

**✦ ANATOMY (left → right, 44px tall):**
1. Severity mark (Part 5.3) — 12px column, bleed-printed to the row's left edge
2. Docket number `Nº 3` — Machine 12, ink-mut (the server-computed urgency order)
3. Serial ref `UBI-••••-0847` — Machine 13
4. T1 rosette — 14px, vertically centered (the one-glance warmth read)
5. Summary — Supreme 13, single line, middle-truncated at container
6. Signal footnotes `S3 S5` — Machine 11, superscript style, ink-mut
7. Amount at risk `₹4.2 Cr` — Machine 13/600
8. SLA microtext strip — 64px erosion strip (M8); overdue = vermilion re-ink + `OVERDUE 2h 14m`
9. Status marks — `EXAMINED` mini-print if acknowledged; assignee initials in a punch ring

**States:** rest · hover (paper-sunken wash, 140ms) · examined (docket number struck through,
row at 85% ink) · SELECTED (3px ink left bar + reserve-wash; the dossier binds to this) ·
critical (vermilion wash + mark; NEVER moves or pulses — critical is heavy, not jumpy) ·
frozen (`DIE CANCELLED` micro-overprint at right) · skeleton (ruled, ink-wash bands).

**Keyboard:** J/K traverse (moves SELECTED), Enter focuses dossier, A acknowledge,
E escalate (opens Seal), Shift+F false-positive (requires reason field in drawer).

**Torture:** 3-line Devanagari holder names (clamp to 1 line + tooltip), ₹99,99,99,999
(column min-widths lock; amount never wraps), docket number 120+ (3-digit reserve).

## 9.2 THE SEAL (hold-to-authorize) — the authority control

**✦ ANATOMY:** a 40px (or 56px focal) circular control: serrated seal ring (48 teeth),
action glyph center, label right (`FREEZE CLUSTER`). Idle: ruled outline, ink.
On press: radial ink fill rises linearly 900ms (M3) while the ring's serration engraves in;
at 100% the strike (M2) fires, the action executes, and the resulting Overprint lands (M9).
Early release: ink drains back in 200ms; nothing happens; no error.

**Variants:** vermilion (freeze / cancel / reject) · ink (approve / seal / sign) · reserve
(escalate / submit). Disabled: inked-out (40% + diagonal hatch) + tooltip stating required
authority (`Requires MLRO authority`) — RBAC made legible.

**States:** idle · hover (ring darkens) · filling (SR: `aria-valuenow` announced) · struck
(brief) · executing (server round-trip: ring rotates its serration slowly — the ONLY rotating
element in the product, expected under 2s) · failed (`MISPRINT` slip + ring intact —
retryable) · disabled-by-role.

**Keyboard:** focus + hold Space or Enter for the same 900ms; identical fill feedback.
**A11y:** `role="button"`, `aria-keyshortcuts`, hold-progress announced at 50%.

## 9.3 THE OVERPRINT (status stamp)

Diagonal (−1° to +1°, deterministic from text hash) stamped status: `DIE CANCELLED` ·
`SPECIMEN` · `SEALED` · `SUBMITTED` · `RETURNED` · `MISPRINT` · `IMPRESSION Nº n` ·
`EXAMINED`. Supreme 700 caps, letterspaced +10%, 2px double-rule border, ink-bleed edge via
one cached SVG displacement (never runtime filters). Sizes: micro (row, 9px) · body (card,
11px) · full (certificate diagonal, 20px, 24% opacity so data beneath stays legible).
Lands with M9 exactly once — re-renders never replay the strike (session-cached flag).

## 9.4 THE WORKSHEET (evidence trail + counterweight) — the credibility engine

**⊘ AUDIT:** scores without visible working are astrology to a court. This component is why
the product is defensible; it outranks every aesthetic in this document.

**✦ ANATOMY:** an inline-unfolding section titled `BASIS OF EXAMINATION` (Machine 11 label):
- Two ruled columns: `INDICATIONS` | `CONTRA-INDICATIONS`
- Each line: signal code · plain-language finding (Supreme 13) · contribution weight as a
  hatch-bar (density = weight, intaglio ink) · citation superscript
- Citations resolve at the sheet's foot (or drawer): `3: 14 txns, 09:00–09:14, ₹9,400 avg —
  view register` — every line click-throughs to the raw records that fired it
- Footer line: model version + scored-at timestamp (Machine 11, ink-faint) — evidence is dated

**Behavior:** unfolds inline (Plane 0, feed motion); one Worksheet open per list (accordion);
deep-linkable (`#worksheet=S3`).
**Empty counterweight rule:** if no contra-indications exist, the column prints
`NONE RECORDED` — never hidden; absence of exoneration is itself information.

## 9.5 HATCH CHARTS (the proprietary data-viz grammar)

**⊘ AUDIT:** default chart libraries would reintroduce gradients, tooltip confetti, and the
generic look in one import. Banned. The grammar below is drawn with our own thin renderer
(SVG; one canvas variant for the pulse strip).

**✦ THE GRAMMAR:**
- **Series (score history):** 1.5px ink line; the area beneath hatched with 45-degree
  intaglio strokes whose DENSITY maps value (4 density steps); band thresholds as labeled
  hairlines; events (freeze, alert) as margin ticks with footnote numbers.
- **Distribution (fairness):** horizontal hatch-bands per segment; median as ink tick;
  annotation lines in plain language (`Segment F flags 1.2x baseline — within tolerance`).
- **Delta chips (KPIs):** value in Machine 600 + engraved chevron (up / down / flat); no
  red-green moralizing — direction is geometry, judgment is the operator's.
- **Countdown:** the M8 microtext erosion strip (SLA, session expiry).
- **Pulse strip (Command Center):** 60s rolling tx/sec as a seismograph line on canvas,
  1px, no fill, 30fps cap.
- **FORBIDDEN forever:** pie charts, donuts, area gradients, 3D anything, dual-axis charts.

Axes: Machine 11 labels, hairline rules, no gridlines beyond 25% steps. Every chart carries a
printed caption — charts in this product are FIGURES with captions, like a technical book.
Hover: a ruled crosshair + margin readout (never floating tooltip cards).

## 9.6 THE LEDGER TABLE

Machine 13 rows (34px dense), Supreme 11/700 caps headers with etched sort carets, rule-token
row separators, first column often a dateline. Virtualized past 60 rows (fixed row height
makes this trivial). Cursor pagination as a full-width quiet row: `CONTINUE THE REGISTER`
(loads 100; keyboard PageDown). Column resize: none — columns are designed, not user-managed;
a broadsheet does not reflow for readers. Horizontal overflow: the table's container scrolls
with a printed edge-shadow cue; the sheet body never scrolls sideways.
Row expansion (where specified): unfolds an indented detail block ruled like a sub-ledger.

## 9.7 THE INDEX CARD DRAWER (plane 2)

420px right drawer on paper-raised; header = Machine ref + title + close; body = free
composition from canon parts; footer = actions (Seals right-aligned). Opens with M14;
Esc / scrim / X closes; focus-trapped; returns focus to invoker. One drawer at a time —
opening another replaces it (no stacking, ever).

## 9.8 THE PRESS-NOTICE (toast)

Bottom-left dock. A narrow slip (max 360px) with deckle top edge: dateline (Machine 11) +
message (Supreme 13) + optional single action link. Info = ink · success = verified ·
error = `MISPRINT` header + vermilion rule. Auto-dismiss 6s (errors persist until dismissed).
Max 2 visible; further collapse to `+3 NOTICES` slip opening a drawer list. Notices NEVER
cover the folio, dossier actions, or any Seal. `role="status"`; errors `role="alert"`.

## 9.9 THE INDEX (command palette, Cmd/Ctrl+K or `.`)

A top drawer styled as a card-catalogue tray: giant ruled input (`Search the press…`),
results grouped `SHEETS · ACCOUNTS · ALERTS · CASES · ACTIONS`, rows print with a 12ms/char
typeset effect capped at 80ms total (instant under reduced-motion). Fuzzy match on serials
tolerant of dash/bullet noise. Enter navigates; Cmd+Enter opens in dossier/drawer without
leaving the current sheet. Recent examinations pinned when the query is empty. Fully
keyboard-driven: arrows, Tab between groups.

## 9.10 THE FOLIO (top strip)

32px, paper-raised, bottom rule. Left: `VOL III · SHEET 04 — ALERT QUEUE` (Machine 11).
Center-left: dateline + live IST clock (Machine 11; seconds tick without layout shift —
fixed-width digits). Right cluster: WS state as the aperture rosette (M12) · new-work counter
(`14 NEW SHEETS — FEED`, appears only when >0; Enter or click feeds via M18) · operator
serial. The folio is identical on every sheet — the product's pulse line, and the ONLY
ambient-live region besides the marginalia.

## 9.11 THE MARGINALIA (right rail)

40px, transparent; structural microtext rule on identity sheets. Live event ticks: each WS
event prints a 6px registration tick (ink-faint; alert events in their severity ink) that
drifts up and fades over 60s — velocity is visible as tick density, peripherally, silently.
Clicking the marginalia opens the feed drawer (recent events ledger). Under reduced-motion,
ticks appear without drift.

## 9.12 THE COMPARATOR (SPECIMEN vs SUBJECT)

Invoked with `C` on any account context. A drawer (or split panel at 1440px and above):
left the cohort baseline (`SPECIMEN — segment median`), right the subject; two T3 rosettes
above a deviation ledger (metric · specimen · subject · deviation as signed hatch-bar).
Baselines from the aggregates endpoint, labeled with cohort definition + n (`Salaried, 2–5y
age, n=1,204`). No verdict language — deviations are printed; judgment belongs to the
operator and the Worksheet.

## 9.13 THE REPLAY (time scrubber)

A 48px bottom bar on Plate and Impression-History surfaces: timeline rule with event-density
hatching above it, scrub thumb as a plate-registration mark, datelines at the ends, keyboard
Left/Right (event-step) and Shift+Left/Right (hour-step). Dragging time-travels the bound
visualization (M16): rosettes tween to historical parameters, edges thin and thicken, alerts
strike in sequence. A `LIVE` chip returns to now (and re-locks to the stream). Powered by the
event log via feed cursors; scrub state deep-links (`?t=2026-07-14T09:00`).
This component is the demo's centerpiece; it carries a dedicated perf story (Part 14.4).

## 9.14 THE ROUTING SLIP (escalation handoff)

Printed on Seal-escalate: a deckle-edged document capturing the analyst's basis (free text,
required, minimum 80 characters — the design enforces professional handoffs), an auto-attached
Worksheet snapshot, requested-action punch-marks (`FREEZE / REVIEW / STR`), and the analyst's
countersignature line (auto-signed with credential + dateline). It pins to the case top for
the MLRO, whose Seal countersigns the SLIP itself (not an abstract button). Returned-with-
reason prints `RETURNED` + the MLRO's note beneath the analyst's — the paper conversation
accumulates, audit-real.

## 9.15 CONTROLS (forms)

- **Ruled input:** label (Supreme 11/700 caps) above a ruled line; value in ink; machine-
  format fields (serials, amounts) render Machine live. Focus: rule thickens to 2px reserve +
  focus ring. Error: vermilion rule + `RETURNED — reason` micro-slip beneath (never only red).
- **Index-card select:** the field prints the current value; opening drops a small card stack
  (max 8 visible, then internal scroll); options are rows, not pills.
- **Press lever (toggle):** a 36px two-position lever with engraved track; state labels
  printed at both ends; snaps with press-settle. Used for NOTE/PLATE and simulator RUN/PAUSE.
- **Punch-mark (checkbox):** a ring that punches solid on check (90ms).
- **Buttons:** PRIMARY = solid ink plate (paper text) · SECONDARY = ruled outline · QUIET =
  underlined text. All: 2px radius; active = 1px depress + sunken. One PRIMARY per view.
  Destructive actions are never buttons — they are Seals (LAW IV).
- **Search field:** the ruled input scaled to 20px with the examine glyph left; `/` focuses.

## 9.16 THE CERTIFICATE HEADER (account / case identity block)

The engraved letterhead: T3 rosette left; serial + holder line (redaction bar + trailing 4) +
class/status; denomination-corner score (Machine 600, 28px) top-right; the whole block ruled
top and bottom with microtext on identity sheets. FROZEN mounts the full-diagonal Overprint.
Draw-on (M4) once per entity per session.

## 9.17 THE REDACTION BAR (PII masking)

A solid ink bar with trailing-4 characters (`XXXX 4471` rendered as solid blocks + digits),
Machine face, fixed 6-block width regardless of true length (no length leaks). Tooltip:
`MLRO clearance required`. MLRO unmask = a small inline Seal (900ms hold, audit-logged);
unmasked values auto-re-mask after 60s or on sheet leave — clearance is momentary, and the
re-masking prints a tiny `RESEALED` mark. RBAC made visible and demo-narratable.

## 9.18 THE STATION (service health)

A 72px engraved station diagram per service: name (Machine 11), state dot (ink = up,
reserve = degraded, vermilion = down; PLUS shape coding — solid / half / void), uptime in
mono, last-incident dateline. Down-state adds a severed-thread mark. No green — "up" is not
a celebration; it is normalcy (ink).

## 9.19 THE PUNCH-CARD (filter chip)

Filters as small cards with punch-holes: unpunched (outline ring) = inactive; punched
(solid) = active. Multi-select groups ruled together with a `CLEAR` quiet link. Active
filters echo in the Margin's metadata stack so state is always printed, never hidden in
chip color alone.

## 9.20 THE STUB (attachment / evidence receipt)

Evidence items (graph export, timeline export, generated package) print as receipt stubs:
serrated left edge, type glyph, name (middle-truncated), size + dateline (Machine 11),
added-by initials. Click = drawer preview; download = quiet link (audit-logged server-side).

## 9.21 THE DESK GATE & SYSTEM SHEETS

- **Desk Gate** (console under 1280px): full-viewport NOTE card, Master watermark, Zodiak
  line `A wider desk is required.`, Supreme detail line, no dismiss.
- **404 MISPRINT:** off-register double-print of the sheet title (2px ink-offset ghost),
  `THIS SHEET DOES NOT EXIST`, quiet link `RETURN TO THE PRESS`.
- **WS-lost:** folio aperture struck-through + marginalia note `THE PRESS HAS STOPPED —
  reconnecting…`; on recovery, backfill completes FIRST, then the aperture restores (the
  order is visible: honesty).
- **Session expiry:** drawer (not modal) with a miniature teller block: `Your session has
  lapsed. Present your credentials.` TOTP fast-path; current sheet state preserved beneath.

## 9.22 THE EXAMINER PANEL (assistant)

Loupe button (56px, bottom-right, above the notice dock). Opens a 400px drawer: transcript
on paper-raised; operator lines right-ruled; examiner lines left-ruled with typeset-in
streaming (SSE-paced; never slower than the stream — the pacing IS the stream). Every figure
in an answer renders as a footnote-cited Machine value: `38 [3]` resolving at the message
foot: `3: /api/v1/alerts · 09:14:02 IST`. Suggestion chips = three pre-printed request slips
per sheet context. Refusals in voice: `I examine only matters of this institution.`
Offline: the loupe glyph lies at 45 degrees, tag `THE EXAMINER HAS STEPPED AWAY`; input
disabled; the rest of the product untouched.

## 9.23 MACHINE PRIMITIVES (the LAW III enforcement layer)

`<Num>` `<Money>` `<When>` `<Ref>` `<Fingerprint>` `<Serial>` — the only sanctioned renderers
for machine data. `<Money>` implements en-IN lakh/crore + short-scale hover; `<When>`
implements dateline / timestamp / relative rules (relative only in live contexts, full value
on hover); `<Fingerprint>` renders last-8 with the label `DOCUMENT FINGERPRINT` and NOTHING
else, ever (Law 3 of PRD-V3). Raw digits in JSX text nodes fail lint.

## 9.24 THE WATERMARK LAYER

A fixed, pointer-transparent layer implementing M11 (idle surfacing) and the login develop
effect (Sheet 01). One instance app-wide; sheets opt in via a flag; Plate sheets and
reduced-motion sessions receive the static variant.

---

# PART 10 — THE SHEETS: EVERY SCREEN, AUDITED & PERFECTED

Each sheet entry follows the same discipline: PURPOSE → ⊘ AUDIT (what was lacking or lame) →
✦ LAYOUT (zones, ASCII where useful) → THE ART (the one unforgettable element, per the
Ration) → INTERACTIONS & KEYBOARD → STATES (loading / empty / error — mandatory trio) →
ACCEPTANCE (measurable gates).

Global to all sheets: the chrome of Part 4.2, folio numbering per Appendix D, URL-addressable
state, and the trio of states. **A sheet missing any state design is not reviewable, let
alone shippable.**

---

## SHEET 00 · LANDING — "THE NOTE ITSELF"

**PURPOSE:** the public face; 15 seconds to communicate concept + credibility; route to login.

**⊘ AUDIT:** the prior landing (v2, shipped) was a template hero: centered gradient headline,
stats band, card grid — indistinguishable from ten thousand SaaS pages. The v3-draft (prism
beam) was better but still "dark hero with glow art" — the AI default. Neither made the
VISITOR do anything memorable. A landing is unforgettable when it gives the visitor an
ACTION they have never performed, not just a picture they have not seen.

**✦ LAYOUT & CONCEPT — "the banknote under examination":**
The entire landing IS one oversized engraved banknote, rendered at viewport scale on cotton
paper. Not a website with a banknote picture — the page has the anatomy of a note:

```
┌─────────────────────────────────────────────────────────────────┐
│  ARGUS PRISM          [engraved border begins drawing on load]  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  serial Nº AP-2026-0714-…   (today's real date, Machine)  │  │
│  │                                                           │  │
│  │        THE PROMISE TO DETECT          [Master Rosette]    │  │
│  │        Zodiak 96, engraved lettering                      │  │
│  │                                                           │  │
│  │  "Watches every account. Scores the warming mule          │  │
│  │   before the money moves. Seals the case the law          │  │
│  │   requires — in under an hour."                           │  │
│  │                                                           │  │
│  │   [ ENTER THE PRESS ]      [ EXAMINE THE NOTE ↓ ]         │  │
│  │  microtext line: ARGUSPRISM·ARGUSPRISM· (they will zoom)  │  │
│  └───────────────────────────────────────────────────────────┘  │
│   guilloché corner ornaments (draw-on, 600ms, staggered)        │
└─────────────────────────────────────────────────────────────────┘
```

Below the fold, **THE EXAMINATION**: five sections, each = one security feature of the note
under a traveling loupe, each mapping to a real product engine:

| Security feature examined | Product truth revealed |
|---|---|
| The microprinting | FlowGraph — "read the transactions others cannot see" |
| The watermark (hold the note to light) | Hidden-network detection — taint 4 hops deep |
| The security thread | The HMAC audit chain — "one unbroken line" |
| The see-through register (front/back alignment) | Recruiter Mapper — two sides of one campaign |
| The intaglio (feel the raised ink) | WarmthScore — "risk you can feel before it arrives" |

The loupe travels between sections on scroll (M17: transform-only, passive listener, zero
scroll-hijack). Inside the loupe's circle, the note's engraving appears at 3x with the
relevant feature animated once (thread pulse, watermark surfacing). Copy is set beside each
station like a curator's card: Supreme 16, max 62ch, one claim + one real number each
(numbers from the live `/metrics/pulse` endpoint where the API is reachable — even the
landing obeys Law 2; unreachable = the claims stand without live figures, no fakes).

Then: a stats strip (printed table, four figures, Machine 600), the creed block (Zodiak 40,
hanging punctuation), sign-in CTA, and a footer set like the note's imprint line
(`UNION BANK OF INDIA · THE SECURITY PRESS · V3`).

**THE ART:** the border itself. A full-perimeter guilloché frame that draws-on over 1.2s at
first visit (session-cached; instant thereafter), corners resolving last. Nobody scrolls a
banknote every day.

**INTERACTIONS:** scroll (passive), loupe follows anchors; `EXAMINE THE NOTE` smooth-scrolls
to station one; Enter-the-press routes to login. No parallax beyond the loupe layer.
Konami-free; no easter eggs on the public page (credibility surface).

**STATES:** loading = paper + letterhead print first, border draws (the load IS the intro);
no empty state (static content); error (pulse endpoint down) = stations show claims without
live figures — designed absence, not zeros.

**ACCEPTANCE:** LCP < 1.8s on landing; loupe at 60fps on a 2020 laptop; fully responsive to
360px (the note scales; stations stack; loupe becomes static magnified crops under 768px or
reduced-motion); zero layout shift after border draw (CLS < 0.02).

---

## SHEET 01 · LOGIN — "THE WATERMARK"

**PURPOSE:** authenticate + MFA per PRD 5.1, in-character, zero credential material rendered.

**⊘ AUDIT:** v2's login was a competent card — and completely forgettable. Worse, it treated
MFA as a chore bolted after the form. In this product authentication IS the first act of the
fiction: you are proving you are not a counterfeit. The design must make verification feel
like the product's own subject.

**✦ LAYOUT:** a single sheet of near-blank cotton paper, centered credential block (max
400px), the Master Rosette watermark at 0% visibility beneath everything. Folio reads
`SHEET 01 — THE TELLER`.

**THE ART — credentials develop the watermark:** every field completed raises the watermark's
opacity one step (0 → 3% → 6% → 8%): typing literally holds the note closer to the light.
On successful TOTP, the watermark snaps to 12% for one beat, the `SPECIMEN` overprint (which
sat across the form at 24% the whole time — the operator was a specimen until proven) LIFTS
off the sheet (M9 reversed), and the plate-wipe carries them to Sheet 04. The entire
sequence: 1.4s, skippable by any key, plays once per session.

**FLOW & STATES:**
1. Email + password (ruled inputs; caps-lock warning as micro-slip; error = `RETURNED —
   credentials not recognized` without disclosing which field).
2. First login: enrolment card — `YOUR KEY IS CUT ONCE.` QR (from otpauth URI; rendered
   client-side; never re-displayable) + manual code behind a `SHOW SETUP CODE` quiet toggle
   (auto-hides in 30s), then straight into code entry. The card carries a printed warning:
   `This code appears exactly once. The press keeps no copy.` (Law 3 as microcopy.)
3. TOTP: six serial slots (Machine 24), letterpress per digit (M13), auto-advance,
   paste-tolerant (pasting a 6-digit string fills all), auto-submit on sixth.
4. Rate-limit state: honest lockout slip `RETURNED — five attempts. The window reopens in
   4m 12s` with a live M8-style countdown.
5. OAuth path: `CONTINUE WITH GOOGLE` as SECONDARY button; returns into the same MFA gate.

**KEYBOARD:** full tab order; Enter submits each stage; Esc clears TOTP slots.
**ACCEPTANCE:** zero secret material in DOM after enrolment stage unmounts (test asserts);
the develop effect runs entirely on opacity (no layout); works at 360px.

---

## SHEET 04 · ALERT QUEUE — "THE EXAMINATION DESK" ★ default landing

**PURPOSE:** the core loop. Triage N alerts/hour with judgment quality a court can stand on.

**⊘ AUDIT:** the deepest deficiency found in the whole review (0.2 #1): the queue was a list
that NAVIGATED to detail, taxing every judgment with a round trip and a lost scroll
position. Also: severity sort is not priority; live inserts rug-pulled the reader; evidence
was two chips deep. All four are structural failures for the product's primary user.

**✦ LAYOUT — master-detail, three zones:**

```
┌─────────┬──────────────────────────┬──────────────────────────────┐
│ MARGIN  │        THE TRAY          │         THE DOSSIER          │
│ (2-3c)  │        (4-5c)            │           (5c)               │
│         │                          │                              │
│ ALERTS  │ ┌ Nº1 ▲ UBI-••-0847 … ┐  │  ┌ CERTIFICATE HEADER ─────┐ │
│  38     │ │ Nº2 ▲ UBI-••-0851 … │  │  │ rosette · serial · 87   │ │
│ Zodiak  │ │ Nº3 ▣ UBI-••-0823 … │  │  └─────────────────────────┘ │
│  64     │ │ Nº4 ▣ …             │  │  BASIS OF EXAMINATION        │
│         │ │ …virtualized…       │  │  indications | contra        │
│ filters │ └─────────────────────┘  │  [mini-plate: 2-hop teaser]  │
│ punch-  │                          │  ───────────────────────     │
│ cards   │  CONTINUE THE REGISTER   │  [EXAMINED] [⊛ESCALATE]      │
│         │                          │  [OPEN CASE] [⊘ F-POSITIVE]  │
└─────────┴──────────────────────────┴──────────────────────────────┘
```

- **Margin:** the count (Zodiak 64) + `AWAITING EXAMINATION`; severity subtotal hatch-bar;
  punch-card filters (severity, status, assignee, taint-linked); the docket policy note
  (`Ordered by urgency: deadline × severity × taint × exposure`).
- **The Tray:** Slips (9.1) in docket order. Docket order is SERVER-computed (the contract's
  sort param) — the UI never invents priority. Freeze-on-focus per LAW V: arrivals accumulate
  in the folio counter; `FEED ↵` merges them at correct positions with M1 (cap 6 animated,
  rest instant).
- **The Dossier:** binds to the selected slip. Certificate header (9.16, T2 rosette) ·
  Worksheet (9.4) · mini-plate (a 2-hop neighborhood static render, click = Sheet 06
  pre-focused) · SLA line full-form · action rail: `EXAMINED` (quiet), `ESCALATE` (reserve
  Seal → Routing Slip drawer), `OPEN CASE` (secondary), `FALSE POSITIVE` (ink Seal + required
  reason field — the reason is audit-logged; sloppy dismissal is structurally impossible).

**THE ART:** the tray's slips themselves — 38 unique data-drawn rosettes in a ruled column is
the product's identity AS a working surface. No further ornament permitted on this sheet.

**KEYBOARD:** J/K select · Enter dossier focus · A examined · E escalate · O open case ·
Shift+F false-positive · C comparator · F feed · / filter search · . the Index.

**STATES:** loading = 8 skeleton slips + margin count ink-wash; empty = the ONLY perfect
Master Rosette in the console + `No sheets await examination. The press runs clean.` +
the last-cleared dateline; error = MISPRINT block with retry, tray preserved if stale data
exists (marked `AS OF 09:41 IST` — stale is labeled, never silent).

**ACCEPTANCE:** slip → dossier paint < 150ms (prefetch on selection intent — hover 80ms or
J/K rest 120ms); tray at 10,000 alerts scrolls 60fps (virtualized); zero reorder while
selected (LAW V test: 50 ev/s injected, selection stationary).

---

## SHEET 05 · ACCOUNTS — "THE SPECIMEN BOOK"

**PURPOSE:** lookup + full forensic account view (PRD 5.5).

**⊘ AUDIT:** the "cheque book" concept (v1) was charming and WRONG — a cheque is a payment
instrument, not an examination document; the metaphor had no room for evidence. Search was
also under-designed (a bare input), and the timeline was a generic chart.

**✦ LAYOUT — two phases:**

**Phase A — the Book:** Margin holds the search (ruled 20px input, `/` focus) + result count
+ risk-tier punch-cards. Working area: specimen index cards, 3-up grid (2-up ≤1440px):
T2 rosette · serial · masked holder · tier band mark · last-activity dateline. Cards are
Plane 1; Enter/click opens Phase B. Search-as-you-type ≥2 chars, 220ms debounce, results
print with M1 (cap 6).

**Phase B — the Certificate:** the full engraved document on one scrolling sheet:
1. Certificate header (9.16) — with `FROZEN` overprint when applicable.
2. `SPECIFICATIONS` — S1–S6 as a ruled six-row ledger: code · name · plain-language reading ·
   contribution hatch-bar · trend chevron. Each row expands (Plane 0) into its Worksheet
   citations.
3. `IMPRESSION HISTORY` — the score-over-time hatch chart (9.5) with band hairlines, event
   footnotes, and the REPLAY scrubber (9.13) bound to it: scrubbing tweens the header rosette
   through its historical distortions — watch the account learn to lie.
4. `TRANSACTIONS` — Ledger table (9.6), cursor-paginated, columns: dateline · counterparty
   (masked serial, click = that certificate) · channel · amount (`<Money>`) · running flags.
5. `DEVICES` — ledger of IMEI/SIM events; device-churn periods auto-highlighted with a
   marginal brace + footnote.
6. `LINKED PLATES` — static mini-plate of the 2-hop neighborhood; `OPEN THE PLATE` secondary.

Action rail (sticky under header): `COMPARE (C)` · MLRO Seals: `FREEZE` (vermilion) ·
`RESTRICT` · `KYC REVIEW` (ink) — disabled-by-role renders inked-out with authority tooltip.
Unmask flows per 9.17 (momentary clearance, `RESEALED` mark).

**THE ART:** the certificate header's T3 rosette + the Replay-driven rosette morph. The
specimen grid uses T2s — within Ration because Phase A and B never co-display focal art.

**STATES:** Phase A empty (no query) = the book's frontispiece: Master watermark + `Search
the register of accounts.`; no-results = `NO SPECIMEN MATCHES · check the serial` + recent
examinations list; Phase B loading = letterhead prints first (M4), sections typeset as data
arrives (each section independently — one slow endpoint never blanks the document); error
per-section MISPRINT slips with per-section retry.

**ACCEPTANCE:** search keystroke → results < 300ms perceived (debounce included); Phase B
initial paint < 400ms with header from cache when arriving from a Slip (the dossier already
holds the summary — reuse, never refetch-blank); scrub at 30fps minimum on the history chart.

---

## SHEET 06 · NETWORK GRAPH — "THE ENGRAVER'S PLATE" (locked PLATE)

**PURPOSE:** the headline visualization — neighborhood exploration, pattern reading, cluster
freezing (PRD 5.6).

**⊘ AUDIT:** every fraud tool ships a force-directed hairball with colored dots; ours must
read like nothing else while being MORE legible, not less. Prior specs also ignored:
keyboard access to a canvas, what "select" means at 5,000 nodes, and the freeze
confirmation's blast radius (freezing a cluster is the product's most dangerous act).

**✦ LAYOUT:** full-bleed canvas working area; Margin carries: the focused account block
(when arrived via deep-link), pattern punch-cards (`LAYERING · ROUND-TRIP · STRUCTURING ·
FAN-OUT`), the legend card (`READING THE PLATE`), and depth control (1–4 hops as punch
stops). Replay scrubber docks bottom. Folio unchanged.

**RENDERING (the art and the engineering are the same thing here):**
- Nodes = T4 rosettes: radius maps balance (log scale, 6–28px), distortion maps live warmth,
  taint = a hatched stain sector that grows with taint score, the FOCUSED node carries a
  serial tag plate.
- Edges = engraved strokes: width maps value (1–4px), direction as a subtle taper (thick
  end = source), recency as ink opacity. Crossing flows produce natural moiré (free art).
- Patterns (from `/graph/patterns/{type}`): matched subgraphs get a scribed boundary line +
  a footnote flag (`FIG. 2 — ROUND-TRIP, 4 ACCOUNTS, ₹18.6 L CIRCULATED`).
- Layout algorithm: force-directed with deterministic seed (same neighborhood = same layout
  — investigators need spatial memory), 300ms max settle, then FROZEN (no perpetual jiggle).

**INTERACTIONS:**
- Pan (drag/arrows) · zoom (wheel/±, 0.5–3x, folio shows scale like a map) · loupe
  (hold Z: 1.4x lens, M15).
- Select: click node → Index Card drawer (account summary + `OPEN CERTIFICATE`); lasso
  (hold L + drag) scribes a selection line → cluster card: n accounts, aggregate exposure,
  shared devices count, `FREEZE CLUSTER` vermilion Seal. The Seal's card lists EVERY serial
  it will strike (blast radius printed; scrollable; no blind freezes).
- Freeze executes → M10 cancellation wave → struck nodes fade to 30% + cancel-cross; the
  action prints a press-notice with the case/audit ref.
- Keyboard: Tab/arrows traverse nodes in spatial order with a printed focus ring; Enter =
  drawer; the canvas exposes an SR summary (`Neighborhood of UBI-…-0847: 34 accounts,
  3 flagged, 1 pattern match`) and a parallel DOM list (visually hidden) of the top 50 nodes
  by relevance — the Plate is never a black box to assistive tech.
- Replay: scrubbing re-renders historical state at drag rate; edges thin back in time;
  the campaign literally rewinds.

**STATES:** loading = plate etches in (edges draw 300ms, then nodes print); empty (no
neighborhood) = `THE PLATE IS BLANK — no linked flow within 4 hops` + return link; error =
MISPRINT + retry; oversize (>5k nodes) = the sheet prints `EDITION TOO LARGE — showing the
2,000 strongest lines` + a refine control (honest degradation, never silent truncation).

**ACCEPTANCE:** 5,000 nodes: initial render < 800ms, pan/zoom 60fps, hit-test < 4ms;
deterministic layout verified by screenshot diff; deep-link
(`/graph?focus=ID&hops=3&t=…&sel=…`) restores focus+selection+time exactly.

---

## SHEET 07 · RECRUITER MAP — "THE COUNTERFEITER'S DIE"

**PURPOSE:** coordinator detection view (PRD 5.7): see the boss, act on the campaign.

**⊘ AUDIT:** prior concept ("corkboard with red thread") was crime-drama kitsch — REJECTED
by LAW II sensibilities. The die/generation-loss concept is stronger because it VISUALIZES
THE EVIDENCE: mule accounts are degraded copies of a pattern; degradation IS the graph
distance made visible.

**✦ LAYOUT:** Margin: detected recruiters list (ranked, each with scale class + confidence
hatch-bar) — selecting one loads its campaign. Working area (PLATE): the die visualization:
- Center: the MASTER DIE — the recruiter's T3 rosette inside a die frame, serial plate
  beneath, confidence + campaign stats printed as an edition line: `EDITION OF 23 ·
  CLASS B · FIRST STRIKE 02 JUL`.
- Radiating: mule accounts as GENERATION-DEGRADED copies (8.4): gen-1 crisp, gen-2 noisier,
  gen-3 visibly failing — arranged in strike order (angular position = recruitment sequence,
  radius = graph distance). Test-payment edges as fine strokes with amount tags on hover.
- On load, copies print in strike order (40ms stagger, cap 10, then batch) — the campaign
  re-enacts its own growth once.

**INTERACTIONS:** click any copy = account drawer; click the die = recruiter certificate;
`FREEZE CAMPAIGN` (vermilion Seal, blast-radius card listing all serials) → `DIE CANCELLED`
punch strikes the master, M10 wave cancels copies outward in generation order — the
product's most theatrical 900ms, and every frame of it is a real state change.
Replay scrubber: watch the fan-out build through time.

**STATES:** loading = die frame etches, copies print; empty = `NO ACTIVE DIES DETECTED —
the press finds no coordinated strikes` + last-scan dateline; error standard.

**ACCEPTANCE:** campaign of 60 mules renders < 500ms; the freeze wave never exceeds 1.6s
total regardless of n (stagger compresses); SR narration lists members in strike order.

---

## SHEET 03 · CASES — "THE DOCKET"

**PURPOSE:** lifecycle container (PRD 5.4): aggregate, deliberate, decide — with a paper trail.

**⊘ AUDIT:** cases were specified as a shelf metaphor with a status line — adequate,
undistinguished. What was MISSING was the handoff (9.14 fixes) and the sense that a case
ACCUMULATES weight as evidence attaches. A case should feel heavier the fuller it gets.

**✦ LAYOUT:**
**Index:** ledger-style case list (not cards — cases are docket entries): ref · title ·
state overprint (micro) · assignee · alerts count · exposure `<Money>` · age. Punch-card
filters by state/assignee. Margin: counts by state as a hatch-band + `OPEN A CASE` primary
(from selection context only — cases are opened from evidence, never from nothing).

**Case sheet — the two-page spread (a 7/5 split):**
- LEFT PAGE (facts): linked alerts as micro-slips · accounts as specimen stubs · evidence
  stubs (9.20) · the notes register (datelined entries, Supreme 14; new note = ruled
  composer at bottom; notes are append-only, matching audit reality).
- RIGHT PAGE (state): the PRESS LINE — the lifecycle as five stations
  (`STRUCK → EXAMINATION → AWAITING MLRO → SEALED / RETURNED`) connected by a thread;
  the case's position marked with a registration pin; every transition printed beneath with
  dateline + actor (real `/activity` data). Pinned atop: the ROUTING SLIP (9.14) when one
  exists — the MLRO's countersign Seal lives ON the slip. Below: the accumulation gauge —
  a small printed tally (`3 ALERTS · 2 ACCOUNTS · 4 EXHIBITS · 1 PACKAGE`) whose rule
  thickens as items attach (weight made visible, 0.5px per class, capped).
**Transitions:** every state change is a Seal; `RETURNED` requires the MLRO's reason (same
rule as false-positive — no silent bounces).

**THE ART:** the press line + routing slip. The rosette budget on this sheet: NONE (case
identity is textual; accounts carry the rosettes). Restraint is the design.

**STATES:** loading = docket rules print, rows typeset; empty = `THE DOCKET IS CLEAR` +
last-closed case line; error standard. Case-sheet sections load independently.

**ACCEPTANCE:** attach-evidence round trip prints the stub < 400ms; press line always
matches `/activity` exactly (no client-derived state; test asserts).

---

## SHEET 08 · AUTOSTR — "THE PRINTING ROOM"

**PURPOSE:** the screen that killed V2. Generate, verify, download, approve — with zero key
material and total honesty under hostile clicking (PRD 5.8).

**⊘ AUDIT of the failure class:** V2 died by showing a key and regenerating it identically.
The design defense is structural: this sheet renders ONLY job state from the contract; it
has no local secrets, no client-side "crypto theatre," and regeneration VISIBLY mints a new
impression. The theatre and the truth are the same object.

**✦ LAYOUT:** Margin: the case context block + package history list (every impression ever,
datelined, with fingerprints — the history IS the anti-V2 exhibit). Working area:
- The PRESS BED: a document preview area where the current package assembles. Three tabs =
  the three artifacts (`FIU-IND XML · CBI PDF · RBI REPORT`), each previewing its own
  letterhead + real metadata fields (from the jobs/packages endpoints).
- `STRIKE THE PACKAGE` (ink Seal) starts the async job. The press-line mirrors contract
  states 1:1: `ASSEMBLING` (border draws around the preview, fields typeset in as the
  backend reports them) → `SIGNING` (microtext lines fill the border — the visual of
  signing WITHOUT any key ever crossing the wire) → `SEALED` (vermilion seal strike +
  `<Fingerprint>` chip prints: `DOCUMENT FINGERPRINT · A3F8·90D1`).
- Post-seal rail: `DOWNLOAD` (streams; server-authorized; stub prints into the case) ·
  MLRO `COUNTERSIGN & SUBMIT` (Seal → countersignature line draws + `SUBMITTED` overprint).
- REGENERATE: always available post-seal; strikes a NEW job; the previous impression rolls
  into the Margin history with its fingerprint; the new one prints `IMPRESSION Nº 2` — the
  press proudly numbers its strikes. (Demo move: regenerate live, point at the two different
  fingerprints. The V2 wound, cauterized on stage.)

**STATES:** job failure = `MISPRINT — the impression failed at SIGNING` + retry Seal +
the failed job retained in history marked void (honesty even in failure); double-strike
attempts while a job runs: the Seal is disabled with `THE PRESS IS ENGAGED`; refresh
mid-job = the sheet rehydrates from the job endpoint and resumes displaying the same state
(test asserts). Downloads never 404 (the V2 memory:// bug class): the UI streams whatever
the contract serves and surfaces RFC-7807 problems verbatim on failure.

**ACCEPTANCE:** zero key/secret material in any rendered string, DOM attribute, or console
log (CI grep + runtime assert in dev builds); state transitions render < 200ms after SSE/
poll delivery; the three downloads verified in the golden-path E2E.

---

## SHEET 09 · COMPLIANCE — "THE BOUND REGISTER"

**PURPOSE:** audit ledger + verification + fairness (PRD 5.9) — the trust surface for
auditors and regulators.

**⊘ AUDIT:** "wax seal on verify" (v1) was theatre bolted onto a table. The corrected design
makes the VERIFICATION MECHANISM itself the visible art (the thread), and treats the
fairness view as first-class reporting rather than an apologetic tab.

**✦ LAYOUT — two tabs (punch-cards in the Margin):**

**Tab 1 · THE REGISTER:** facing-page layout (two ruled columns of entries, book gutter
center). Entries in Machine 13: dateline · actor serial · action · object ref · entry hash
(last-6, ink-faint). Down the CENTER GUTTER runs the SECURITY THREAD — a continuous 2px
line woven entry-to-entry (each entry's hash links the next: the drawn line IS the HMAC
chain's topology). Filters: actor/action/date-range punch-cards; cursor pagination
(`CONTINUE THE REGISTER`).
`VERIFY THE LEDGER` (ink Seal, Margin): on strike, M7 — a light pulse travels the ENTIRE
thread from the first visible entry to the last while the real chain check runs server-side;
completion prints the certification block: `LEDGER INTACT · 4,112 ENTRIES · VERIFIED
14-07-2026 09:12 IST` with the verified overprint. A broken chain (chaos scenario): the
pulse STOPS at the exact broken entry; the thread renders severed with 2mm gap + vermilion
fray; the block prints `CHAIN BROKEN AT ENTRY 2,847` — the product's most important error
state, designed with the most care.

**Tab 2 · FAIRNESS:** the DPDP story. Hatch-band distributions (9.5) of flag rates by
segment; each band annotated in plain language; below, the scheduled-reports registry as a
stub list. A printed methodology note (Supreme 13, 62ch) explains the metric in one
paragraph — regulators read this sheet; it must read back.

**THE ART:** the thread. Rosette budget: zero.

**STATES:** register loading = pages rule first, entries typeset; empty = impossible by
design (the register always has entries — its own reads are logged; if truly empty:
`THE REGISTER OPENS TODAY`); verify-in-flight = the pulse; fairness loading = bands sketch
as outlines then hatch.

**ACCEPTANCE:** thread renders correctly across pagination boundaries (the line continues
across "continue" loads — tested); pulse duration formula respected (min(n×8ms, 2400ms));
verify result text matches the endpoint response verbatim.

---

## SHEET 02 · COMMAND CENTER — "THE PRESS FLOOR" (locked PLATE)

**PURPOSE:** ambient situational awareness (PRD 5.2's consumer): the room where the bank's
pulse is visible. Pull, not push — nobody works here; they GLANCE here.

**⊘ AUDIT:** v1's "ticker hall" was three widgets in a trench coat. A glance-room has ONE
job: velocity + anomaly, readable from three meters. Everything else is furniture.

**✦ LAYOUT (full-bleed PLATE, minimal margin):**
- TOP: the ticker — a single-line mono stream of event stubs (type glyph + serial + amount),
  right-to-left at READING speed (90px/s, not marquee-blur), fed by the WS buffer; pauses
  on hover (LAW V even here).
- CENTER: THE FLOW FIELD — branch clusters as engraved rosette-plates arranged
  geographically-ish (deterministic layout from branch codes); inter-branch flows as
  light-traces that print, persist 2s, fade (M-catalogue class; canvas; 30fps cap;
  severity-inked when the flow involves a flagged account). Not a map (maps invite
  cartography questions); an ABSTRACT floor of stations.
- BOTTOM: four plate-counters (Machine 600, 40px): TX/SEC (with the seismograph strip) ·
  ACTIVE ALERTS (vermilion when >0 CRITICAL) · ACCOUNTS WATCHED · AVG WARMTH (with a tiny
  spectrum-position mark— struck: with a band mark). Flip-transitions on change (120ms,
  no cascade).
**STATES:** WS down = the floor DIMS to 60% + `THE PRESS HAS STOPPED` printed center +
auto-recovery per system sheet rules; loading = stations etch in; no empty state (a bank
always has a pulse; zero-activity prints flatline honestly).
**ACCEPTANCE:** sustained 50 ev/s: 60fps UI, ticker drops to sampling (1-in-n with printed
`SAMPLING 1/4` tag) rather than blurring — honest degradation, always.

---

## SHEET 10 · ADMINISTRATION — "THE MINT" (SYS_ADMIN only)

**PURPOSE:** users, health, simulator (PRD 5.10) — and the walled-off-admin talking point.

**✦ LAYOUT:** three Margin-tabbed panels:
1. **OPERATORS:** roster ledger — serial · name · role · MFA state (`KEY CUT 12 MAY`) ·
   last session · state. Row actions as inline Seals: `INVITE` (primary, drawer form),
   `CHANGE ROLE` (ink Seal + role card select), `DISABLE` (vermilion), `FORCE KEY RE-CUT`
   (MFA reset; vermilion; the label does the explaining). Every action prints a notice with
   its audit ref. The panel header prints the constitutional line: `THE MINT KEEPS THE
   PRESSES — NEVER THE LEDGERS.` (admins can't see cases/PII; the wall, stated in copy.)
2. **STATIONS:** the five Station diagrams (9.18) in a row + incident ledger beneath.
3. **THE PRESS (simulator):** scenario as index-card select (`RECRUITER_FANOUT · SEED
   20260707`), seed field (Machine), compression readout, and the RUN/PAUSE press lever —
   plus a live emitted-events counter. During demos, judges watch the operator physically
   run the world. A `LOAD SCENARIO` ink Seal guards switching (destructive to stream state).

**STATES/ACCEPTANCE:** standard trio; role-gate test: FRAUD_ANALYST deep-linking here gets
the 404 MISPRINT (not a "forbidden" hint — the sheet does not exist for them).

---

## SHEET 11 · PROFILE & SESSIONS (all roles, from the credential card)

Small but mandatory (PRD 5.1's session list): a drawer, not a sheet — the operator's press
ID enlarged: credential block · `2FA: KEY CUT 12 MAY 2026` (never any secret; Law 3) ·
sessions ledger (device · IP · first/last seen · `CURRENT` mark) with per-row `REVOKE`
vermilion Seals · `LEAVE THE DESK`. Revoking the current session logs out with the plate
wipe. Nothing else lives here — profiles are not a social feature.

---

## SHEET 12 · THE EXAMINER (assistant surface)

Fully specified as component 9.22; sheet-level notes: context binding (the panel knows the
current sheet + focused entity and passes `screen_context`), the three slips re-print on
sheet change, transcript persists per session (memory only — nothing stored), and a printed
first-run line: `I answer from the press's own records. I hold no opinions.` — the scope
statement as a greeting.

---

# PART 11 — INTERACTION PATTERNS & OPERATOR LOOPS

## 11.1 The Examination Loop (the product's primary loop)

The loop the whole console is tuned for, with target timings:

```
SEE (slip scan)        →  ≤ 1.0s   severity + rosette + deadline read at a glance
SELECT (J/K/click)     →  ≤ 150ms  dossier binds (prefetched on intent)
JUDGE (worksheet)      →  operator-paced; evidence ≤ 1 click deep, citations ≤ 2
ACT (A/E/O/Shift+F)    →  ≤ 900ms  the hold IS the latency; server ack ≤ 400ms after
NEXT (auto-advance)    →  0ms      on act, selection moves to next docket number
```

**Auto-advance rule:** after EXAMINED / ESCALATE / FALSE-POSITIVE, selection advances to the
next unexamined slip automatically. After OPEN CASE, the operator has left the loop
deliberately (navigation). This single rule is worth minutes per shift.

**Loop integrity tests:** a scripted 20-alert triage run must be completable keyboard-only,
without a single pointer touch, in under 4 minutes by a first-week user.

## 11.2 The Pull Principle (LAW V operationalized)

| Live event | Where it appears | What it NEVER does |
|---|---|---|
| New alert | Folio counter + marginalia tick + favicon param | Insert into a tray being read |
| Score change | Bound rosettes morph (400ms) IF on-screen | Reorder any list |
| Case state change | Press-notice (if relevant to operator) + case sheet if open | Steal focus |
| Feed events | Marginalia ticks; Command Center surfaces | Toast per event (never) |
| WS loss/recovery | Folio aperture; system-sheet rules | Block interaction with stale-marked data |

Staleness is always LABELED (`AS OF 09:41 IST`), never silent, and never blocking.

## 11.3 Evidence depth rule

Any number an operator can see must be ≤2 interactions from its raw records:
score → Worksheet (1) → cited register rows (2). Enforced as an acceptance test on Sheets
04/05: for each rendered figure, a documented click path of length ≤2 exists.

## 11.4 The authority gradient

| Action class | Control | Extra guard |
|---|---|---|
| Read/navigate | click/keys | — |
| Annotate (notes, examined) | button | — |
| Reversible state (assign, acknowledge) | button | — |
| Hard-reversible (escalate, false-positive) | Seal 900ms | required reason (FP) |
| Destructive/legal (freeze, cancel, submit, revoke, unmask) | Seal 900ms | blast-radius card where multi-entity; audit ref printed on completion |

No action skips its class. A PR moving an action down a class needs review-board sign-off.

## 11.5 Selection & focus model

One SELECTED entity per sheet (the dossier binding); one FOCUSED element (keyboard ring).
Selection survives: feed merges, drawer open/close, replay scrubbing. Selection dies on:
sheet change (unless deep-linked), entity deletion (selection moves next + notice prints).
Focus NEVER jumps without user action — including on drawer close (returns to invoker) and
notice arrival (never steals).

## 11.6 Undo policy

Printed things stay printed (append-only truth): there is no undo for sealed/struck actions —
there are COUNTER-ENTRIES (unfreeze prints its own entry; false-positive can be reopened
with reason). The UI language never says "undo"; it says `STRIKE A COUNTER-ENTRY`. This
matches the audit chain's physics and teaches operators the system's nature.

---

# PART 12 — MICROCOPY, VOICE & THE PRESS LEXICON

## 12.1 ⊘ AUDIT

Prior copy drifted between SaaS-cheerful ("You're all set!") and costume-solemn. Voice is a
design material with the same governance as color. One register, everywhere, or none.

## 12.2 ✦ THE VOICE

**Institutional, precise, unhurried. Never chirpy, never ominous.** The press is 90 years
old; it has seen everything; it explains itself in one sentence. Rules:
- Verbs of the press: struck, printed, sealed, returned, cancelled, cut, fed, examined.
- No exclamation marks anywhere in the console. One is permitted on the landing CTA. Zero
  emoji, ever.
- Errors state WHAT + WHAT NOW, in that order, ≤2 sentences. Blame is never assigned to
  the operator.
- Empty states are calm declarations, not apologies (`The docket is clear.` not `No cases
  yet!`).
- Sentence case for prose; small caps for labels; stamps ALL CAPS.
- Numbers in copy follow LAW III (the string interpolates Machine-rendered values).

## 12.3 ✦ THE LEXICON (canonical strings, excerpt — full table ships as `lexicon.ts`)

| Context | String |
|---|---|
| Queue empty | `No sheets await examination. The press runs clean.` |
| Connection lost | `The press has stopped. Reconnecting…` |
| Reconnected | `The press resumes. 14 sheets arrived while away.` |
| Login error | `RETURNED — credentials not recognized.` |
| Rate limited | `RETURNED — five attempts. The window reopens in {t}.` |
| MFA enrol | `Your key is cut once. The press keeps no copy.` |
| Session expiry | `Your session has lapsed. Present your credentials.` |
| FP reason required | `State the basis. The register keeps reasons, not moods.` |
| Freeze blast-radius | `This strike cancels {n} dies. Each is listed below.` |
| Verify success | `LEDGER INTACT · {n} ENTRIES · VERIFIED {dateline}` |
| Verify failure | `CHAIN BROKEN AT ENTRY {n}. Do not amend. Notify the auditor.` |
| AutoSTR regenerate | `IMPRESSION Nº {n} — a new strike, a new fingerprint.` |
| Examiner offline | `The examiner has stepped away.` |
| Examiner scope | `I examine only matters of this institution.` |
| Admin wall | `The mint keeps the presses — never the ledgers.` |
| Desk gate | `A wider desk is required. The press prints on sheets no narrower than 1280 pixels.` |
| 404 | `THIS SHEET DOES NOT EXIST. Return to the press.` |

## 12.4 Terminology map (UI term ↔ domain term, printed in the footer glossary)

`sheet=screen · slip=alert row · certificate=account view · plate=graph · die=recruiter
cluster · impression=generated package · thread=audit chain · key=TOTP secret · station=
service · the press=the system`. The glossary exists so the fiction never obscures the
function — judges and auditors can always resolve a term in one hover.

---

# PART 13 — ACCESSIBILITY: THE LARGE PRINT STANDARD

## 13.1 ⊘ AUDIT

Prior specs treated a11y as contrast ratios. A canvas-heavy, keyboard-first, metaphor-rich
product can be an accessibility disaster with perfect contrast. The standard below is
named — THE LARGE PRINT STANDARD — because naming it makes it a feature with an owner.

## 13.2 ✦ THE STANDARD

1. **Contrast:** AA minimum both modes, AAA for body ink (achieved — Appendix C). Vermilion
   restricted by the `<Critical>` primitive to sizes/weights that pass.
2. **Never color-alone:** severity = mark shape + ink + label (5.3); station state = shape
   coding; charts = hatching (inherently pattern-coded — an accidental a11y superpower of
   the whole art direction).
3. **Keyboard:** 100% operability. The full map in Appendix B; `?` prints it as a sheet.
   Focus ring: 2px reserve, 3px offset, never suppressed. Roving tabindex in trays/ledgers.
4. **Canvas surfaces (Plate/Die/Floor):** each exposes (a) an SR summary sentence, updated
   on state change via `aria-live=polite`; (b) a visually-hidden parallel DOM list of top
   entities (spatial order) with the same actions; (c) full keyboard traversal with printed
   focus tags on-canvas. The art never costs a screen-reader the facts.
5. **Motion:** `prefers-reduced-motion` equivalences specified per-entry in the M-catalogue
   (7.3); the Seal hold is exempt (safety) but announces progress.
6. **The Large Print Edition:** a mode lever in Profile: +1 type step globally, hatch
   densities re-spaced, marks enlarged 1.5x, watermark suppressed. Named in the fiction —
   accessibility as a first-class edition of the newspaper, not a settings apology.
7. **SR strings live in the lexicon** with the same voice (a screen reader hears the same
   institution).
8. **Targets:** interactive minimum 40×40 hit area (Seals 44×44), 8px separation.
9. **Forms:** labels always visible (no placeholder-as-label), errors linked
   `aria-describedby`, required marked in label text.
10. **Testing:** axe-core clean in CI; manual NVDA pass per sheet before its phase exits;
    keyboard-only golden path in E2E.

---

# PART 14 — PERFORMANCE: THE SMOOTHNESS CONTRACT

## 14.1 The philosophy

"Smooth and slick" is not polish applied at the end; it is a budget respected from the first
component. Everything below is CI-enforced or measured in the perf story, not aspirational.

## 14.2 The budgets

| Metric | Budget | Where measured |
|---|---|---|
| First meaningful paint (console) | < 2.0s | Lighthouse CI, cold |
| Landing LCP | < 1.8s | Lighthouse CI |
| Route change (wipe complete → interactive) | < 320ms + 100ms | Playwright trace |
| Slip→dossier bind | < 150ms | perf mark test |
| WS event → visible tick | < 500ms | instrumented test |
| Tray scroll @ 10k rows | 60fps | Playwright trace, scripted fling |
| Plate: 5k nodes render | < 800ms | perf story |
| Plate: pan/zoom | 60fps sustained | perf story |
| Replay scrub | ≥ 30fps state interpolation | perf story |
| Bundle (console, gz) | < 320KB JS initial; fonts < 120KB subset total | size-limit CI |
| CLS everywhere | < 0.02 | Lighthouse CI |

## 14.3 The engineering rules that buy the budgets

1. Transform/opacity-only animation (lint-enforced property allowlist).
2. Rosette caching tiers (8.3); the quantization scheme guarantees list cache hits.
3. Virtualization mandatory past 60 rows; fixed row heights everywhere (44/34px) — no
   measurement thrash by construction.
4. One canvas per Plate-class surface; no per-node DOM. Offscreen path caching per node;
   dirty-rect redraw on hover/selection only; full redraw only on pan/zoom/replay frames.
5. Prefetch on intent: selection-adjacent dossiers (J/K neighbors), hover ≥80ms, route
   links in the Register on hover — all via the generated client with request dedupe.
6. Fonts: subset WOFF2, preloaded, `size-adjust` fallbacks — zero FOIT, zero reflow.
7. Microtext/fiber/deckle: all pre-baked SVG data-URIs; zero runtime filters (the ONE
   displacement map for Overprint edges is baked at build).
8. WS discipline: single multiplexed socket; event batching per animation frame; the
   marginalia renders ticks from a ring buffer (never unbounded DOM).
9. The M8 erosion recomputes per MINUTE (SLA granularity), not per frame.
10. Code-split by sheet; the Plate renderer and Replay engine lazy-load (they are the
    heaviest and not on the golden path's first screen).

## 14.4 The Replay perf story (the riskiest feature, pre-committed)

Historical states stream as parameter keyframes (not full snapshots): per node,
(t, W, S-vector quantized) — the engine interpolates. 60 minutes of campaign at 1-minute
resolution for 500 nodes ≈ 350KB — acceptable; coarser auto-resolution beyond. If a device
cannot hold 30fps, the scrubber degrades to stepped scrubbing (200ms snaps) — announced by
a printed `STEPPED` tag, honest as always.

---

# PART 15 — QUALITY: TORTURE MATRIX & HOSTILE JUDGE PROTOCOL

## 15.1 The Torture Matrix (every canon component ships a story against this data)

| Class | Cases |
|---|---|
| Names | 47-char Devanagari + Latin mix · single-char name · name with numerals |
| Money | ₹1 · ₹99,99,99,999 · negative adjustments · zero |
| Serials | max-length · lookalike chars (O/0, I/1 — slashed zero proves itself) |
| Time | overdue SLA (−3d) · 1s ago · clock skew ±5min · 00:00 IST boundary |
| Volume | 0 rows · 1 row · 60 (virtualization edge) · 10,000 rows |
| Stream | 0 ev/s · 50 ev/s · burst 200 in 1s · duplicate ids · out-of-order ids |
| Text | RTL fragment in a memo · emoji in a memo (renders, never becomes UI) · 500-char note |
| State | double-click every Seal · refresh mid-hold · refresh mid-job · back-button mid-drawer |
| Auth | token expiry mid-action (drawer re-auth, action resumes) · role downgrade mid-session |
| Network | 3G throttle · offline mid-scrub · 500 with problem+json · 500 with HTML body |

## 15.2 The Hostile Judge Protocol (release gate, run twice)

A third party is handed the app with one instruction: BREAK THE DEMO. Scripted provocations
(minimum set): generate twice fast · download all three packages · open dev tools and grep
for secrets · kill the API mid-triage · kill Ollama mid-question · resize to 900px · zoom to
200% · unplug network during a freeze hold · deep-link every sheet as the wrong role ·
paste a TOTP · leave idle 20 minutes and return. PASS = nothing fake, nothing repeated-
identical that shouldn't, nothing exposed, every failure state on-design. Any FAIL is a
release blocker with a written fix note in this document's changelog.

## 15.3 Visual regression

Playwright screenshots: every sheet × both modes × 3 states (loaded/empty/error) × 1440px,
plus the component canon grid — diffed on every PR. The squint test automated: a 16px
gaussian-blurred screenshot of each sheet must still show correct severity ordering (blur +
luminance histogram check) — hierarchy survives even out of focus.

---

# PART 16 — GOVERNANCE, TOKENS, FILE ARCHITECTURE

## 16.1 Token architecture

Three layers, one direction of reference:
```
palette.css   →  raw inks (the ONLY hex values in the codebase)
semantic.css  →  --paper, --ink, --rule, --reserve… (mode-switched here)
component use →  var(--semantic) only
```
Mode switching = `[data-mode="plate"]` swaps semantic layer; components are mode-blind.
Lint: hex literals outside `palette.css` fail CI; `--palette-*` referenced outside
`semantic.css` fails CI.

## 16.2 File architecture (frontend)

```
src/
  styles/    palette.css · semantic.css · type.css · motion.css · print.css
  engine/    rosette.ts (pure) · hatch.ts · microtext.ts · replay.ts
  primitives/ Num · Money · When · Ref · Fingerprint · Serial · Critical
  canon/     Slip/ Seal/ Overprint/ Worksheet/ Ledger/ Drawer/ Notice/ Index/
             Folio/ Marginalia/ Comparator/ Replay/ RoutingSlip/ Controls/ …
  sheets/    landing/ login/ queue/ accounts/ graph/ recruiter/ cases/
             autostr/ compliance/ admin/ command/
  api/       schema.d.ts (generated) · client.ts · ws.ts
  lexicon/   strings.ts · glossary.ts · sr.ts
```
Sheets may import canon + primitives + engine; canon may import primitives + engine;
nothing imports upward. Import-boundary lint enforces the DAG.

## 16.3 Definition of Done (per sheet)

☐ All three states designed & implemented ☐ both modes ☐ keyboard map complete
☐ SR pass ☐ torture stories green ☐ perf budgets met ☐ visual snapshots recorded
☐ Ration Ledger entry honored ☐ lexicon strings only (no inline copy)
☐ deep-link restores full state ☐ zero raw hex/numerals lint clean.

## 16.4 Change control

This document is the constitution. Amendments: a dated entry in the CHANGELOG section of
this file describing what changed and WHY (one paragraph, the trade named). Silent drift
discovered in review = revert first, discuss second.

---

# PART 17 — DELIVERY ROADMAP & DEFINITION OF DONE

| Phase | Ships | Exit gate |
|---|---|---|
| **U0 · The Mint opens** | palette/semantic/type/motion tokens · fonts subset+loaded · rosette engine + golden tests · Master Rosette + favicon · primitives · Storybook shell | Engine snapshots green; tokens lint enforced; canon skeleton stories render both modes |
| **U1 · The Desk** | Folio/Register/Marginalia chrome · Login (watermark flow) · Sheet 04 complete (Slip, Seal, Worksheet, dossier, feed) · press-notices · the Index | Keyboard-only 20-alert triage < 4min; LAW V test green; golden path to examined-alert in E2E |
| **U2 · The Book & Docket** | Sheet 05 (both phases + history chart + replay v1) · Sheet 03 (+ Routing Slip) · Comparator · profile drawer | Analyst→MLRO handoff E2E; evidence-depth rule test green |
| **U3 · The Plates** | Sheet 06 (canvas, lasso, freeze, patterns) · Sheet 07 (die, wave) · Replay full | Plate perf story green (5k/800ms/60fps); SR parallel-DOM audit |
| **U4 · The Printing Room** | Sheet 08 (jobs, impressions, downloads) · Sheet 09 (thread, verify, fairness) · Sheet 10 (mint) · Examiner | Zero-key CI grep + runtime assert; chain-broken state demoed; simulator drive-through |
| **U5 · The Note** | Sheet 00 landing (border, loupe stations) · Command Center · print.css · Large Print Edition · polish pass | Landing budgets; full torture matrix; Hostile Judge Protocol ×2 PASSED |

Sequencing rationale: the engine and desk first because everything else reuses their parts;
the landing LAST because it is the least risky and most fun — dessert after vegetables.

---

# APPENDIX A — FULL TOKEN TABLES

## A.1 Palette (raw inks — the only hex in the codebase)

| Token | NOTE | PLATE |
|---|---|---|
| paper | #F1EDE3 | #12130F |
| paper-raised | #F7F4EC | #1A1B16 |
| paper-sunken | #E9E4D6 | #0C0D0A |
| paper-aged | #E4DCC8 | #181712 |
| ink | #1A1B18 | #EFE9DA |
| reserve | #1F3FB5 | #5C77E6 |
| reserve-pressed | #16308F | #7D93F0 |
| vermilion | #E33F1E | #FF5A38 |
| vermilion-pressed | #C13317 | #FF7A5C |
| intaglio | #2E5D4B | #7FA694 |
| verified | #2E7D52 | #5FBF8F |

## A.2 Opacity steps

ink-mut 62% · ink-faint 38% · rule 14% · rule-strong 30% · wash-reserve 8%/10% ·
wash-vermilion 7%/9% · watermark 8% · overprint-full 24% · frozen-fade 30% · disabled 40%.

## A.3 Dimensions

Register 228/64px · Folio 32px · Marginalia 40px · Slip 44px · Ledger row 34px ·
Drawer 420px · Examiner 400px · Seal 40/56px · Content max 1680px · Gutter 24px ·
Radius 2/3px · Focus ring 2px @ 3px offset.

## A.4 Type ramp recap

96/64/40/28 Zodiak · 20/16/14/13/11 Supreme · 24/13/12/11 Martian. Tabular slashed-zero
always on Machine. Weights: Z 400/500/700L · S 400/500/700 · M 400/600.

# APPENDIX B — KEYBOARD MAP

| Key | Context | Action |
|---|---|---|
| Cmd/Ctrl+K or . | global | The Index |
| / | any sheet | focus search/filter |
| ? | global | print the keyboard sheet |
| J / K | trays, ledgers | next / previous |
| Enter | tray | bind dossier / open |
| A | queue | mark examined |
| E | queue/dossier | escalate (Seal) |
| O | queue/dossier | open case |
| Shift+F | queue/dossier | false positive (reason drawer) |
| C | account context | comparator |
| F | folio counter visible | feed the press |
| Z (hold) | plate | loupe lens |
| L (hold)+drag | plate | lasso select |
| ← / → · Shift+← / → | replay | event-step · hour-step |
| PageDown | ledgers | continue the register |
| Esc | drawers, TOTP | close / clear |
| Tab / arrows | plate | traverse nodes |
| Space/Enter (hold) | Seal focused | authorize |

# APPENDIX C — CONTRAST VERIFICATION MATRIX (computed, WCAG 2.1)

| Pair (NOTE) | Ratio | Use permitted |
|---|---|---|
| ink / paper | 13.9 | all text |
| ink-mut / paper | 8.1 | body+ |
| ink-faint / paper | 3.4 | decorative only |
| reserve / paper | 8.3 | all text |
| vermilion / paper | 4.9 | ≥16px or ≥600w (enforced) |
| verified / paper | 5.6 | ≥13px |
| ink / paper-sunken | 12.6 | all |
| reserve / paper-raised | 8.7 | all |

| Pair (PLATE) | Ratio | Use permitted |
|---|---|---|
| ink / paper | 14.2 | all text |
| ink-mut / paper | 8.3 | body+ |
| reserve / paper | 6.9 | all text |
| vermilion / paper | 6.2 | all text |
| verified / paper | 8.9 | all |

(Values re-verified programmatically in CI against the palette file; the table regenerates —
a palette change that breaks a permitted use fails the build.)

# APPENDIX D — THE RATION LEDGER (per-sheet art budget)

| Sheet | Focal rosette | Microtext elements | Overprint budget | Notes |
|---|---|---|---|---|
| 00 Landing | Master (hero) | border + 1 line | SPECIMEN (demo block) | The one maximal sheet |
| 01 Login | watermark only | 1 (card rule) | SPECIMEN lift | |
| 02 Command | station plates (T2, ambient) | 0 | 0 | counters carry the drama |
| 03 Cases | 0 | spine rule | state stamps (micro) | restraint sheet |
| 04 Queue | T1s in slips + ONE T2 in dossier | SLA strips (n) — exempt class | EXAMINED micro | the working identity |
| 05 Accounts | T3 in header (T2 grid in phase A) | certificate border | FROZEN full | |
| 06 Plate | T4 field (is the sheet) | 0 | cancel-cross | |
| 07 Die | T3 master + degraded copies | 0 | DIE CANCELLED | |
| 08 AutoSTR | 0 (seal ring only) | document border | SEALED/SUBMITTED/IMPRESSION | |
| 09 Register | 0 | thread + spine | VERIFIED / chain-broken | |
| 10 Mint | 0 | 0 | 0 | the silent sheet |
| Examiner | 0 | 0 | 0 | |

---

# CHANGELOG

- **v1.0 · 14 JUL 2026** — Initial constitution. Supersedes Heritage Bank (v1), Modern
  Vault (v2), Spectral Intelligence (v3-draft). Approved for build pending client lock.

---

*ARGUS-PRISM V3 · THE SECURITY PRESS — "Printed, not painted. Held, not clicked. Real, or not rendered."*

---

# PART 18 — DEMO CHOREOGRAPHY: THE TEN-MINUTE PERFORMANCE

The demo is a designed artifact with the same rigor as any sheet. It is written as a score:
each beat names the sheet, the action, the design moment the judges should feel, and the
fallback if anything misbehaves. Rehearsed twice end-to-end before any external showing;
the second rehearsal includes a saboteur (Part 15.2).

## 18.1 The score

| Beat | Time | Sheet | Action | The moment | Fallback |
|---|---|---|---|---|---|
| 1 | 0:00 | Landing | Scroll the note; pause on the thread station | "This interface is drawn in the language money uses to defend itself." | Static crops build (reduced-motion path is rehearsed too) |
| 2 | 0:50 | Login | Credentials; watermark develops; TOTP; SPECIMEN lifts | The room notices authentication is theatre-grade | OAuth path if TOTP device fails |
| 3 | 1:30 | Queue | The desk loads with live docket; J/K through three slips | 38 unique data-drawn rosettes; the calm under live load | Simulator pre-warmed; if stream is down, stale-labeled data is ITSELF the honesty demo |
| 4 | 2:30 | Queue | Open Worksheet on Nº1; read indications AND contra-indications | "Every score shows its working — both columns." | — |
| 5 | 3:15 | Queue → Case | Seal-escalate; write the routing slip basis | The hold-to-authorize lands; the slip prints | — |
| 6 | 4:00 | Plate | Open from dossier mini-plate; loupe a crossing; lasso the cluster | The moiré; the blast-radius card listing every serial | If perf dips, drop to 2 hops (control is on-screen, natural) |
| 7 | 5:00 | Plate | REPLAY: scrub the campaign backward and forward | The network visibly learns to lie — the room's gasp beat | Stepped scrub is still compelling |
| 8 | 6:00 | Die | Switch to recruiter; point at generation loss; FREEZE CAMPAIGN | The cancellation wave, gen by gen | — |
| 9 | 7:00 | MLRO switch | Second operator logs in (second device, pre-staged); countersigns the routing slip | RBAC as lived narrative, not a slide | Same-device role relogin |
| 10 | 7:45 | Printing Room | STRIKE THE PACKAGE; watch ASSEMBLING→SIGNING→SEALED; download; REGENERATE deliberately | Two impressions, two fingerprints, side by side — the V2 wound cauterized on stage | Job history from earlier rehearsal shows the same truth |
| 11 | 8:45 | Register | VERIFY THE LEDGER; the pulse runs the full thread | "That line you watched was the real HMAC chain." | — |
| 12 | 9:30 | Mint | Pause the simulator live; the Command Center dims | "And this is us stopping the world you just watched." Close on the creed. | — |

## 18.2 Staging requirements

- Simulator scenario `recruiter_fanout`, seeded, started at T-minus 8 minutes so the queue
  holds 30–45 alerts with at least 2 CRITICAL at beat 3 (seed chosen and pinned during U5).
- Two operator accounts staged (analyst + MLRO) with keys already cut; a spare TOTP device.
- Network kill-switch rehearsed at beat 6 once in rehearsal 2 — the recovery narrative
  ("the press stopped; watch it backfill") is itself a prepared beat if fate offers it.
- Projector profile: the NOTE mode variant of every demo sheet checked at 80% saturation
  (Part 15.3's blur test doubles as the projector test).

## 18.3 The one-liners (rehearsed, not improvised)

Each beat carries one sentence, written here so nobody invents adjectives on stage:
1. "Every screen is a sheet from a security press — the design language invented to make
   forgery visible."
2. "The watermark develops because you are proving you're not the counterfeit."
3. "No two rosettes are alike — each is drawn live from that account's own signals."
4. "We show the working — including the evidence AGAINST our own suspicion."
5. "Authority here is held, not clicked."
6. "Every serial this strike will touch is printed before the seal will accept the hold."
7. "This is the same network, three days ago. Watch it learn to lie."
8. "Copies of copies — the fraud degrades exactly like a counterfeit plate."
9. "A different officer, a different authority — the slip carries the conversation."
10. "Same button, new impression, new fingerprint. Nothing in this product repeats
    identically — by construction."
11. "That pulse was the actual cryptographic chain check, drawn."
12. "The hundred eyes see what others cannot. Everything they showed you tonight was real."

---

# PART 19 — THE FOLIO REGISTRY & INFORMATION ARCHITECTURE RECORD

## 19.1 The folio registry (canonical sheet numbering)

| Folio | Sheet | Route | Mode | Roles |
|---|---|---|---|---|
| 00 | The Note (landing) | / | NOTE | public |
| 01 | The Teller (login) | /login | NOTE | public |
| 02 | The Press Floor | /command | PLATE (locked) | all authed |
| 03 | The Docket | /cases · /cases/:id | lever | MLRO, ANALYST, AUDITOR(read) |
| 04 | The Examination Desk | /alerts · /alerts?sel=:id | lever | MLRO, ANALYST |
| 05 | The Specimen Book | /accounts · /accounts/:id | lever | MLRO, ANALYST, AUDITOR(read, masked) |
| 06 | The Engraver's Plate | /graph?focus=&hops=&t=&sel= | PLATE (locked) | MLRO, ANALYST |
| 07 | The Counterfeiter's Die | /recruiters · /recruiters/:id | PLATE (locked) | MLRO, ANALYST |
| 08 | The Printing Room | /autostr/:caseId | lever | MLRO, ANALYST(read) |
| 09 | The Bound Register | /compliance · ?tab=fairness | NOTE default | MLRO, AUDITOR, ANALYST(read) |
| 10 | The Mint | /admin · ?tab=stations·press | lever | SYS_ADMIN only |
| — | Profile drawer | (overlay) | inherits | all |
| — | The Examiner | (overlay) | inherits | per PRD role token |

Role rules render at the ROUTE level (wrong role = 404 MISPRINT, per Sheet 10 note) and at
the CONTROL level (inked-out Seals with authority tooltips). Both are server-verified; the
UI treatment is presentation of, never substitute for, the backend check.

## 19.2 Deep-link grammar (URL-addressable state, PRD §4 requirement)

```
/alerts?sel=AL-2214&worksheet=S3        selection + open evidence
/accounts/AC-0847?tab=history&t=2026-07-11T14:00   replay position
/graph?focus=AC-0847&hops=3&sel=cluster:7f3a&t=…   full plate state
/cases/CS-0092#slip                     scroll to routing slip
/compliance?actor=OP-114&from=2026-07-01           filtered register
```
Every sharable investigation state must round-trip: paste the URL in a fresh session (after
auth) and land in the identical view. The share affordance is `CITE THIS SHEET` (quiet
button, folio right-click also) — copying a citation line:
`ARGUS-PRISM · SHEET 06 · plate of AC-••••-0847 · 14-07-2026 09:41 IST · <url>` —
sharing styled as scholarly citation, in-voice, and the timestamp warns the reader that
live data may have moved on.

## 19.3 Navigation truths

- The Register (nav) is the ONLY global navigation; sheets never invent sibling nav.
- Cross-sheet jumps preserve origin: arriving at the Plate from a dossier prints a
  `RETURN TO THE DESK` quiet link in the Margin (breadcrumb-as-provenance, single level —
  deep breadcrumb trails are a smell that the IA failed).
- The browser back button ALWAYS works and always returns exact prior state (history state
  carries selection + scroll). Breaking back is a release blocker.

---

# PART 20 — OPEN QUESTIONS & PRE-COMMITTED DECISIONS

## 20.1 Decided now (so the build never stalls on them)

| Question | Decision | Rationale |
|---|---|---|
| Zodiak vs alternative serif if rendering disappoints at 40px on Windows | Fallback candidate: Sentient (same foundry family, pre-vetted) — decision gate at U0 exit with real screenshots | Never bikeshed mid-build |
| Canvas library for the Plate | None. Hand-rolled 2D context renderer (~600 lines) | Every graph lib fights the engraving aesthetic and the determinism requirement |
| Smooth-scroll library on landing | None. Native scroll + rAF lens interpolation | Scroll-hijack risk; LAW V spirit |
| State management | TanStack Query for server state + tiny Zustand slice for shell state (mode, selection) | Server-truth product; client state is deliberately minimal |
| The wipe implementation | View Transition API where available; CSS fallback | Free browser wins, honest fallback |
| Print stylesheet scope in U5 | Case sheet + AutoSTR package summary + Register certification only | The three artifacts someone would actually file |
| Sound | Ships silent. A single optional press `thunk` behind a Profile lever is a U5-stretch only if rehearsals feel dry | One awkward sound costs more than ten delights |

## 20.2 Genuinely open (owner + deadline)

1. **Branch-cluster layout for the Press Floor** — geographic-ish vs ring layout: decide at
   U4 start when real simulator branch topology is inspectable. Owner: design. Both mocked
   in Storybook first.
2. **Comparator cohort definitions** — needs the aggregates endpoint's final shape (contract
   PR pending backend). UI ships behind the punch-card until then. Owner: contract meeting.
3. **Replay resolution for >48h campaigns** — 1-minute keyframes may be too fine; decide
   from real payload sizes at U3. Pre-committed degradation: auto-coarsen with a printed
   `RESOLUTION 5m` tag.
4. **Hindi/bilingual folio option** — out of scope for V3 per PRD; the type stack already
   carries Devanagari fallback so data renders correctly today. Revisit post-judging.

## 20.3 The risks the department accepts with eyes open

- **The fiction could tire.** Mitigation: the Ration, the Mint's silence, and the glossary.
  If any tester reports the vocabulary obstructing a task (not merely amusing them), the
  term simplifies — function wins, logged in the changelog.
- **Two custom faces + a mono is a loading tax.** Mitigation: 120KB subset budget is CI-
  enforced; if Zodiak subsets fat, display cuts to two weights.
- **Hand-rolled canvas is real engineering.** Mitigation: it is the U3 phase's entire
  focus, spec'd to 600 lines with the perf story as its test harness; the fallback
  (SVG plate capped at 800 nodes with a printed cap notice) is designed, not imagined.
- **The guilloché could read as noise to a hurried judge.** Mitigation: beat 3's one-liner
  teaches it in nine words; the legend card repeats it; and the empty state's PERFECT
  rosette gives the eye its reference for "clean."

---

# PART 21 — FINAL REVIEW STATEMENT

The department's position, for the record:

This blueprint replaces three rejected directions with one that cannot be produced by
default settings: a light-first, engraved, editorially-gridded instrument whose single
ornament — the data-drawn guilloché — is simultaneously the product's art, its evidence
display, and its identity. Its ten structural corrections (Part 0.2) convert a themed
dashboard into an operator's instrument: master-detail triage, evidence with counterweight,
held authority, pull-only liveness, papered handoffs, and time as a scrubbable dimension.

Every claim in this document is either measurable (budgets, ratios, timings), enforceable
(lint, CI, snapshots), or rehearsable (the score). Where taste was required, the trade is
named in an audit block beside the decision. Nothing here depends on inspiration holding;
it depends on the Ration being kept and the gates being run.

**The one-sentence brief, final:** *an anti-fraud instrument designed in the language money
invented to defend itself — printed, not painted; held, not clicked; real, or not rendered.*

Signed: Creative Direction · Type · Motion · Interaction · Accessibility · Performance
14 JUL 2026 · SHEET ∞ · THE SECURITY PRESS

*— end of blueprint —*
