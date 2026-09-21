# GEO + SEO audit of goluq.com

**Audit date:** 22 September 2026
**Site:** https://goluq.com (Vite/React single-page app, served by the Hono server in `server/index.ts` behind Cloudflare)
**Business type:** Agency / services (custom software, WhatsApp systems, managed plans) with a local-business footprint (Indore) and 144 industry-by-city landing pages
**Pages inspected:** `/`, `/ceo`, `/partner`, `/solutions`, `/about`, `/for/coaching-institutes/indore`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/og-image.png`, plus the page sources in `src/pages/` and the copy in `src/i18n/en.json`
**Method:** read-only. Raw HTML fetched with curl and the GEO skill's `fetch_page.py` / `citability_scorer.py` (no browser, no JavaScript). Nothing in the repo was changed, nothing was deployed. No traffic or ranking numbers are claimed anywhere in this report because none were measured.

---

## 1. The one-paragraph verdict

**Overall GEO score: 24 / 100 (Critical).** The words on goluq.com are good: plain, specific, honest about worked examples, with a real founder, real credentials, real phone and email, and 144 city pages that match how owners actually search. The problem is that almost none of those words exist in the HTML the server sends. Every URL returns the same 5 KB shell with an empty `<div id="root">`, the same title, no description that matches the page, no canonical link, no structured data and no `llms.txt`. Google can run the JavaScript and eventually see the page; ChatGPT, Perplexity, Claude and most other AI fetchers do not, so to them the whole site is one page called "GoLuQ — Software, apps & automations built for your business" with ten words of body text. The fixes are mostly small and all sit in three files.

### Score breakdown (weights from the geo-audit skill)

| Area | Score | Weight | Weighted | One-line reason |
|---|---|---|---|---|
| AI citability | 15 | 25% | 3.75 | Quotable copy exists in `en.json`, but `citability_scorer.py` found 0 text blocks in the served HTML |
| Brand authority | 15 | 20% | 3.0 | A web search for "GoLuQ" returned only the GitHub repo; no Wikipedia, Reddit, YouTube or press mentions found. Founder LinkedIn exists |
| Content E-E-A-T | 50 | 20% | 10.0 | Strong founder bio, credentials, honest labelling, privacy/terms, real contact details; but no dates, no bylines, no named client testimonial on the site |
| Technical GEO | 35 | 15% | 5.25 | Crawlers allowed, HTTPS, good security headers, working sitemap; but no server-rendered text, one title for 167 URLs, no canonical, no llms.txt, og:image is a 404 |
| Schema / structured data | 0 | 10% | 0.0 | No JSON-LD anywhere |
| Platform optimisation | 20 | 10% | 2.0 | Google can render the SPA; Bing partly; ChatGPT/Perplexity/Claude fetchers see the empty shell. No YouTube channel or Google Business Profile found |
| **Total** | | | **24** | |

---

## 2. What was checked, and what was found

### 2a. AI crawler access (robots.txt, meta, headers) — GOOD

- `robots.txt` (served by `server/index.ts` line 532): `User-agent: *`, `Allow: /`, disallows only `/admin`, `/portal`, `/api/`, and lists the sitemap. No AI bot is blocked. Correct.
- Requests with the `GPTBot`, `ClaudeBot` and `PerplexityBot` user-agents all returned HTTP 200.
- No `<meta name="robots">` in the shell (the `/preview` route adds `noindex` from JavaScript, which is fine).
- One thing to verify in the Cloudflare dashboard, not in code: the served HTML contains Cloudflare's bot-detection script (`/cdn-cgi/challenge-platform/...`). If "Bot Fight Mode" or "Block AI Scrapers and Crawlers" is switched on in Cloudflare, real AI crawlers can be challenged even though robots.txt allows them. Check **Security → Bots** and make sure AI crawlers are set to Allow.
- Security headers are strong (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy). Minor tidy: `X-Frame-Options` is sent twice with conflicting values (`DENY` from `server/index.ts`, `SAMEORIGIN` from Cloudflare) and HSTS twice. Harmless, but remove one layer.

### 2b. llms.txt — MISSING

`https://goluq.com/llms.txt` returns 404. A full draft is in section 5. It is a ten-line addition to `server/index.ts` next to the `/robots.txt` route.

### 2c. Schema.org JSON-LD — NONE

Zero `application/ld+json` blocks on any URL. The geo-audit skill classifies "complete absence of any structured data" as Critical. What to add, in order:

