# GoLuQ — Project Master

The single place that says what GoLuQ is selling, how it reaches customers, what
is actually built, and what is next. Updated as decisions are made, not after.

Last updated: 2026-08-30

---

## 1. The business in one paragraph

GoLuQ builds and deploys anything that runs on a computer, a laptop or a phone —
websites, apps, WhatsApp and workflow automations, offline software, Digital
Employees, and complete multi-branch platforms. Founder: Dushyant Sharma, 20+
years in operations at Genpact, DXC, Hexaware, Cornerstone OnDemand, Definitive
Healthcare and HighLevel. He builds what he sells.

Shipped and citable: **NidaanPartner.com** (multi-office claims platform, 4
offices, 2,000+ claims, 95%+ success), **Sarathi-AI.com** (voice-first CRM for
financial advisors), **EagleEye.work** (decision intelligence, daily audio brief).

---

## 2. The wedge — why we sell communication services

Custom software is a hard first sale: no budget line, no urgency, and the buyer
has to trust us before anything exists. A toll-free number or a WhatsApp API is
the opposite — a known purchase, already budgeted, bought in an afternoon.

So communication services are the **wedge**, not the product:

1. **First sale** — a number, an API, an SMS route. Small margin. Its real job is
   to make GoLuQ a vendor they have already paid once.
2. **Second sale** — the software that makes the number worth having. This is the
   margin, and it is the thing a telecom reseller cannot offer.
3. **Third sale** — the retainer that keeps it running.

The positioning line, which every page should be able to trace back to:

> Most vendors hand you a login. We build what runs behind it.

A number on its own does nothing. The value is in what happens when it rings —
the call arriving attached to the right customer record, the follow-up firing by
itself, the report triggering "your report is ready". Nobody selling the API
builds that part.

**The metric that matters** is not services sold. It is: *how many service
customers buy software within 90 days.* If that is near zero, the wedge is not
working and the pitch changes — not the price.

---

## 3. How a customer reaches us — the communication factor

This is the part that has to be right, because a visitor who cannot reach us is
a visitor we paid nothing to acquire and still lost.

| Channel | Status | What happens |
|---|---|---|
| **WhatsApp** (tap-to-chat) | needs the public number set | Opens WhatsApp to our verified business number. The message hits the Cloud API webhook, the GoLuQ guide answers in seconds, 24×7. The thread appears in cockpit → Chats; replying takes it over and silences the guide. |
| **Website chat widget** | live | Same guide, same prices, same rules — one shared brain (`functions/lib/concierge.ts`). Can hand off to a human, which emails an alert. |
| **Lead form** | live | Writes to `leads`, emails an alert with a tappable wa.me link, feeds the follow-up engine. |
| **Email** | live outbound (Resend) | Alerts to the owner, portal invites, stage changes, and the daily follow-up summary. Inbound routing is parked. |
| **Outbound WhatsApp** | live, template-only | Templates are the only thing that reaches someone outside their 24-hour window. Five approved: enquiry_received, quote_ready, project_stage_update, service_activated, followup_no_reply. |
| **Phone call** | **NOT possible on the WABA number** | A WhatsApp Cloud API number cannot receive ordinary voice calls. See the constraint below. |

### The call constraint — decide this
A number hosted on the Meta Cloud API is not a phone line. It cannot ring, and
it cannot be used in the WhatsApp Business mobile app. So if a visitor wants to
*call*, there are only three honest options:

1. Publish a **separate ordinary mobile number** for calls. Cheapest, works today.
2. Wait for **Exotel** and publish a virtual number with IVR. Better, costs money.
3. Publish no number and route everything to WhatsApp. Loses the callers who
   will not type.

Until this is decided, the site should not display a "call us" affordance that
does not work.

### Design rule
WhatsApp is the highest-converting route on the site and must never be buried —
header chip, floating button, and inside the services and pricing sections. If
`public_whatsapp` is empty, every one of those silently disappears. **Check it
after any Settings save.**

---

## 3a. Pricing by market

Every visitor sees the price in their own money, resolved from the edge country
header and converted **on the server**, so the page and the guide can never
quote two different numbers. Verified live: AED 1,699 in Dubai, $449 in the US,
£349 in the UK, A$699 in Australia, ₹9,999 in India.

**These are price bands, not exchange rates.** Straight conversion would put the
toll-free setup near $115, which in a developed market does not read as a
bargain — it reads as amateur, and it caps what we could ever quote that buyer
afterwards. India stays the base and is never altered. South Asia has its own
lower band.

The multiplier is `intl_multiplier` in cockpit settings (currently 4). Raising
it raises every international price at once; India is unaffected.

Constants live in `functions/lib/markets.ts`. They are pricing decisions, not a
rate feed — review once or twice a year; nothing breaks if they drift.

| | India | UAE | US | UK | Australia | South Asia |
|---|---|---|---|---|---|---|
| Toll-free | ₹9,999 | AED 1,699 | $449 | £349 | A$699 | $159 |
| WhatsApp API | ₹7,999 | AED 1,299 | $349 | £299 | A$549 | $129 |
| Voice plan /mo | ₹4,999 | AED 799 | $249 | £199 | A$349 | $79 |

## 3b. The two products — decided 2026-09-05

Everything built for tier-2 India is the WEDGE and the PROOF. The revenue is two
productised offers sold at a real price to firms with 10–100 staff, in India and
abroad, plus a managed plan that stacks monthly.

| | India | International |
|---|---|---|
| **WhatsApp Office** — a professional-services firm's whole customer communication on WhatsApp, staff on Telegram, live in 21 days | ₹1,00,000 setup · ₹10,000/mo managed | $2,900 · $490/mo |
| **WhatsApp Store** — catalogue broadcast + native WhatsApp ordering for a wholesaler, two-channel (WhatsApp + Telegram) | ₹1,00,000 · ₹10,000/mo | $2,900 · $490/mo |

International prices are explicit per row (`price_intl_usd`), not derived — ₹1L
through the 4× band is $4,500 and the decision was $2,900. Cockpit-editable, and
the guide quotes the same figure the page prints. Verified: AED 10,599 in UAE.

**Who buys this:** owners fed up with standard software — bug queues, per-seat
pricing, usage meters, no autonomy. Not a segment; a state of mind. The wedge
serves everyone else.

**Retention:** the managed plan must include a monthly ROI report from the
customer's own system (calls answered after hours, follow-ups sent, hours
removed). Tier-2 owners unplug anything without visible ROI.

