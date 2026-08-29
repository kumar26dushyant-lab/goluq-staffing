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
| **Email** | live outbound (Resend) | Alerts to the owner. Inbound routing is parked. |
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

## 4. What is built and live

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
| WhatsApp guide (Meta Cloud API) | `/api/wa/meta` | live, awaiting live test |

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

### Webhook diagnosis, 2026-08-30
Everything on our side and in the app config is correct:
- Meta verified the callback URL (200 to their `facebookplatform` GET).
- App subscription is live: `whatsapp_business_account` →
  `https://goluq.com/api/wa/meta`, active, field `messages`.
- Number: +91 83495 04400, CLOUD_API, code VERIFIED, quality GREEN.
- Token is valid, never expires, and belongs to the **GoLuQ.com app**
  (839673715804540) — the System User is merely *named* "sarathi wa", so
  nothing needs unplugging from Sarathi.

And yet **Meta has never POSTed a single message**: nginx shows zero requests
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

### Blocking
- [ ] **Switch the Meta app from Development to Live**, and confirm the WhatsApp
      account is subscribed to the app. Everything else is verified correct;
      this is the only thing left that explains zero inbound. See section 6.
- [ ] Resubmit the display name as **GoLuQ** or **GoLuQ.com** (currently
      DECLINED). Does not block messaging.

### Next
- [ ] Confirm real comms costs, then correct the prices in the cockpit.
- [ ] Create and submit WhatsApp message templates — nothing outbound can reach
      anyone outside the 24-hour window until these are approved.
- [ ] "Client login" entry point so customers can find `/portal` without a link.
- [ ] Decide the call channel (section 3) — still open.

### Later
- [ ] Exotel provisioning, once a customer has paid.
- [ ] Tech Provider application, if reselling WhatsApp becomes real.
- [ ] Cloudflare inbound email routing (parked).

### Done
- [x] Public WhatsApp number set and verified live on the site
- [x] Cockpit shows inbound webhook health, not just "credentials valid"
- [x] Comms-first homepage hero, real stats, live-price phone transcript
- [x] Per-market pricing and currency, page and guide in step (section 3a)
- [x] Communication catalogue at `/services`, sellable by the guide (Phase A)
- [x] WhatsApp guide on the verified WABA (Phase B)
- [x] Customer portal with SDLC stages (Phase C)
- [x] Homepage crash fix — `CapabilityTabs` rendered an undefined icon for the
      new comms ids and took the whole page down