1. **Organization + LocalBusiness** (site-wide, in `index.html`) — draft in section 6.
2. **Person** for the founder (site-wide, in `index.html`) — draft in section 6.
3. **WebSite** with the site name (tiny, same block).
4. **FAQPage** on `/whatsapp-office`, `/whatsapp-store` and `/security` — the questions and answers already exist as `products.office.faq[*]`, `products.store.faq[*]` in `src/i18n/en.json`; they only need to be emitted as JSON-LD.
5. **Service** for WhatsApp Office, WhatsApp Store, custom software and the managed plan (on `/solutions` and each product page).
6. **VideoObject** for the eight ninety-second films on `/ceo` (they are real files: `/media/ceo-coach-en.mp4`, poster `/media/ceo-coach-en-poster.jpg`, Hindi cut `/media/ceo-coach-hi.mp4`, and the same pattern for `ceo-dist`, `ceo-ca`, `ceo-adv`, `ceo-cap`, `pharm`, `aiostory`, `boss`).

### 2d. Technical: what a crawler without JavaScript sees — CRITICAL

Measured with the skill's `fetch_page.py` on the live site:

| URL | Title served | Words in body | H1 found | Canonical | JSON-LD |
|---|---|---|---|---|---|
| `/` | GoLuQ — Software, apps & automations built for your business | 10 | none | none | none |
| `/ceo` | (same) | 10 | none | none | none |
| `/partner` | (same) | 10 | none | none | none |
| `/solutions` | (same) | 10 | none | none | none |
| `/for/coaching-institutes/indore` | (same) | 10 | none | none | none |
| `/about` | (same) | 10 | none | none | none |

The ten "words" are Cloudflare's script, not page content. `ForPage.tsx` does set a proper title, description and canonical, but only from JavaScript after the page loads, so the 144 city pages are invisible to non-rendering crawlers and look like duplicates of the home page to the rest.

Other technical findings:

- `/og-image.png` (referenced by `index.html` for Open Graph and Twitter cards) is a **404**. Link previews on WhatsApp, LinkedIn and Telegram show no image. `public/brand/profile-1080.png` exists and can stand in until a 1200×630 card is made.
- `og:image` and the missing `og:url` are relative; social scrapers need absolute URLs.
- Sitemap: 167 URLs, correctly built from `src/data/forPages.json`. But `lastmod` is always "today" (line 527 of `server/index.ts`), which tells crawlers every page changes daily and makes the date meaningless.
- Hindi is a client-side toggle (`src/i18n/index.ts`), not a URL. Crawlers and AI systems can never see the Hindi copy. Not urgent, but the Hindi city pages are the ones with the least competition.
- HTTPS, HSTS and mobile viewport are fine. Fonts are loaded non-blocking. Good.

### 2e. Citability of the five key pages (judged on the rendered copy, since the raw HTML has none)

| Page | Strengths | Gaps |
|---|---|---|
| Home `/` | Short "before / with GoLuQ" pairs are highly quotable ("Forty shops. Forty reminders. One phone."). Founder paragraph is specific. "Your number, your customers" trust block is clear | No sentence that says in one line what GoLuQ is. The H1 is "Why not yours?", which means nothing out of context. Many chapters are pictures and animations |
| `/ceo` | Excellent: eight worked examples with numbers, each labelled "worked example, not client results" (honest and AI-safe). "How it starts" is a perfect 40-word answer block | Videos carry the story and have no transcript on the page; region-specific chapters are hidden behind `<details>` |
| `/partner` | The Q&A chips ("How much can I earn?", "Is there any joining fee?") are ready-made FAQ material | Everything is behind a click-through bot flow (`intro → calculator → questions → register`); nothing is on the page at load, even after JavaScript |
| `/solutions` | Clear grouping by role, business type, industry and city | It is a tile grid: no paragraph explains what a "solution" is or what is delivered |
| `/for/coaching-institutes/indore` | Right title pattern, three industry pains, three promises, live price, city and industry cross-links | Only ~120 words. No FAQ, no local sentence ("Indore, Madhya Pradesh"), no example of what was built for a coaching institute |

### 2f. Content E-E-A-T