**The Store's constraints** (say them before promising): Iran cannot be on the
WhatsApp API (sanctions); Russia is at risk — so the Store is two-channel from
day one with Telegram for CIS. WhatsApp Status cannot be automated; direct media
templates replace it. Every broadcast is a paid marketing conversation
(~$100–400/mo at 1,000 customers weekly), passed through at cost; quality rating
protection is part of the engine.

**Dubai garment client:** discounted first Store build in exchange for a
testimonial, warm leads into his customer base, and partner commission on what
converts. A Dubai reference does more for Indian trust than an Indian one.

## 4. What is built and live

### Telegram cockpit (2026-09-06)
The answer to "how do I know a customer is waiting". One bot, paired to the
owner's chat by a 6-digit code minted in the cockpit (15-minute life); anyone
else who finds the bot is ignored. Every new enquiry, every inbound WhatsApp
message (with the guide's reply) and the first message of every website chat
arrive on the phone. **Replying to an alert replies to that customer** — the
same code path as the cockpit's Live chat, so the transcript shows it and the
guide steps aside for 30 minutes. Buttons: leads get Book / Park (7 days) /
Drop; conversations get Guide off / Guide on / Close. Commands: /leads,
/waiting, /help; reply `/off` `/on` `/close` act on that thread. Webhook is
`/api/tg/webhook`, verified by Telegram's secret-token header. Token is
write-only in the cockpit or `TELEGRAM_BOT_TOKEN` in the env.

### Partner commission — profit share (2026-09-06)
Decided: a partner earns **X% of GoLuQ's profit** on a project they introduced
(price − cost to deliver), not X% of the price. The commission comes out of the
margin; the customer's price is the same with or without a partner. Booked ONLY
when a payment is recorded on the project (Projects → Money → Record payment),
proportionally — instalments add up to exactly rate × profit once fully paid.
Enhancements for that customer within `aff_enh_months` (default 24) earn the
same; maintenance never does. The public calculator cannot know a real cost, so
it shows an estimate at `aff_typical_margin` (default 40%) and says so. Ledger
with Approve → Mark paid lives in the Affiliates tab. Settings: `aff_rate`,
`aff_enh_months`, `aff_typical_margin`, `aff_min_payout`,
`aff_attribution_days`; the old `year1`/`lifetime` pair and the hardcoded-35%
`/api/affiliate/convert` are gone.

**Site** — Vite + React 18 + TypeScript + Tailwind (CSS-variable tokens) +
Framer Motion + i18next (EN/HI) + Three.js background. Deployed on a Contabo VM
(`/opt/goluq`, systemd `goluq`, nginx → 127.0.0.1:8090, `bash deploy/update.sh`).
Server is Hono reusing the Cloudflare Pages Function handlers unchanged, with a
D1 shim over better-sqlite3.

| Area | Route | State |
|---|---|---|
| Digital Employee demo funnel | `/` | live |
| Custom build funnel | `/build`, `/build/global` | live |
| Communication catalogue (7 services) | `/services` | live |
| Partner / affiliate programme | `/partner` | live |
| Owner cockpit | `/admin` | live, installable as an app |
| Customer portal (7 SDLC stages) | `/portal` | live |
| WhatsApp guide (Meta Cloud API) | `/api/wa/meta` | **live and verified end to end** |

**The guide** — one persona and one live price list shared by the website and
WhatsApp, read per-request from the `pricing` table so a cockpit edit reaches
live conversations immediately.

**Honesty rules baked into the product** (these are a differentiator, not a
disclaimer): setup excludes usage; SMS needs DLT registration in the customer's
own name; WhatsApp needs a verified Business Manager and approved templates;
Digital Employees are built to order in 2–4 weeks, never "instant"; ₹799 is
chat-only, live calling starts at ₹4,999.

---

## 5. Open decisions

- **Comms setup prices** are defaults, not costed: ₹9,999 toll-free · ₹4,999
  virtual number · ₹7,999 WhatsApp API · ₹9,999 voice campaign · ₹5,999 SMS ·
  ₹3,999 missed call. Confirm against real Exotel/Meta wholesale before promoting.
- **Exotel**: not paying until one customer signs. Agreed.
- **The call channel**: see section 3.
- ~~Homepage direction~~ — decided: comms-first hero, demo below it.
- **Which Meta app is the platform app** (GoLuQ's or Sarathi's) — see section 6.

---

## 6. Meta / WhatsApp setup notes

- The **access token** is a System User token scoped to a Business Manager. One
  token works across several WABAs *only* if they sit under the same Business
  Manager and that System User has been granted access to each.
- The **app secret** must belong to the app that owns the webhook subscription,
  because `X-Hub-Signature-256` is computed with it. A mismatch means every
  inbound message is rejected as a bad signature — silently, from the customer's
  point of view.
- One Meta app can serve many WABAs. That is how a reseller is meant to work, so
  reusing a single "platform app" is correct — the question is only *which* one.
- Selling WhatsApp onward to other businesses requires **Tech Provider** status
  and Embedded Signup, which is a separate application to Meta. Not yet started.
- **Display name** "GoLuQ - Digital Consultancy" is DECLINED (confirmed from
  Meta: `name_status: DECLINED`). It does not block messaging — the number is
  GREEN and sending works — customers simply see the number rather than a name.
  Resubmit as plain **GoLuQ** or **GoLuQ.com**: a name matching the domain is
  trivially substantiated, whereas an appended category like "Digital
  Consultancy" has to be evidenced and usually is not.

### Webhook diagnosis, 2026-08-30 — RESOLVED
Everything on our side and in the app config is correct:
- Meta verified the callback URL (200 to their `facebookplatform` GET).
- App subscription is live: `whatsapp_business_account` →
  `https://goluq.com/api/wa/meta`, active, field `messages`.
- Number: +91 83495 04400, CLOUD_API, code VERIFIED, quality GREEN.
- Token is valid, never expires, and belongs to the **GoLuQ.com app**
  (839673715804540) — the System User is merely *named* "sarathi wa", so
  nothing needs unplugging from Sarathi.

**Root cause: the WABA was subscribed to no app at all** —
`GET /{waba-id}/subscribed_apps` returned an empty list. Meta reports this
nowhere in the dashboard and raises no error; it simply forwards nothing. Fixed
with `POST /{waba-id}/subscribed_apps`, and the cockpit now checks it on every
"Check connection" so it can never be invisible again.

WABA id: `1942085573135209` · phone number id: `1259819740549744`.

The history below is kept because the sequence is what made the cause findable:
app config was correct throughout, which is exactly why the account-level switch
was the last place anyone looked.

**Meta had never POSTed a single message**: nginx shows zero requests
from Facebook to the webhook, `wa_events` is empty, and no `wa:` conversation
exists. Outbound works; inbound has never happened. Remaining causes, in order:
1. The app is in **Development mode**, which forwards webhooks only for
   allow-listed test numbers. This fits: the outbound test to 8875674400
   succeeded because that number is the registered test recipient.
2. The **WABA is not subscribed to the app** — a separate switch from the app's
   webhook field subscription, and the one most often missed.
3. The test message went to a different number than 8349504400.

---

## 7. To-do

Kept in priority order. Done items stay for a while so the history is visible.

### Blocking (none — WhatsApp is live)
- [ ] Retry the display name as plain **GoLuQ** once the post-decline cooldown
      lifts (the Edit control is unresponsive until then). Does not block
      messaging — the number is GREEN and sending works; customers simply see
      the number instead of a name.

### Next
- [x] **Booking link** set 2026-09-06 — `https://calendar.app.google/ntCZxLnkDbo1FodJ6`
      (a Google Calendar appointment schedule). Product pages now lead with
      "Book a 30-minute call". Schedule settings to keep aligned: 30 min, Google
      Meet on, booking form asks name + email + phone + "what does your business
      do", ≥4 h minimum notice, 15-min buffer, cap 3–4 calls/day, reminders 24 h
      and 1 h, time zone Asia/Kolkata with "let the booker pick their zone".
- [ ] **Monthly ROI report** in the managed plan.
- [ ] **Store engine** for the Dubai client: catalogue sync, segmented media
      broadcast with throttling and opt-out, native order webhook → Telegram
      approve/hold, Telegram channel for CIS customers.
- [ ] **Store engine** is parked until the founder has understood the Dubai
      client's use case in detail (customer count, countries, broadcast
      frequency). TikTok is part of his marketing and cannot be built or tested
      from India; all testing would depend on him, and he has little time.
