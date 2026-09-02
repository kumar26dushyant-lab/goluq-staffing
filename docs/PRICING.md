# Pricing, cost and margin

Answering the question directly: **there is no cost model behind the current
prices.** Every figure on the site is a market-positioned number — chosen to sit
credibly below what competitors charge — not a cost-plus calculation. That is a
reasonable way to *launch*, and a dangerous way to *operate*, because it cannot
tell you which sale is worth taking.

This document is the model. The build-side numbers are grounded (your time is
the only real input). The comms-side costs are **marked as estimates until the
first real invoice**, and must not be treated as fact.

Last updated: 2026-09-03

---

## 1. The two halves behave completely differently

| | Software builds | Communication services |
|---|---|---|
| Main cost | Your hours | Wholesale fees to Exotel / Meta / operator |
| Marginal cost of one more sale | High — you must build it | Low — provisioning is mostly paperwork |
| Margin shape | Whatever your rate implies | Thin on setup, real on usage and on what we build after |
| Risk | Scope creep | Wholesale price you have not confirmed |

Treating them as one price list, which the site currently does, hides this.

---

## 2. Software builds — the only real input is your time

There is no material cost. Hosting is already paid for. So margin is entirely a
question of **hours at an implied rate.**

At the current prices, the implied hourly rate is:

| Product | Price | Realistic hours | Implied rate/hr |
|---|---|---|---|
| Automation | ₹3,000 | 4–8 | ₹375–750 |
| WhatsApp automation | ₹3,000 | 4–8 | ₹375–750 |
| Website | ₹10,000 | 20–35 | ₹285–500 |
| Mobile / desktop app | ₹50,000 | 80–140 | ₹355–625 |
| Offline software | ₹50,000 | 80–140 | ₹355–625 |
| Multi-branch platform | ₹1,50,000 | 250–400 | ₹375–600 |
| Digital Employee | ₹799/mo | 30–60 to build | see below |

**What this says.** The pricing is internally consistent — roughly ₹300–700 an
hour across the board, which is deliberate and defensible for a one-person
practice with no overhead. It is also the ceiling on what GoLuQ can earn while
every rupee depends on your hours.

**Where it breaks: the Digital Employee.** ₹799/month against 30–60 hours of
build means the first customer pays back in roughly **4 to 6 years**. It is only
viable if the same build is resold — a receptionist built for one clinic sold to
twenty clinics. Priced as bespoke work, it loses money. This is the single most
important pricing decision on the list and it has not been made.

**Hours are estimates.** Track actual hours per project in the portal and this
table stops being guesswork within three or four jobs.

---

## 3. Communication services — ⚠️ costs are ESTIMATES

Market rates in India, from public pricing. **None of these is confirmed against
an invoice you have received.** Every margin below is provisional.

| Service | We charge | Est. wholesale | Est. gross | Confidence |
|---|---|---|---|---|
| Toll-free 1800 | ₹9,999 setup | ₹3,000–5,000 setup + ₹1,500–2,500/yr | ₹5,000–7,000 | low |
| Virtual number + IVR | ₹4,999 setup | ₹1,000–2,000 | ₹3,000–4,000 | low |
| WhatsApp Business API | ₹7,999 setup | ₹0 (Meta charges per conversation) | ~₹7,999 | **high** |
| Voice campaign | ₹9,999 setup | ₹2,000–4,000 | ₹6,000–8,000 | low |
| Transactional SMS | ₹5,999 setup | ₹500–1,500 + DLT paid by customer | ₹4,500–5,500 | medium |
| Promotional SMS | ₹5,999 setup | ₹500–1,500 | ₹4,500–5,500 | medium |
| Missed call | ₹3,999 setup | ₹500–1,500 | ₹2,500–3,500 | low |

**WhatsApp API is the outlier and the one to lead with.** Meta charges nothing
for the account; billing is per conversation, passed to the customer at cost. The
setup fee is almost entirely margin, and the work is real: verification,
templates, webhook, and the software behind it. That is the highest-margin, most
defensible product in the catalogue — and the one GoLuQ is now demonstrably
expert in, having done it for itself.

**Usage is passed through at cost, never marked up.** It is metered by the
operator and by Meta, and a customer who discovers a hidden markup stops trusting
everything else. Stated on /services and in the guide.

### Competitor anchor
Fortius Infocom lists a toll-free number at **₹18,000** (from ₹21,600). GoLuQ at
₹9,999 is 45% under — cheap enough to win, expensive enough to be believed.

---

## 4. What the model says to do

1. **The wedge is priced correctly.** Comms setup roughly doubles cost. That is
   thin for a services business and exactly right for an acquisition product:
   its job is the second sale, not its own margin.
2. **The second sale is where the business is.** A ₹9,999 toll-free customer who
   buys a ₹50,000 app is worth six comms customers. Track conversion to software
   within 90 days — already the headline metric in MASTER.md.
3. **Decide the Digital Employee.** Either productise it (build once, sell many,
   ₹799 works) or reprice it as bespoke (₹15,000–25,000 setup + ₹799/mo). As it
   stands the price implies the first and the delivery implies the second.
4. **International pricing already fixes the rate problem abroad.** At the 4×
   band a US website is ~$449 — an implied rate of roughly $13–22/hr. Still far
   under a US agency, so there is room to raise the multiplier once there is one
   overseas reference customer.
5. **Confirm the comms costs before promoting prices.** One Exotel invoice turns
   this whole section from estimates into a model.

---

## 5. How to keep this honest

- Record **actual hours** per project. The portal already stores projects; hours
  is the missing field.
- Record **what was actually paid** to each supplier per service sold.
- Then margin per product is a query, not an opinion.

Until then, treat every number in section 3 as a working assumption — including
the ones already published on the site.