- **Experience / Expertise:** the About page lists twenty-plus years, named employers (Spryance, RAKBANK, Genpact, DXC, Hexaware, EdCast), and five credentials (The Institutes, PMI, Microsoft, Genpact Lean Six Sigma). This is well above average for a small agency.
- **Authoritativeness:** three live products (NidaanPartner.com, Sarathi-AI.com, EagleEye.work) are linked but none of those sites is confirmed to say "built by GoLuQ", so the link is one-way. Only one third-party mention of GoLuQ was found on the web (the GitHub repo).
- **Trustworthiness:** real email, real WhatsApp number, privacy and terms pages served as plain HTML, worked examples clearly labelled. Good. `docs/testimonial-ashwin.md` exists in the repo but no testimonial appears on the site.
- **Missing:** no publication or "last updated" dates, no byline on content pages, no author markup. The LinkedIn URL in `src/pages/About.tsx` still carries a `TODO(confirm)` comment.
- **Name consistency:** the site says "Dushyant Sharma"; the git author is "Dushyant Kumar". AI systems match entities by exact name across sources. Use one public name on the site, LinkedIn, GitHub and Google Business Profile.

---

## 3. Top 10 fixes, ranked by impact against effort

| # | Fix | Impact | Effort | Where |
|---|---|---|---|---|
| 1 | Per-route `<title>`, `<meta description>` and `<link rel="canonical">` injected by the server | Very high | 1–2 hours | `server/index.ts` |
| 2 | Organization + LocalBusiness + Person + WebSite JSON-LD in the head | High | 30 min | `index.html` |
| 3 | Serve `/llms.txt` | High (AI) | 20 min | `server/index.ts` |
| 4 | Put each page's real text inside `#root` on the server | Very high | 1 day | `server/index.ts` + `src/data/forPages.json` |
| 5 | Fix the 404 og:image and use absolute URLs | Medium | 15 min | `index.html`, `public/` |
| 6 | FAQPage JSON-LD where FAQs already exist; add a 4-question FAQ to the city pages | High | Half a day | `src/pages/ProductPage.tsx`, `Security.tsx`, `ForPage.tsx` |
| 7 | VideoObject JSON-LD for the eight `/ceo` films, plus a two-line transcript each | Medium | 2 hours | `src/pages/CeoStory.tsx` |
| 8 | A one-sentence definition of GoLuQ at the top of `/` and `/solutions`, plus dates and a byline | Medium | 1 hour | `src/i18n/en.json`, `src/pages/StoryHome.tsx`, `Solutions.tsx` |
| 9 | Real `lastmod` in the sitemap | Low | 15 min | `server/index.ts` line 527 |
| 10 | Build the brand footprint off-site (LinkedIn company page, YouTube channel with the films, Google Business Profile for Indore, "Built by GoLuQ" links from the three product sites, the Ashwin testimonial on the site) | High, slow | Ongoing | Not code |

### How to do each one

**1. Per-route title, description, canonical (server).** In `server/index.ts`, the catch-all at line 534 returns the same `indexHtml` string for every path. Add a small route table (home, `/ceo`, `/partner`, `/solutions`, `/about`, `/security`, `/whatsapp-office`, `/whatsapp-store`, `/services`, `/build`, `/start`) and generate the `/for/...` entries from `forPages.industries` and `forPages.cities` (the same data `ForPage.tsx` already uses to set `document.title`). Before returning, replace `<title>…</title>` and the description `content="…"` and insert `<link rel="canonical" href="https://goluq.com/<path>">`. Unknown paths keep the default. This one change turns 167 identical pages into 167 distinct ones for every crawler, with no change to the React app.

**2. Organization, LocalBusiness, Person, WebSite JSON-LD.** Paste the block in section 6 into `index.html` just before `</head>`. It is static, so it is safe under the current CSP (the CSP blocks inline *executable* scripts; `type="application/ld+json"` is data, not executed).

**3. llms.txt.** Add next to the robots route in `server/index.ts`:
`app.get("/llms.txt", (c) => c.text(LLMS_TXT, 200, { "content-type": "text/plain; charset=utf-8" }));` with the text from section 5 in a constant (or read from a file in `public/`, but the catch-all currently 404s unknown `.txt` files, so a route is simpler).

**4. Server-side page text.** Same place as fix 1. For each known route, replace `<div id="root"></div>` with `<div id="root">` + a plain HTML block (`<h1>`, one intro paragraph, the three pains, the three promises, the FAQ, and the city/industry links) + `</div>`. React's `createRoot().render()` replaces that content on load, so visitors see no difference; crawlers finally see the page. For the 144 city pages the text already lives in `forPages.json` and the `promises` array in `ForPage.tsx` — move `promises` into the JSON so both server and client read the same words. A full server-rendering setup (`renderToString`) is the better long-term answer but touches the whole app; this seed-HTML approach gets ninety percent of the value in a day.