- [ ] **Avatar video vendor** — HeyGen, decision 2026-09-06: start on the FREE
      tier (3 videos/month, 1 min, watermarked) purely to test whether the
      founder's avatar and voice convince in Hindi/Hinglish. Nothing watermarked
      goes out under the brand. If convinced → Creator (~$288/yr) for watermark
      removal and voice cloning, which matters more than resolution. No Video
      tab until then — the API is priced separately from the web plans. For
      clients this is a SERVICE, not a feature: "your own avatar explaining your
      product, one promo video a month" as a Managed-plan add-on, built after the
      first client asks. Founder still shoots one real 60-second intro himself.
- [x] **Telegram paired** 2026-09-06 — @GoLuQ_Bot, webhook registered, test
      message delivered. Alerts now reach the phone.
- [ ] Confirm real comms costs, then correct the prices in the cockpit.
- [ ] **Give the VM a way to pull from GitHub.** It has no credentials at all and
      has been pulling anonymously; GitHub now refuses ("expected flush after ref
      listing" / asks for a username), so `deploy/update.sh` fails. Worked around
      on 2026-09-02 with `git bundle`, which is fine once but not a deploy
      process. Needs a read-only deploy key or a fine-grained token.
- [ ] Build the campaigns tab — see below.
- [ ] Decide the call channel (section 3) — still open.

### Campaigns — what it takes
Sending an approved MARKETING template to a list. The constraints are the design:
- **Consent is required.** Only message people who gave you their number for
  this. Bought lists are the fastest route to a blocked number.
- **Messaging limits are tiered** — a new number starts low (250–1,000 unique
  recipients per 24h) and rises with consistent quality. Blasting early is how
  you stay at the bottom tier.
- **Quality rating is the real budget.** Blocks and "report" taps drop it from
  GREEN, and a low rating cuts the limit or suspends sending. Every other
  message we send depends on it.
- STOP is already honoured on inbound, permanently.

The differentiator, and why this is worth building: a GoLuQ campaign is not a
blast. Replies land in the same inbox and the guide answers them 24×7 — so the
campaign starts conversations rather than just delivering impressions. No
reseller can offer that, and it is the same wedge as everything else.

### Later
- [ ] Exotel provisioning, once a customer has paid.
- [ ] Tech Provider application, if reselling WhatsApp becomes real.
- [ ] Cloudflare inbound email routing (parked).

### Correction, 2026-09-05 — the partner programme promised revenue we do not earn
The page advertised "35% every month for the first year, then 12% for as long as
the business stays", with a calculator projecting two years of it. That is a
subscription model. GoLuQ builds software once and hands it over; there is no
recurring plan revenue to pay a trail out of, so the promise could not have been
honoured. The rate was also hardcoded at 35% in the copy while the cockpit said
20 — a partner read one number and would have been paid another.

Now: a share of each project once the customer has paid, the same share on
enhancements they later order, and maintenance explicitly not commissioned —
stated rather than omitted, because a partner who discovers an exclusion after
the fact stops believing every other term.

### Done
- [x] Telegram cockpit bot — alerts, reply-from-phone, lead and chat buttons (§4)
- [x] Affiliate model rebuilt as a profit share booked on payment; ledger UI (§4)
- [x] Cockpit and Telegram replies share one code path (`lib/agentReply.ts`)
- [x] Productised offers in the catalogue with explicit international prices;
      site, chat and WhatsApp move together on one cockpit edit
- [x] Product pages /whatsapp-office and /whatsapp-store, live-priced, with a
      cockpit booking link that leads the CTA once set
- [x] Testimonials: cockpit upload (self-hosted /media), live toggle, homepage
      and per-product rendering
- [x] Partner page corrected — project-based, rate interpolated, no monthly claim
- [x] Mobile nav sheet; live chat rebuilt mobile-first with timestamps
- [x] Follow-up cron scheduled daily on the VM (06:30 UTC / 10:00 IST)
- [x] Guide no longer muted forever by one manual reply; 30-minute handover,
      explicit on/off per conversation, and "talk to a human" detection
- [x] All 5 templates approved and WIRED — follow-ups, enquiry confirmation and
      project-stage updates now deliver. Verified by real sends in both
      languages, 2026-09-02.
- [x] Cockpit replies to a WhatsApp thread now actually reach the customer
- [x] **WhatsApp guide live and verified** — real conversation received, answered
      and stored, 2026-08-30
- [x] Meta app published; WABA subscribed to the app
- [x] Client login reachable from the site footer
- [x] Real Privacy Policy and Terms at /privacy and /terms (no-JS, reviewable)
- [x] Public WhatsApp number set and verified live on the site
- [x] Cockpit shows inbound webhook health, not just "credentials valid"
- [x] Comms-first homepage hero, real stats, live-price phone transcript
- [x] Per-market pricing and currency, page and guide in step (section 3a)
- [x] Communication catalogue at `/services`, sellable by the guide (Phase A)
- [x] WhatsApp guide on the verified WABA (Phase B)
- [x] Customer portal with SDLC stages (Phase C)
- [x] Homepage crash fix — `CapabilityTabs` rendered an undefined icon for the
      new comms ids and took the whole page down

### Cockpit redesign and the language decision (2026-09-08)
- Cockpit now opens on a **Today** board: waiting-for-a-person, upcoming calls
  (once bookings flow), new enquiries, unread and recent conversations, with
  tiles for the day. Fourteen tabs became four groups — Inbox / Sell / Deliver /
  Setup — sidebar on desktop, bottom bar + chips on a phone. Tapping a
  conversation on the board opens it in Conversations.
- Languages for the Dubai network (Gulf, Jordan, Iran, Russia, Kazakhstan,
  Armenia, Romania, Hungary): NOT translating the site yet. Lightest route first:
  `<html lang>` is set correctly so Chrome/Safari offer their built-in
  translation, and the guide now answers in whatever language the customer
  writes (Arabic, Russian, Persian…). Measure visits and chats by country on the
  Visitors tab; translate the two product pages into Arabic/Russian/Persian only
  if those countries actually show up. Both WhatsApp (via VPN where blocked) and
  Telegram are used there — publish the same content on both.
- Next: booking bridge (Apps Script → Telegram alert, WhatsApp confirmation and
  24 h / 1 h reminders), then `/book` in the visitor's local time.

### Cockpit, second pass (2026-09-09)
- Under `.cockpit` every surface is solid and still (no glass/blur/glow) — the
  admin is a tool, not the marketing site. Every screen opens with its name and
  one line on what it is for. Enquiries are cards with WhatsApp / Call / Email
  and status chips. Partners is rebuilt around the profit share: decisions
  first (approve, pay to UPI), then each partner and ledger, then terms. Email
  is one pane on a phone. Settings is sectioned (Contact & alerts / Telegram /
  WhatsApp Business API). Pricing grouped into products, comms, builds.
  Visitors shows enquiries by source and visitors by country.
- Bug fixed: the Conversations badge counted a month-old "wants a person"
  session forever. Waiting count and list order now ignore sessions idle for
  more than 7 days (same rule as the Today board).
- Homepage guide bubble no longer renders on /admin.

### WhatsApp Store catalog (2026-09-09)
- First draft of seven 1080×1080 catalog cards on a design canvas (Claude
  Design preview): WhatsApp Office, WhatsApp Store, Toll-free 1800, WhatsApp
  Business API, Voice & SMS, Custom software, Founder. GoLuQ brand (Space
  Grotesk/Inter, light tokens, Go/LuQ gradients), own layout — the Fortius
  samples were guidance for the *kind* of card, not copied. No prices on
  images (the catalog carries the live price). Export PNG per card → Meta
  Commerce Manager catalog attached to the WABA; product messages via API
  later. Founder photo: Business plan/New/20241031_191618.jpg (not in git).

### Catalogue cards, rendered (2026-09-09)
- The design-canvas draft was rejected (alignment). Replaced by a render
  pipeline I can see the output of: scene illustration per product from
  Gemini's image model (text-free, brand palette; script in scratchpad
  `catalog/scenes.mjs`, run on the VM with the project key) + exact HTML text
  layer + headless Edge screenshot at 1080×1080 (`catalog/build.mjs`). Every
  card was inspected before publishing. 16 cards live at
  `goluq.com/catalog/<pricing id>.jpg` — one per catalogue row (7 comms, 7
  builds, 2 products). Founder card pending the three new photos as files.
