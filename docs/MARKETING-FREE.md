# Free-first marketing, run from the cockpit, Telegram and WhatsApp (2026-09-15)

Priority markets (owner): UAE, Australia, New Zealand and other untapped
markets first; US stays in view but is saturated. India circle continues.
Paid comes later; the machine below costs nothing but time.

## Who we reach, per market
- **Business owners** with 10–100 staff: distributors, clinics, coaching,
  CA/law, real estate, logistics, salons, small manufacturers (the scenario
  cards, in their currency).
- **Second-income partners**: unemployed or between-jobs young professionals,
  well-connected business owners, students — the partner programme ("open
  your GoLuQ partner office"), recruited in each market.
- **Micro-influencers (500+ followers)** in those cities: offered the partner
  deal (share on orders, plus the monthly share on managed customers) rather
  than cash — no upfront cost, tracked links, paid on results.

## Language and money, per country (what already exists)
- Prices convert on the server from the visitor's country (Cloudflare edge
  header): INR in India, AED, SAR, USD, GBP, EUR, AUD, CAD, SGD elsewhere;
  South Asia has its own band. Incognito changes nothing — no cookie is
  needed, the country comes from the network.
- Language: the site ships English and Hindi. Hindi is the default in India,
  English everywhere else. Arabic/Russian/etc. are not site languages yet
  (the guide, WhatsApp and Telegram already answer in them). Adding a site
  language = one more JSON file per language + a default rule per country.
- **Validate from India**: open goluq.com/?c=AE (or AU, NZ, GB, US, SA) —
  the site then behaves as if you were in that country (prices, region
  wording, default language) until you switch back with ?c=IN. The cockpit
  Visitors screen shows real visitors' countries.

## The free channels and the cockpit mechanics
1. **Social queue** (Publish): one post a day already; add a per-market
   queue — same cards, captions in the market's tone, link with
   `?c=XX&utm_source=…` so the landing shows their currency. Every post is
   previewed on Telegram with Post/Skip.
2. **Partner recruitment**: partner cards + reel per market; the kit is
   automatic on registration; a weekly Telegram digest "partners registered,
   leads with ref codes, orders won".
3. **Influencer outreach**: a list in the cockpit (name, city, followers,
   status, partner code once they join) with a ready DM; they become
   partners, so tracking and payout are the same machine.
4. **WhatsApp broadcasts** only to opted-in lists per market, one per week
   at most, 9–21 local time, with the STOP button — the number-protection
   rules apply everywhere.
5. **Telegram QR + bot** on every creative for markets where WhatsApp is not
   the official app.
6. **LinkedIn** (owner, manual): the 30-day plan, with market-specific
   posts in weeks 2–4 (Dubai, Sydney, Auckland).
7. **Communities and directories** (free): Google Business Profile for
   Indore, local Facebook groups per city, Reddit/Quora answers with the
   scenario reel, Product Hunt-style launch for the WhatsApp Store — each a
   card in the cockpit checklist with a link and a status.

## What to build for this (in order)
1. `?c=XX` country override on the site + cockpit "View as" links. (done)
2. Per-market post queues in Publish (market, language, link stamped with
   country + utm); Monday brief reports enquiries by door and by country.
3. Influencer / outreach list in the cockpit with statuses and a DM template;
   registering as partner links the row.
4. Partner reel EN/HI; UAE/AU/NZ-toned captions for the top ten cards.
5. Broadcast lists per market in Campaigns with opt-in source recorded.