**5. og:image.** Add a 1200×630 `public/og-image.png` (until then, point `og:image` and `twitter:image` at `https://goluq.com/brand/profile-1080.png`). Make the URL absolute and add `<meta property="og:url">` (also per route, via fix 1).

**6. FAQPage schema.** In `ProductPage.tsx` and `Security.tsx`, emit a `<script type="application/ld+json">` built from the existing `faq` arrays. In `ForPage.tsx`, add four questions per page ("What does GoLuQ build for coaching institutes in Indore?", "What does it cost?", "How long does it take?", "Do I own the code?") with the answers already used elsewhere on the site, and emit them as FAQPage too. Remember these only reach crawlers once fix 4 puts the HTML on the server.

**7. VideoObject.** For each entry in `STORIES` in `CeoStory.tsx`: `name`, `description` (the hook line), `thumbnailUrl` (`/media/<id>-en-poster.jpg`), `contentUrl` (`/media/<id>-en.mp4`), `uploadDate`, `duration` ("PT1M30S"), `inLanguage`. Add a two-sentence text summary under each film so the story is readable without pressing play.

**8. Definition sentence, dates, byline.** Add to `story.sub` (or a new first paragraph) one sentence an AI can lift whole: "GoLuQ.com Digital Consultancy is a software team in Indore, India, founded by Dushyant Sharma, that builds WhatsApp systems, custom business software and owner dashboards at a fixed written price, in weeks, and runs them for a monthly fee lower than one salary; the customer owns the code and the data." Put a "Written by Dushyant Sharma · Updated <month year>" line on `/about`, `/security` and `/ceo`.

**9. Sitemap lastmod.** Replace `today` with a per-page date: a constant per fixed route bumped when the copy changes, and the file's last-commit date for `/for/` pages (or one constant for all of them).

**10. Off-site.** Everything AI systems learn about GoLuQ today comes from goluq.com itself, and they cannot read it. Priorities: LinkedIn company page linked from the site (`sameAs`), YouTube channel with the eight films (each linking back to `/ceo`), Google Business Profile for the Indore address with the same name/phone/email as the site, a "Built by GoLuQ.com" footer line on nidaanpartner.com, sarathi-ai.com and eagleeye.work, and the Ashwin testimonial (`docs/testimonial-ashwin.md`) on `/` with a name and business type.

---

## 4. Severity list (skill classification)

- **Critical:** no indexable content without JavaScript (all routes); no structured data at all.
- **High:** no llms.txt; one title/description for 167 URLs; no canonical in HTML; no Organization/LocalBusiness/Person schema; no author attribution; near-zero third-party brand mentions.
- **Medium:** FAQ content without FAQPage schema; og:image 404; `/partner` content hidden behind a click flow; city pages thin (~120 words); no Hindi URLs.
- **Low:** sitemap `lastmod` always today; duplicated security headers; LinkedIn URL marked TODO; founder name differs between site and git identity.

---

## 5. Draft llms.txt (ready to serve at https://goluq.com/llms.txt)