- Rule learned: a headless Edge launch needs its own --user-data-dir per run
  or it attaches to the open browser and takes no screenshot.

### Catalogue cards, third pass — icon-led (2026-09-09)
- The text-heavy composed cards were rejected ("show, don't tell"). Replaced
  with Fortius-style infographic cards generated whole by Nano Banana Pro
  (`gemini-3-pro-image-preview`, falls back to `gemini-2.5-flash-image`) from a
  structured prompt per product: headline, 5 icon tiles, How-it-works strip,
  Use-cases row; bottom band left empty and the exact contact footer added in
  HTML (`catalog/infographic.py` on the VM, `catalog/compose.mjs` locally).
  Every card inspected; five regenerated for overflow, a face, or a duplicate
  label. 17 cards live at `goluq.com/catalog/<id>.jpg` incl. `founder.jpg`
  (real photo passed as an input image; face preserved).
- Photos now on disk: `Business plan/New/Gemini_Generated_Image_*.png`
  (headshot, office, laptop). Not in git.

### Booking bridge (2026-09-09) — server side live
- `bookings` table, `/api/bookings/inbound` (shared secret shown in cockpit →
  Settings → Calendar bridge), Telegram alert on booking and cancellation, lead
  follow-ups stop when that phone books, Today board "Upcoming calls" reads it.
  Verified with a test booking + cancellation on the live server.
- Owner action: install `docs/booking-bridge/Code.gs` at script.google.com with
  the secret (5 minutes; steps in the file header).
- Pending templates `appointment_confirmed` and `appointment_reminder`
  (drafts in whatsapp-templates.md); once approved → confirmation on booking and
  an hourly reminders cron. Until then bookings reach Telegram only.

### Meta catalog (2026-09-09)
- Product catalog **GoLuQ**, id `4366824943570016`, owned by the business
  (970474245742283), created and filled by API with all 18 catalogue rows —
  names, honest descriptions, INR prices from the live pricing table, card
  images at goluq.com/catalog, links to the product/services pages. Stored in
  settings as `wa_catalog_id`. Commerce settings on the phone number: catalog
  visible, cart enabled.
- Re-sync after a price or copy change: `scp scripts/commerce-catalog.mjs` to
  the VM and `node commerce-catalog.mjs` (idempotent; retailer_id = pricing id).
- **Not possible by API**: connecting the catalog to the WABA
  (`POST /{waba}/product_catalogs` → "Manage Catalog permission" even after
  assigning the system user MANAGE on the catalog). Owner does it once in
  WhatsApp Manager → Catalog → Connect catalog → GoLuQ. After that the guide can
  send product cards (interactive product / product_list messages) — next build.

