# Helpers on the owner's PC, and how to use them

Everything here is used by talking to Claude in VS Code. Nothing needs to
be run by hand except the two Remotion commands at the end. "Skill" means a
set of instructions Claude follows when asked; a slash command types it
directly.

## Where the rules live

| File | Applies to | What is in it |
| ---- | ---------- | ------------- |
| `C:\Users\imdus\.claude\CLAUDE.md` | every project, every VS Code window, new ones too | the security rules (no string SQL, no secrets in code, fail closed, validate at the boundary, no invented facts) |
| `C:\Goluq.com\CLAUDE.md` | this repo only | the GoLuQ brand, honesty, partner, secret and server rules, plus the code-review-graph notes |

Claude reads both at the start of each session. A rule is an instruction,
not a guard: the review tools below are what catch a slip.

## superpowers (plugin)

Ways of working that Claude switches on when the task fits. The ones that
matter here, and how to ask:

- "brainstorm this with me" before a new page or feature: it asks the
  questions first and writes a short design before any code.
- "plan this" turns the design into a checklist of small steps.
- "TDD this" writes the failing test first, then the code.
- "debug this systematically" when something misbehaves and the cause is
  not obvious: it forms a hypothesis and tests it before changing code.
- "review this branch" for a second pass on a finished change.
- `/superpowers:*` lists the rest; the same words in plain English work.

## code-review-graph (per repo)

A map of every function, call and import in this repo. It is rebuilt on its
own after each edit and checked at each commit. Use it through Claude:

- "what calls X" or "what breaks if I change X" before a risky edit.
- "review my changes" gives a risk-scored review of the uncommitted diff.
- "explain how the posting queue works" starts from the graph, then the
  source.
- Slash commands: `/review-changes`, `/explore-codebase`, `/debug-issue`,
  `/refactor-safely`.

For a new project, once: `pip install code-review-graph` is already done;
in that repo run `code-review-graph install --platform claude-code -y` and
`code-review-graph build`.

## ui-ux-pro-max (plugin)

A design reference: styles, palettes, font pairs, chart types and per-stack
rules (React, Tailwind, Flutter, SwiftUI and more). Ask:

- "design a landing section for the all-in-one theme, phone first".
- "give me a palette and font pair for a pharmacy client".
- "check this page against the UI rules" for a UX review.
- `/ui-ux-pro-max`, `/design-system`, `/brand`, `/slides`, `/banner-design`.

## geo-seo skills (all projects)

Audits for Google and for answers inside ChatGPT, Perplexity and Gemini.
Say the URL and what you want:

- "run a GEO audit of goluq.com" (full report, scored 0 to 100, with an
  action list). Roughly twenty minutes; it fans out to five review agents.
- "generate llms.txt for goluq.com", "check the schema on /for/pharmacy",
  "which AI crawlers can read the site", "citability of /ceo".
- "GEO proposal for <client site>" writes a client-ready proposal: this is
  also a service GoLuQ can sell.
- `/geo audit <url>`, `/geo llmstxt <url>`, `/geo schema <url>`,
  `/geo report <url>`.

The scripts behind it run on `py -3.12`. Do not install Playwright or
Flask for them; the parts we use do not need those.

## Remotion (video/)

Films from code. The site's `public/` folder is the asset root, so every
card, poster and story image is already available to it. First composition:
`CardShort`, a 9:16 slideshow of the square cards with the brand line, a
progress bar and a call to action, one render per language.

    cd video
    npm run studio                              # preview in the browser
    npx remotion render src/index.ts CardShort out/partner-en.mp4 --props=props/partner-en.json
    npx remotion render src/index.ts CardShort out/partner-hi.mp4 --props=props/partner-hi.json

A props file is a small JSON: which cards, the kicker, the call, optional
audio, seconds per card. Ask Claude: "make a short from the six all-in-one
cards in Hindi with the aiostory voice" and it writes the props and
renders. Output goes to the YouTube library and the posting queue the
usual way. Next steps, in order: card shorts for every theme, then captions
for new films, then clips for the city pages.

## Housekeeping

- The plugins were installed from downloaded folders; they do not update
  themselves. To update, download the zip again and say "re-add <name>".
- `py -3.13` is the protected machine-wide Python; `py -3.12` holds the
  packages. Plain `python` should not be used in scripts.