```
# GoLuQ

> GoLuQ.com Digital Consultancy is a small software team in Indore, India, founded and led by Dushyant Sharma. GoLuQ builds WhatsApp-based office and store systems, custom business software, owner dashboards and workflow automations for small and mid-sized businesses in India, the Gulf, Australia and New Zealand, at a fixed price agreed in writing, delivered in weeks, then run for a monthly fee. The customer owns the code, the data and the WhatsApp number.

GoLuQ works in English and Hindi. Prices are shown live on the site for the visitor's region and confirmed in writing before any work starts. All numbers in the story pages are worked examples, not client results.

## Key pages

- [Home](https://goluq.com/): the story chapters, live product prices, the founder and how to start
- [Become the CEO of your business](https://goluq.com/ceo): eight ninety-second stories (coaching institute, FMCG distributor, CA firm, partners, "rent or own" software) with worked numbers
- [Solutions](https://goluq.com/solutions): what GoLuQ builds, by role, business type, industry and city
- [The WhatsApp Office](https://goluq.com/whatsapp-office): every customer conversation on one business number, staff run it from their phones, follow-ups and appointments handle themselves; live in 21 days; FAQ on ownership, integrations, payment
- [The WhatsApp Store](https://goluq.com/whatsapp-store): catalogue inside WhatsApp (and Telegram for CIS markets), one upload reaches every customer, orders arrive as data; FAQ on costs and number safety
- [Security](https://goluq.com/security): how customer data is kept, who can see it, encryption, nightly backups, export on request
- [About](https://goluq.com/about): founder Dushyant Sharma, twenty-plus years in US healthcare operations, banking, Genpact, DXC, Hexaware and EdCast; credentials from The Institutes, PMI, Microsoft and Genpact Lean Six Sigma
- [Partner programme](https://goluq.com/partner): free to join, no tech skills; partners introduce business owners and earn a share of profit per order plus a monthly share on managed customers
- [Start](https://goluq.com/start): describe the need in your own words; GoLuQ replies with a written plan and a fixed price

## Industry and city pages

One page per industry per city, 12 industries × 12 cities (Indore, Bhopal, Ujjain, Dewas, Jabalpur, Gwalior, Pune, Surat, Ahmedabad, Jaipur, Nagpur, Raipur). Pattern: https://goluq.com/for/<industry>/<city>

- [Software for coaching institutes](https://goluq.com/for/coaching-institutes)
- [Software for coaching institutes in Indore](https://goluq.com/for/coaching-institutes/indore)
- [Full list in the sitemap](https://goluq.com/sitemap.xml)

## Products already built and running

- [NidaanPartner.com](https://nidaanpartner.com): insurance claim dispute firm; intake, documents and four offices on one screen
- [Sarathi-AI.com](https://sarathi-ai.com): voice-first CRM for financial advisors on WhatsApp and Telegram
- [EagleEye.work](https://eagleeye.work): decision intelligence for teams (prototype)

## Contact

- Email: dushyant@goluq.com
- WhatsApp: +91 83495 04400
- Location: Indore, Madhya Pradesh, India
- LinkedIn: https://www.linkedin.com/in/dushyant-sharma-89659b23/

## Policies

- [Privacy](https://goluq.com/privacy)
- [Terms](https://goluq.com/terms)

## Optional

- [Build with GoLuQ](https://goluq.com/build)
- [Services](https://goluq.com/services)
```

---

## 6. Draft JSON-LD for index.html (one block, before `</head>`)