### Product cards on WhatsApp (2026-09-10)
- Catalog connected to the WABA by the owner (portfolio-level "Manage
  everything" on the catalog was the missing permission, not the token's).
- The guide now ends every WhatsApp reply with a hidden `[[card:id]]` tag; the
  named product is sent as an interactive product card after the text, once
  per thread (`chat_sessions.cards_sent`). "Price list" / "catalogue" (EN/HI)
  sends the whole catalogue as a product_list in three sections. A cart sent
  from the catalogue (`type: order`) is stored as "Cart: id ×qty", alerts the
  owner on Telegram, and the guide confirms without inventing totals.
- Verified on the live server with signed synthetic webhooks from the owner's
  number: product list sent; enquiry reply + card path exercised.
- Helpers: `waSendProduct`, `waSendProductList` in lib/whatsapp.ts;
  `conciergeReplyWithCard` in lib/concierge.ts.

### Store tab (2026-09-10) — the WhatsApp Store engine, first tenant = GoLuQ
- Cockpit → Sell → Store: product grid; add/edit from a phone (camera capture
  for photo, video upload), name, price, description, availability, show/hide.
  Image model buttons: "Clean photo" (studio shot of the exact item from the
  phone photo), "Catalogue card" (infographic with the real product as hero),
  free prompt. Owner chooses "Use this" or "Keep old". "Sync to WhatsApp"
  pushes create/update/remove to the Meta catalog; per-row sync errors shown.
  Import seeded the 18 existing items. `products.tenant` reserved for client
  stores. Endpoints: `/api/admin/products` (functions), image generation in
  `server/index.ts` (`/api/admin/products/generate`, writes to /media).
- Not yet: video in the Meta catalog (Meta shows images only) — the video is
  kept for product replies and broadcasts; per-tenant admin login for clients.

### Homepage story draft (2026-09-10) — live at /preview (noindex)
- The homepage rebuilt as a story: five chapters (coaching institute, FMCG
  distributor, CA firm, garment wholesaler, four-office claims firm), each one
  screen: "before" scene dissolving into "with GoLuQ", one line each, product
  name, one button "This is my problem" → opens the guide with that problem
  already said (`goluq:ask` event handled in AssistantChat). Then the two
  product cards (live prices), a reserved customer-stories section (video
  placeholder until Ashwin's arrives), the founder with the new headshot,
  footer. EN/HI captions under `story.*`.
- Art: Nano Banana Pro, 4:5, "after" scenes generated with the "before" as a
  reference image so each chapter is the same person (`scratchpad/story/
  scenes.py`); exported to `public/story/*.webp`.
- Verified with phone-size CDP screenshots (`scratchpad/shot2.cjs`, picks the
  page target, skips the splash via sessionStorage). Lesson: Tailwind
  `relative` beats `absolute` when both are on one element — a scene wrapper
  collapsed to zero height on phones until fixed.
- Owner reviews /preview; on approval it replaces `/` and the old flow moves
  under `/build`.
- 2026-09-10 (later): captions rewritten to the founder's brief — money and
  status ("the admission is yours, not the institute's next door", "money comes
  in while you sleep") and a sixth closing chapter, "Any owner. Any trade.":
  from closing the day alone to running it like a CEO, "for less than one
  salary a month", with the managed-plan price live in the visitor's currency.
  Opening: "Businesses like yours already run this way. Why not yours?"
- Regional plan (not built yet): same chapters everywhere; per-region
  differences live in three places already keyed by country — prices/currency
  (done), CTA channel (WhatsApp / WhatsApp+call / Telegram), and caption
  variants (`story.*` per region: IN, GULF, INTL). Scene art regionalised only
  if a market actually shows up in Visitors → Countries.
- 2026-09-10 (night): founder's brief applied — owners regenerated as late-20s
  to early-40s (garment trader now a young woman); captions sharpened to loss
  aversion ("tomorrow they join the institute that did"); words larger; voice
  pill always visible; "Send to a friend" on every chapter (native share,
  WhatsApp fallback) for spread; region wording via `?r=in|gulf|cis|intl`
  (lib/region.ts) — same pictures, different words and currency. Cloudflare
  caches images 4 h at the edge: scene URLs carry `?v=N`, bump on regeneration.
  Validation URLs: /preview?r=in, ?r=gulf, ?r=cis, ?r=intl.

### Story homepage LIVE (2026-09-10)
- `/` now renders the story (StoryHome); the old five-step demo lives at
  `/demo`; `/preview?r=…` stays for region validation (noindex only there).
- Telegram contact: cockpit → Settings → "Public Telegram channel or username"
  (`public_telegram`, stored as bare username, exposed as `telegram` in
  /api/config). The founder block shows "Message on Telegram" beside WhatsApp,
  Telegram first for the CIS region. Empty until the owner creates the public
  channel; the cockpit bot stays private.
- 2026-09-10 (late): polish pass from the founder's screenshots — no empty
  band above the hero; hero now carries a purpose line + "Book a 30-minute
  call" + WhatsApp; chapter labels moved out of the letter-spaced mono face
  (unreadable in Devanagari) into the body face on a pill over the art; voice
  pill in its own row on phones, bottom-left on desktop; long captions size
  down. Verified at 390 px and 1440 px with `shot2.cjs` (desktop mode added).

### International go-to-market (2026-09-11)
- Strategy, researched rate comparison, packages, channel ranking, pipeline
  maths, the founder's weekly tasks and my build list: `docs/GTM-INTERNATIONAL.md`.
- Same day: voice-off now stops narration immediately (generation token in
  lib/speak.ts); phone chapters are picture-above / words-below; catalogue
  cards and the Meta brand field read "GoLuQ.com Digital Consultancy".

### Brand, ads, reels (2026-09-11)
- Catalogue cards regenerated with the wordmark "GoLuQ.com" (".com" in navy)
  and the footer "GoLuQ.com Digital Consultancy"; live at /catalog. Meta
  catalog brand field = "GoLuQ.com Digital Consultancy".
- Profile picture (circle-safe) at public/brand/profile-1080.png and
  profile-640.png — for WhatsApp, Instagram, Facebook, LinkedIn.
- Four Instagram/Facebook creatives (4:5) with the founder's real photo as
  spokesperson, generated by Nano Banana Pro from the photo as reference
  (scratchpad catalog/ads.py): receptionist, custom software, WhatsApp Store,
  rent-vs-own. All end on "Book a 30-minute call".
- Reel pipeline (scratchpad reel/build.mjs): story scene before → after →
  end card, HTML caption overlays rendered by headless Edge, Gemini TTS
  voice-over (gemini-2.5-flash-preview-tts), ffmpeg assembly, 1080×1920,
  ~16 s. One per chapter per language is a script run.
- Veo 3.1 (fast/lite) is available on the project key; an 8 s image-to-video
  test worked but a 4:5 reference letterboxes in 9:16 and the animated
  characters wobble — usable for B-roll with a 9:16 reference and no text,
  not for the hero shot. Still-based reels look better and cost nothing.

### Assets, catalog cache, briefs (2026-09-11, later)
- All marketing masters live in `C:\Goluq.com\marketing\` (gitignored, 35 MB):
  catalog-cards/ (17 PNG), ads/ (4 PNG with the founder), reels/
  (coaching-en.mp4, veo-test), brand/ (profile pictures), story-scenes/
  (12 scenes + storyboard). Hosted copies: goluq.com/catalog/*.jpg,
  /brand/profile-*.png, /story/*.webp. Generation scripts stay in the session
  scratchpad (catalog/infographic.py, ads.py, compose.mjs; reel/build.mjs,
  tts.py, veo.py; story/scenes.py) — copy into scripts/ if they are needed
  beyond this session.
- Meta caches product images by URL: sync now stamps `?v=` and the Store's
  Sync accepts `force`. Force-synced all 18 → the WhatsApp store shows the
  GoLuQ.com cards.
- Cron on the VM: `15 * * * *` pre-call briefs (bookings 30–90 min ahead:
  form answer, prior chat, suggested opener), `30 2 * * 1` (08:00 IST Monday)
  weekly funnel report to Telegram. First weekly report sent 2026-09-11:
  327 visitors, 1 enquiry, 0 bookings.
- Facebook Page exists (id 61594072290908). For posting from the cockpit the
  system-user token needs pages_manage_posts, pages_read_engagement,
  instagram_basic, instagram_content_publish, and the Page + IG account
  assigned to the system user in Business Settings.

## 8. Direction (2026-09-12) — India first, then international high-ticket
Founder's call: build the vibe in the India circle first (WhatsApp, catalog,
reels, Facebook/Instagram, partners), THEN the international high-ticket push
(docs/GTM-INTERNATIONAL.md stays the plan for that phase). The next strategy
session covers: automated marketing, client-acquisition design, when to pivot,
which geographies show heavy demand — GoLuQ.com as an aggressive business
solution consultancy (scale, reach, demand creation, psychological marketing),
not only a builder.

### Catalogue coverage (2026-09-12)
- WhatsApp catalog now 28 items: 18 products/services + 10 scenario cards
  ("GoLuQ for …": coaching, clinics, CA & law, garments, distributors, real
  estate, restaurants, salons & gyms, schools, logistics). Cards at
  goluq.com/catalog/for_*.jpg; masters in marketing/catalog-cards/.
- Twelve chapter reels (6 chapters × EN/HI, 14–20 s, voice-over) hosted at
  goluq.com/media/reel-<chapter>-<en|hi>.mp4; masters in marketing/reels/.
- Publish tab live (cockpit → Sell → Publish): Facebook photo/link posts and
  Instagram via Graph API. Blocked only on the owner assigning the Page to the
  system user and regenerating the token with pages_manage_posts,
  pages_read_engagement, instagram_basic, instagram_content_publish; the
  Connect button names the missing step.
- Facebook Shop: same Meta catalog; owner enables it in Commerce Manager →
  Shops (screens only).

### Hindi catalogue (2026-09-12)
- All 28 cards (16 products, 10 scenarios, founder, thank-you) in Hindi at
  goluq.com/catalog/hi/<id>.jpg; PNG masters in marketing/catalog-cards/hi/.
  Composed in HTML (Noto Sans Devanagari) over generated icons and hero
  scenes, because the image model kept dropping matras from Devanagari; the
  words are now set by us, letter for letter. Engine: hicard.mjs (session
  scratchpad; icons and heroes on the VM under /tmp/cat/icons, /tmp/cat/heroes).
- Hindi reels already existed (reel-<chapter>-hi.mp4); each "Watch:" card in
  the Meta catalog now carries the Hindi link under the English one.
- Publish's picture picker lists every card twice: English and "· हिंदी".
- Not added as separate Meta catalog items — the catalog would double to 56
  and the WhatsApp guide already answers in Hindi with the English cards.
  Revisit if India-circle customers ask for the cards themselves in Hindi.

### Payments — founder call and cart checkout (2026-09-12)
Flow, built and verified with signed synthetic webhooks (no Razorpay keys yet):
- **Founder call in the WhatsApp cart** → guide replies with a "Pick a slot"
  button to the Google appointment page (his live free hours; Meet created by
  Google). The thread is marked `call_cart_at`.
- **Booking arrives via the calendar bridge** → if that phone/email put the
  call in a cart within 30 days (or Settings → Payments → "every booking"),
  a Razorpay Payment Link for the live Store price of `founder` goes out on
  WhatsApp (tappable button) and email: "pay now or after the meeting", valid
  until 30 minutes after the call's end.
- **30 min after the call, still unpaid** → cron `briefs?job=payments`
  (every 15 min) expires that link, marks the booking done, issues a fresh
  7-day link once. After that it is the owner's push.
- **Owner push**: cockpit → Sell → Payments: one tap at any call (supersedes
  the open link), or a free-form link (phone/email, amount, what for).
- **Any other cart** → total from the Store prices (never from the cart
  payload), link issued at once with "pay now to start, or talk first" and
  the slot button. Watch/thank-you rows are not for sale.
- **Paid** → Razorpay webhook (HMAC, `razorpay_webhook_secret`) marks the
  row, cancels sibling links, thanks the customer on WhatsApp, alerts
  Telegram. /thanks is the return page.
- Code: functions/lib/razorpay.ts (API + signature), functions/lib/payments.ts
  (issue/markPaid/callIntent), functions/api/razorpay/webhook.ts,
  functions/api/admin/payments.ts, src/components/admin/Payments.tsx;
  `payments` table; WhatsApp `cta_url` helper in lib/whatsapp.ts.
- Outside the 24-hour window WhatsApp needs the `payment_link` template
  (docs/whatsapp-templates.md); until approved the renewal reaches email and
  falls back to plain text on WhatsApp (which Meta may reject).
- Keys are write-only in Settings → Payments (key id shown, secret and
  webhook secret never read back). Razorpay account: owner's personal savings
  account as stated; a current account is not required for Payment Links.

### Homepage reels + a server crash fixed (2026-09-12, later)
- Each story chapter now plays its own reel (goluq.com/media/reel-<chapter>-<en|hi>.mp4)
  instead of the two stills: autoplays muted when the chapter is on screen,
  pauses and rewinds when it leaves, "Tap for sound" pill on the film turns
  the recorded voice-over on (off by default; a phone will not start audio on
  its own). Browser speech synthesis is gone from the homepage — it stalled
  and read the wrong card. Language switch swaps the reel.
- INCIDENT: the first deploy took the site down for every visitor. /media
  wrapped a Node read stream in a Response; when a browser abandoned a video
  mid-download undici threw "ReadableStream is already closed" as an uncaught
  exception and the process exited (systemd restarted it, 3–30 s of 502 each
  time). Fixed by serving /media from buffered slices (≤ 8 MB per request,
  Range/206/416 honoured) and logging uncaught errors instead of dying.
  Verified: aborted parallel downloads, NRestarts=0.
- docs/OWNER-TASKS.md: the owner's to-do written step by step for a browser
  agent (Razorpay, calendar bridge, templates, Pages use case, Instagram,
  LinkedIn, Telegram channel, testimonial).

### Homepage made light, catalog order fixed, video cards retired (2026-09-12, later)
- Homepage chapters now play a SILENT 480-px preview (≈300 KB each,
  goluq.com/media/preview-<chapter>-<en|hi>.mp4) fetched only when the chapter
  is within one screen; "Watch with sound" opens the full reel in a new tab.
  Owner tested the autoplay-with-audio version in incognito: slow, voice
  missing or doubled between two half-visible chapters. Decision: no audio on
  the page, ever; the full reels are for Instagram/Facebook/LinkedIn/YouTube
  and for the tap. (GIFs were considered and rejected: a 15 s GIF is 5–10 MB,
  ten times the mp4 preview.)
- WhatsApp store shows a catalog oldest-first (Commerce Manager shows the same
  list newest-first, which fooled the first reorder). Reorder now recreates
  items in sort order; verified via Graph: founder created first, thank-you
  last. 30 items live.
- The six "Watch:" video cards are retired (live=0, removed from Meta): the
  WhatsApp catalog cannot hold video, and a play-button picture that does not
  play is a broken promise. Reels are linked from posts instead.
- Owner tasks updated: Razorpay = reuse Sarathi-AI's key pair (one live pair
  per account; regenerating would break Sarathi-AI) + a second webhook; Dodo
  Payments for international; Google OAuth client for the client sign-in.

### Self-service intake — goluq.com/start (2026-09-12, later)
Decision (owner): the multi-tenant store engine is on hold; clients are
onboarded through a generic intake and mapped as they arrive. Built:
- **/start**: sign in with an email code (live), a WhatsApp code (once the
  `login_otp` authentication template is approved) or Google (once the OAuth
  client is pasted in Settings → Client sign-in). No passwords, no SMS, works
  in any country. Same customer identity as the portal.
- Tiles: business type (14) → departments that hurt (12) → "tell us" by
  hold-to-talk (browser recording, transcribed server-side by Gemini, Hindi
  stays Devanagari) or typing → up to four follow-up questions from the guide
  → a written plan (BRD: title, summary, goals, users, day-to-day scenarios,
  integrations, timeline, open questions) the client edits and confirms →
  contact details → sent.
- On submit: `briefs` row, a lead row (status engaged, source = utm or
  referrer), Telegram alert with the summary and WhatsApp/cockpit buttons,
  owner email with the full plan, client email with the plan and the booking
  link; the done screen offers the calendar and WhatsApp.
- Cockpit → Inbox → **Briefs**: each plan, status (new/contacted/quoted/
  won/lost), the raw words and follow-ups, a note field.
- Homepage hero leads with "Tell us what slows you down" → /start.
- No price anywhere on /start: the copy says a fixed quote comes on the call,
  "priced for a small business, not an enterprise".
- Code: functions/api/auth/otp.ts, auth/google.ts, api/intake.ts,
  api/admin/briefs.ts, lib/gemini.ts (geminiJson, geminiTranscribe),
  lib/whatsapp.ts (waSendAuthTemplate), src/pages/Start.tsx,
  src/components/admin/Briefs.tsx; tables login_codes, briefs; customers
  gained google_sub, lang.

### Decisions recorded (2026-09-12, later)
- Department cards ("all-in-one", operations, CRM, billing, inventory, HR,
  training, vendors, support, field, owner dashboard): no fixed price; they
  are custom builds quoted after the BRD. Catalog needs a price, so each card
  will carry the scope-call price with "fixed quote after the call" in the
  description. Cards to be composed next (EN + HI, same engine).
- Payments: Razorpay for India. Razorpay international needs the feature
  enabled on a business account with documents, settles in INR at ~3%+GST and
  refuses some categories; on a personal savings account it is unlikely to be
  enabled. Dodo Payments (merchant of record) for customers abroad — owner to
  share the API key and webhook secret (docs/OWNER-TASKS.md 1b).
- Partner programme: creatives never state the commission rate (it is set in
  the cockpit, currently 20%). The pitch is "become a GoLuQ.com partner —
  open your GoLuQ partner office, earn a lump sum on every order and
  recurring revenue on what stays live", pointing to goluq.com/partner.

### Dodo Payments live for customers abroad (2026-09-12, later)
- issuePaymentLink() now picks the rail by the customer's country (dialling
  code on WhatsApp, form country in the cockpit): India → Razorpay in ₹;
  anywhere else → Dodo Payments in USD (same conversion the site shows),
  Dodo's adaptive currency displays the local amount. One pay-what-you-want
  product carries every charge; created on first use under the GoLuQ brand.
- /api/dodo/webhook (Standard-Webhooks signature) marks paid/failed; the
  ledger shows provider and currency. Owner: webhook secret + brand id
  (docs/OWNER-TASKS.md 1b), and rotate the key that was pasted in chat.
- Razorpay: goluq.com added to the existing account (with sarathi-ai.com
  and nidaanpartner.com), under review 24–48 h; keys are universal per
  account, so the existing pair is reused — never regenerated.

### Competitor read — ZapUp (screens in Business plan/New folder, 2026-09-12)
What they do well, and what we take:
- **Solutions by role / business type / industry** in one menu. We take it:
  a /solutions page and top-nav entry with the same three columns, each tile
  landing on the matching scenario card + /start with the business pre-picked.
- **Price anchoring** ("not $2,499 — it's just ₹2,499"). We have a truthful
  version: our own international price beside the India price (WhatsApp
  Office: $1,450 abroad, ₹50,000 in India). Never a made-up strike-through.
- **"Meta Business Partner · Trusted by Meta" badge**. We are NOT in Meta's
  partner programme and must not claim it. What is true and can be shown:
  "Runs on the official WhatsApp Business Platform by Meta (the company
  behind WhatsApp, Facebook and Instagram)". Badge design: shield + the
  words "Official WhatsApp Business Platform · Meta" with "WhatsApp ·
  Facebook · Instagram" under it, because tier-2/3 buyers know those names,
  not Meta. Goes on every Meta-related card (Office, Store, API, WhatsApp
  automations, all scenario cards) EN + HI, and as an end-frame/corner
  overlay on the reels. Not on toll-free/SMS/voice cards — those are not
  Meta products. Apply for Meta's Tech Provider / Business Partner status
  later; only then does the official badge appear.
- **"3-day free trial, no credit card"** — a SaaS line; ours is "₹999 scope
  call, credited to your build", already on the founder card.
- **Live social proof widgets** ("148 DMs handled while you slept"). Ours
  must come from real customer systems (the monthly ROI report); nothing
  invented. Ashwin's numbers once he agrees.
- **Foldable-phone joke** — topical creative; we do the same kind of hook
  with Indian moments (Diwali stock, exam-season admissions, GST deadline).

## 9. TO-DO (current)
### Owner
- [ ] Razorpay: Settings → API keys → paste key id + secret in cockpit →
      Settings → Payments. Then Razorpay → Webhooks → add
      https://goluq.com/api/razorpay/webhook (payment_link.paid, .expired,
      .cancelled) with a secret; paste the same secret in the cockpit.
- [ ] Submit `payment_link`, `login_otp` (authentication) and the two booking
      templates (docs/OWNER-TASKS.md §3); put the names in Settings once approved.
- [ ] Google OAuth client → Settings → Client sign-in (docs/OWNER-TASKS.md §1c).
- [ ] Dodo Payments API key + webhook secret (docs/OWNER-TASKS.md §1b).
- [ ] developers.facebook.com → app → Use cases → add "Pages"; regenerate the
      token with pages_manage_posts, pages_read_engagement, instagram_basic,
      instagram_content_publish; paste in Settings → WhatsApp Business API;
      press Connect in Publish.
- [ ] Create the Instagram professional account, link it to the Page.
- [ ] Create the LinkedIn company page.
- [ ] Install the calendar bridge (docs/booking-bridge/Code.gs) — the payment
      flow depends on it.
- [ ] Ashwin testimonial video + written consent.
- [ ] Public Telegram channel name → Settings.
### Build (mine, in order)
- [ ] /solutions page + nav: by role, business type, industry → scenario card + /start.
- [ ] "Official WhatsApp Business Platform · Meta" badge on Meta-related
      cards (EN/HI) and reel end-frames; price-anchor variants (abroad vs India).
- [ ] Department cards (11) EN + HI, composed with the card engine, priced at
      the scope call, "fixed quote after the call"; add to Store and catalog.
- [ ] Partner (affiliate) campaign: cards + 15 s reels EN/HI — "start your
      GoLuQ.com partner office", lump sum + recurring, no rate shown, CTA to
      goluq.com/partner. Refresh /partner copy to match the pitch.
- [ ] Dodo Payments adapter for non-INR markets once the key arrives; the
      cart and cockpit choose Razorpay or Dodo by the customer's market.
- [ ] Pre-launch walk-through checklist: ad → /start → plan → call → payment
      → WhatsApp, EN/HI, three phones; fix everything found before spend.
- [ ] Post the first month of content through Publish once connected: one
      scenario card + one reel a day, EN/HI alternating, tracked links.
- [ ] Strategy session deliverable (section 8): demand map by geography from
      Visitors data + market signals, pivot rules, acquisition playbooks.
- [ ] Multi-tenant Store login for the first client store.
- [ ] Reminders cron once templates are approved.
- [ ] International pricing page, Nidaan case study, vertical pages — when the
      international phase starts.

### INCIDENT 2026-09-12 — WhatsApp token dead
- The stored Meta token belonged to system user "sarathi wa". While assigning
  the Facebook Page to "goluq-api", that user's assets were "cleaned up" and
  the token stopped resolving (GET /me → {}; WABA, phone number and catalog all
  "does not exist or missing permissions"). Effect: the guide cannot send
  replies, catalog sync fails, product cards/lists cannot be sent. Inbound
  webhooks still arrive; Telegram alerts of inbound still work.
- Fix (owner): in Business Settings → System users → goluq-api → Add assets:
  WhatsApp account "GoLuQ - Digital Consultancy" (full control), Catalog
  "GoLuQ" (Manage), Page GoLuQ.com (already assigned); Generate token with
  whatsapp_business_management, whatsapp_business_messaging,
  catalog_management, business_management, pages_manage_posts,
  pages_read_engagement, instagram_basic, instagram_content_publish; paste in
  cockpit → Settings → WhatsApp Business API → Save; press Check connection,
  then Publish → Connect, then Store → Sync.
- Prepared while waiting: prices halved for WhatsApp products (Office/Store
  ₹50,000 + ₹5,000/mo, $1,450 + $245; WhatsApp API ₹3,999; WhatsApp
  automations ₹5,000; scenario cards ₹50,000). Store rows for founder (first),
  six "Watch:" reel cards (link to the hosted reels), thank-you (last), with
  sort_order; a `reorder` action recreates Meta items in reverse so the founder
  shows first. Runs once the token is back.
- 2026-09-12 (later): token restored on system user goluq-api (never expires;
  scopes: whatsapp_business_management, whatsapp_business_messaging,
  catalog_management, business_management, pages_read_engagement). WhatsApp,
  catalog and Page verified. Facebook POSTING still blocked: the GoLuQ.com app
  has no Pages use case, so pages_manage_posts / instagram_* cannot be granted
  — owner adds the "Pages" (Content) use case at developers.facebook.com → app
  → Use cases, then regenerates the token with those scopes.
- 2026-09-11: Facebook Shops is not available to India-based businesses
  (Commerce Manager: "Shops isn't available in your country"). Dropped from
  the to-do; the WhatsApp catalog is the storefront. Re-check only if Meta
  expands availability; no setup change needed then.