Replace the street address and postcode before shipping; everything else is taken from the site. Remove `hasCredential` entries you do not want public.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "LocalBusiness", "ProfessionalService"],
      "@id": "https://goluq.com/#org",
      "name": "GoLuQ.com Digital Consultancy",
      "alternateName": "GoLuQ",
      "url": "https://goluq.com/",
      "logo": "https://goluq.com/brand/profile-1080.png",
      "image": "https://goluq.com/brand/profile-1080.png",
      "description": "GoLuQ builds WhatsApp office and store systems, custom business software, owner dashboards and workflow automations for small and mid-sized businesses, at a fixed written price, delivered in weeks and run for a monthly fee. Customers own the code, the data and the WhatsApp number.",
      "email": "dushyant@goluq.com",
      "telephone": "+91-83495-04400",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "STREET ADDRESS HERE",
        "addressLocality": "Indore",
        "addressRegion": "Madhya Pradesh",
        "postalCode": "POSTCODE HERE",
        "addressCountry": "IN"
      },
      "areaServed": ["IN", "AE", "SA", "AU", "NZ", "US", "GB"],
      "availableLanguage": ["en", "hi"],
      "founder": { "@id": "https://goluq.com/#founder" },
      "sameAs": [
        "https://www.linkedin.com/in/dushyant-sharma-89659b23/",
        "https://github.com/kumar26dushyant-lab/goluq-staffing"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "sales",
        "email": "dushyant@goluq.com",
        "telephone": "+91-83495-04400",
        "availableLanguage": ["en", "hi"]
      },
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "What GoLuQ builds",
        "itemListElement": [
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "The WhatsApp Office", "url": "https://goluq.com/whatsapp-office", "description": "Every customer conversation on one business WhatsApp number; staff run it from their phones; follow-ups, documents and appointments handle themselves. Live in 21 days." } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "The WhatsApp Store", "url": "https://goluq.com/whatsapp-store", "description": "Catalogue inside WhatsApp and Telegram; one upload reaches every customer; orders arrive as data." } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Custom business software and owner dashboards", "url": "https://goluq.com/solutions", "description": "Software built for one business at a fixed written price, in weeks; the customer owns the code and the data." } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Managed plan", "url": "https://goluq.com/ceo", "description": "GoLuQ runs the system month to month: monitoring, fixes, new flows and a monthly report." } }
        ]
      }
    },
    {
      "@type": "Person",
      "@id": "https://goluq.com/#founder",
      "name": "Dushyant Sharma",
      "jobTitle": "Founder",
      "worksFor": { "@id": "https://goluq.com/#org" },
      "url": "https://goluq.com/about",
      "image": "https://goluq.com/founder.png",
      "email": "dushyant@goluq.com",
      "sameAs": ["https://www.linkedin.com/in/dushyant-sharma-89659b23/"],
      "description": "Founder of GoLuQ.com Digital Consultancy, Indore. Twenty-plus years running operations in US healthcare (Spryance India), banking (RAKBANK Dubai), Genpact, DXC Technology, Hexaware Technologies and Cornerstone OnDemand (EdCast).",
      "knowsAbout": ["WhatsApp Business API", "business process automation", "custom software for small businesses", "claims and collections operations", "Lean Six Sigma", "agile project management"],
      "hasCredential": [
        { "@type": "EducationalOccupationalCredential", "name": "Property & Casualty Insurance, Risk Management & Insurance", "recognizedBy": { "@type": "Organization", "name": "The Institutes Knowledge Group" } },
        { "@type": "EducationalOccupationalCredential", "name": "Agile Project Management", "recognizedBy": { "@type": "Organization", "name": "Project Management Institute" } },
        { "@type": "EducationalOccupationalCredential", "name": "Lean Six Sigma", "recognizedBy": { "@type": "Organization", "name": "Genpact Centre of Excellence" } },
        { "@type": "EducationalOccupationalCredential", "name": "Career Essentials in Generative AI", "recognizedBy": { "@type": "Organization", "name": "Microsoft" } }
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://goluq.com/#website",
      "url": "https://goluq.com/",
      "name": "GoLuQ",
      "publisher": { "@id": "https://goluq.com/#org" },
      "inLanguage": ["en", "hi"]
    }
  ]
}
</script>
```

For the per-page types (FAQPage, Service, VideoObject) the same pattern applies: one `<script type="application/ld+json">` in the page component, filled from the arrays that already exist in `en.json`, `forPages.json` and `STORIES`.

---

## 7. Suggested order of work

- **Week 1 (half a day):** fixes 1, 2, 3, 5, 9. After this every URL has its own title, description and canonical, the site has an identity in structured data, AI systems have an llms.txt to read, link previews have an image.
- **Week 2 (one to two days):** fix 4 (server-side page text) and fix 6 (FAQ + FAQPage). This is the change that moves the citability score from near zero to something real.
- **Week 3:** fixes 7 and 8 (videos, definition sentence, dates, bylines); confirm the Cloudflare bot settings; confirm the LinkedIn URL.
- **Ongoing:** fix 10, the off-site footprint. Re-run this audit a month after week 2 and compare with the geo-compare skill.

---

## 8. How to sell GEO audits to clients

The same toolkit that produced this report is a repeatable product, and most Indian SMB sites will score in the same 20–40 band, for the same reasons (JavaScript-only pages, no schema, no llms.txt, no off-site mentions). The workflow with the installed skills:

1. **Capture the lead:** `/geo prospect new <domain>` records the company, contact, deal size and stage in `~/.geo-prospects/prospects.json`. Stages run Lead → Qualified → Proposal Sent → Won → Lost, and `/geo prospect pipeline` prints the whole funnel with expected monthly revenue.
2. **Audit in minutes:** `/geo prospect audit <domain>` runs the quick GEO check (robots, llms.txt, schema, rendering, citability) and saves the score to the prospect record. For a full report like this one, `/geo audit <url>` produces `GEO-AUDIT-REPORT.md`, and `/geo report-pdf` turns it into a branded PDF with a cover page and colour-coded score table.
3. **Generate the proposal:** `/geo proposal <domain> --client-name "…"` reads the audit, picks a tier from the score (0–40 Premium, 41–60 Standard, 61–75 Basic), and writes `~/.geo-prospects/proposals/<domain>-proposal-<date>.md` with executive summary, findings, three packages, a timeline and terms. The template's prices are in euros per month; replace them with GoLuQ's INR and USD price bands before sending.
4. **Prove progress and retain:** each month `/geo compare <domain>` diffs the baseline audit against a fresh one and produces a "here is what improved" report, which is the renewal conversation.

The pitch fits GoLuQ's own story: "You own the software; now make sure the AI assistants your customers ask actually know you exist." The audit is the free 30-minute call; the fixes (server text, schema, llms.txt, FAQ pages, off-site footprint) are the fixed-price build; the monthly compare report is the managed plan. Fixing goluq.com first, using this document, gives the before-and-after case study to show the first prospect.
