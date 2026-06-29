# GoLuQ — "Talking Staffing Application" — Master Build Spec

> **For: Claude Code (VS Code) · Target host: Cloudflare Pages + Pages Functions + D1**
> Read this entire file before writing code. Build in the milestone order (§14). Do not skip the Data Contracts (§5), Content Rules (§6), or the Affiliate module (§10A) — they are the spine.

### ▶ How to start in VS Code (Claude Code)
1. Create an empty folder, open it in VS Code, drop this file in as `BUILD_SPEC.md`.
2. Open Claude Code and start with: *"Read BUILD_SPEC.md fully. Confirm your build plan and the milestone order from §14 before writing any code, then start at milestone 1."*
3. Build **milestone by milestone** (§14) — review each before continuing; don't let it generate everything at once.
4. Before publishing prices, set the real numbers in `src/content/affiliateConfig.ts` (`PLANS`) to match the pricing workbook, and confirm the fair-use caps (§16).
5. Then follow §18 to deploy to Cloudflare and attach `goluq.com`.

**Single source of truth for money:** the pricing spec table (§16) ↔ `GoLuQ_Pricing_Model.xlsx` ↔ `affiliateConfig.ts`. If one changes, change all three.

---

## 0. Mission (one paragraph)

Build an ultra-premium, single-page **interactive "talking staffing" web app** for **GoLuQ.com** that walks a non-technical Indian business owner through a guided, 5-step state machine: a talking assistant greets them → they pick a *role* and an *industry* → they hit **"Go Luq"** → they watch a cinematic, fast-ticking live simulation of a "Digital Employee" resolving a real-world operational mess for *their* industry → they land on an ROI scorecard + lead-capture form with cross-sell options. The whole thing is bilingual (English / हिन्दी), mobile-first, and visually distinctive (layered glassmorphism, particle depth, orchestrated motion). It deploys as a static SPA on Cloudflare Pages; the lead form posts to a Cloudflare Pages Function backed by D1. A second route, **`/partner`**, runs the *same* talking bot as a digital salesperson for an **affiliate/partner program** (35% recurring), with a live earnings calculator, bot-guided registration, and a token-gated earnings dashboard — making the page itself a working demo of what affiliates would sell.

---

## 1. Tech stack (use exactly this — it matches the rest of the GoLuQ suite)

- **Vite** + **React 18** + **TypeScript** (strict mode on)
- **Tailwind CSS** (v3) for all styling
- **Framer Motion** for orchestration, transitions, and the simulation cascade
- **i18next** + **react-i18next** for EN/HI, with `i18next-browser-languagedetector` and `localStorage` persistence
- **lucide-react** for icons
- **Web Speech API** (`speechSynthesis`) for the talking assistant (no paid TTS in v1)
- **react-router-dom** (v6) — multi-route now needed: `/` (staffing app), `/partner` (affiliate landing + bot), `/partner/dashboard` (token dashboard)
- **Cloudflare Pages** (static host) + **Pages Functions** (`/functions`) + **D1** (leads + affiliate data)

No other runtime dependencies unless strictly necessary. Keep the bundle lean — this audience is on mid-range Android over patchy networks.

### Scaffold
```bash
npm create vite@latest goluq-staffing -- --template react-ts
cd goluq-staffing
npm i framer-motion i18next react-i18next i18next-browser-languagedetector lucide-react react-router-dom
npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## 2. Hard constraints (non-negotiable — treat as build-time lints)

1. **Branding split, everywhere:** Render the wordmark and every heading occurrence of the brand as **`GO`** in vivid white and **`LuQ`** in glowing cyan/teal. Create a single `<BrandMark>` component and never hardcode the brand as plain text anywhere else.
2. **Absolute jargon ban (client-facing UI):** Never display the words *AI, LLM, ML, agentic, neural, model, GPT, prompt, algorithm* in any user-visible string (EN or HI). Allowed vocabulary: **Digital Employee, Automated Worker, Digital Workforce, System, Digital Staffing Assistant.** This applies to copy, alt text, aria-labels, and the simulation logs. Add a dev-only console check that scans rendered i18n strings for banned words and warns.
3. **Mobile + tablet responsive:** Design at 360–414px first, then ensure clean layouts at tablet (`md` 768px / `lg` 1024px) and desktop. Role/industry grids reflow 1-col (mobile) → 2-col (tablet) → 3-col (desktop). No horizontal scroll, ever. Tap targets ≥ 44px. Test portrait *and* landscape tablet.
4. **Light & dark theme:** Ship both, with a persistent **theme toggle**. Default follows `prefers-color-scheme`, user choice persists to `localStorage` (`goluq_theme`). All colors flow through CSS variables / theme-aware tokens — never hardcode a hex in a component. Glassmorphism must be re-tuned for light mode (see §3) so it still reads as frosted glass, not muddy.
5. **Respect `prefers-reduced-motion`:** When set, disable particle motion, parallax, and the heavy entrance animations; keep the simulation readable (steps appear instantly or with a tiny fade, no shake/blur).
6. **No false authority claims.** Trust badges must use defensible language (see §9). Do **not** claim government certification, "approved," or specific compliance standards the business does not hold.
7. **Performance budget:** First load JS ≤ ~200KB gzipped; Lighthouse mobile Performance ≥ 90, Accessibility ≥ 95. Lazy-load the simulation step's content.
8. **Bilingual parity:** Every user-visible string exists in both `en` and `hi` resource files. No hardcoded strings in components.

---

## 3. Design system

### Theming (light + dark) — token-driven
Drive **all** color through CSS variables defined on `:root` (dark) and `[data-theme="light"]`, mapped into Tailwind via `theme.extend.colors` using `rgb(var(--…))`. A `<ThemeToggle>` flips `data-theme` on `<html>` and persists to `localStorage['goluq_theme']`; initial value follows `prefers-color-scheme`. Never hardcode hex in components.
- **Dark (default):** base `ink → abyss`, glass = translucent dark (`bg-slate-900/40 backdrop-blur-xl border-white/10`), teal/indigo glows pop.
- **Light:** base a soft cool off-white (`#F4F7FB → #E9EEF6`), glass = `bg-white/60 backdrop-blur-xl border-slate-900/10` with a subtle inner highlight; reduce glow opacity ~40% and darken text so it stays legible. "GO" becomes deep ink (`#0B1020`), "LuQ" stays teal (slightly deepened `#0E9AAE` for contrast on light). Particles/auroras lighten and lower opacity. Verify WCAG AA contrast in both themes.

### Brand tokens (Tailwind `theme.extend`)
```js
colors: {
  ink:    '#05070D',   // near-black base
  abyss:  '#0A0F1E',   // deep azure-black panel base
  indigo: { glow: '#4F46E5', deep: '#1E1B4B' },
  teal:   { glow: '#22D3EE', neon: '#2DD4BF' }, // "LuQ" cyan
  white:  '#FFFFFF',   // "GO"
},
boxShadow: {
  glass: '0 8px 32px rgba(0,0,0,0.45)',
  neon:  '0 0 24px rgba(34,211,238,0.45)',
},
```

### Glassmorphism utility (define once, reuse)
```
.glass = bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-glass rounded-2xl
.glass-bright = bg-white/[0.06] backdrop-blur-2xl border border-cyan-300/20 shadow-neon rounded-2xl
```

### Depth & "5D" look — concretely
- **Background:** `ink → abyss` radial/linear gradient + a lightweight **canvas particle field** (≤ 60 particles, drifting, paused on reduced-motion and when tab is hidden). Add 2–3 large, very-blurred indigo/teal "aurora" blobs behind glass for depth.
- **Layering:** Foreground glass cards float above mid-layer glow blobs above the particle field. Use `transform: translateZ`/perspective and Framer Motion parallax on pointer move (desktop only, subtle, ±8px max).
- **Borders:** crisp 1px luminous edges; on hover, animate a faint teal sweep along the border.
- **Motion language:** ease `[0.22, 1, 0.36, 1]`, durations 0.4–0.7s for screen transitions, springy but not bouncy. Stagger children by ~60ms.

### Typography
- Display/headings: a strong geometric sans (e.g. **Space Grotesk** or **Sora**), tight tracking.
- Body: **Inter**. Hindi: **Noto Sans Devanagari** (load the Devanagari subset; ensure the `hi` locale uses it). Verify Hindi renders crisply at small sizes.

---

## 4. State machine (the heart of the UX)

Single source of truth, e.g. a `useReducer` or a small `useAppState` hook. **One** mounted app, screens swap via Framer Motion `AnimatePresence` (`mode="wait"`).

```ts
type Step = 'greeting' | 'industry' | 'launch' | 'simulation' | 'booking';

type RoleId = 'voice' | 'support' | 'sales' | 'reception' | 'workforce';
type IndustryId = 'clinic' | 'diagnostic' | 'coaching' | 'ca' | 'travel';

interface AppState {
  step: Step;
  lang: 'en' | 'hi';
  role?: RoleId;
  industry?: IndustryId;
  simComplete: boolean;
}
```

Transitions:
- `greeting` → pick role → `industry`
- `industry` → pick industry → `launch` (the "Go Luq" button becomes active/visible)
- `launch` → press **Go Luq** → `simulation`
- `simulation` → on cascade complete → auto-advance (after a 1.2s "Task Completed" beat) → `booking`
- A persistent **back** affordance and a **language toggle** are available on every step. Language change must re-localize live, including any in-flight simulation labels.

Persist `lang` to `localStorage`. Do not persist role/industry (fresh each visit).

---

## 5. Data contracts (define these types; everything keys off them)

```ts
interface Role {
  id: RoleId;
  icon: LucideIcon;        // e.g. Phone, MessageSquare, TrendingUp, Building2, Network
  // labels/blurbs come from i18n: t(`roles.${id}.label`), t(`roles.${id}.blurb`)
}

interface Industry {
  id: IndustryId;
  icon: LucideIcon;        // e.g. Stethoscope/Hospital, FlaskConical, BookOpen, Calculator
  // labels from i18n: t(`industries.${id}.label`)
}

type LogTag =
  | 'BOOT' | 'SCAN' | 'OUTREACH' | 'INBOUND' | 'MATCH'
  | 'RECONCILE' | 'CHECK' | 'DRAFT' | 'NOTIFY' | 'SUCCESS';

interface SimLog {
  tag: LogTag;             // shown as a colored chip
  // text is localized: scenario.steps[i].en / .hi
}

interface Scenario {
  roleId: RoleId;
  industryId: IndustryId;
  bottleneck: { en: string; hi: string };   // the red "Real-Life Chaos" banner
  steps: Array<{ tag: LogTag; en: string; hi: string }>; // 24–28 steps
  outcome: { en: string; hi: string };       // final SUCCESS line, quantified
  roi: {                                      // for the scorecard on the booking screen
    humanOutput: { en: string; hi: string };
    digitalOutput: { en: string; hi: string };
    costSaved: string;                        // e.g. "70–80%"
  };
}
```

Scenarios live in `src/content/scenarios.ts` as a lookup: `scenarios[roleId][industryId]`. The **workforce** role reuses a coordinated multi-worker variant per industry (see content rules).

---

## 6. Content rules — READ CAREFULLY (this is where builds get lazy; don't)

You must produce **all 25 combinations** (5 roles × 5 industries), each fully bilingual. Two are fully written below as the **quality bar**, plus a mandatory signature scenario for the travel industry (below). Generate the rest to match — do not output thin, generic, or repetitive steps.

**Each scenario must:**
- Open with a **specific, visceral, industry-true bottleneck** (a named pain a real owner recognizes — GST deadline night, no-show patients, sample reports piling up, fee-defaulter follow-ups, etc.).
- Contain **24–28 micro-log steps**, each ≤ ~9 words, present-tense, action-first, with a `LogTag`.
- Use **plausible Indian-context specifics** (₹, WhatsApp, UPI, GSTR-1, OPD, NABL, batch numbers, fee installments) — but **never** banned jargon.
- End with a **quantified SUCCESS outcome** (numbers, ₹ saved, errors = 0, hours reclaimed).
- Read naturally in Hindi (not a stiff word-for-word translation) — use the register a real Indore SMB owner speaks.
- Pacing: the cascade renders all steps in **~5–7 seconds total** (≈ 4–5 steps/sec), accelerating slightly, with green checkmarks landing as each completes and a soft tick sound (optional, muted by default).

### Worked example A — `support` × `ca`
```ts
bottleneck: {
  en: "🔴 GST deadline night. 45 clients haven't sent bank statements. Staff is drowning, phones won't stop, typos creeping in.",
  hi: "🔴 GST डेडलाइन की रात। 45 क्लाइंट्स ने बैंक स्टेटमेंट नहीं भेजे। स्टाफ थक चुका है, फ़ोन रुक नहीं रहे, गलतियाँ बढ़ रही हैं।"
},
steps: [
  { tag:'BOOT',      en:"Digital Tax Associate signing in securely…", hi:"डिजिटल टैक्स असोसिएट सुरक्षित रूप से लॉगिन हो रहा है…" },
  { tag:'SCAN',      en:"Reviewing 120 client files for gaps…",       hi:"120 क्लाइंट फ़ाइलों में कमियाँ जाँच रहा है…" },
  { tag:'CHECK',     en:"Flagging 45 missing bank statements…",       hi:"45 गुम बैंक स्टेटमेंट चिह्नित किए…" },
  { tag:'OUTREACH',  en:"Sending personalised WhatsApp reminders…",   hi:"पर्सनलाइज़्ड WhatsApp रिमाइंडर भेज रहा है…" },
  { tag:'INBOUND',   en:"Receiving 18 bill photos over chat…",        hi:"चैट पर 18 बिल फ़ोटो प्राप्त हुईं…" },
  { tag:'MATCH',     en:"Reading line-items, computing CGST/IGST…",   hi:"लाइन-आइटम पढ़कर CGST/IGST निकाला…" },
  { tag:'RECONCILE', en:"Matching ledger against bank feed…",         hi:"लेजर को बैंक फ़ीड से मिला रहा है…" },
  { tag:'CHECK',     en:"Caught 3 duplicate invoices, fixed…",        hi:"3 डुप्लिकेट इनवॉइस पकड़े और ठीक किए…" },
  { tag:'DRAFT',     en:"Populating clean GSTR-1 drafts…",            hi:"साफ़-सुथरा GSTR-1 ड्राफ़्ट तैयार किया…" },
  { tag:'NOTIFY',    en:"Pinging owner: 30 returns ready to review…", hi:"ओनर को सूचना: 30 रिटर्न रिव्यू के लिए तैयार…" },
  // … expand to 24–28 steps in this style (more OUTREACH/INBOUND/RECONCILE/CHECK), then:
  { tag:'SUCCESS',   en:"45 compliance loops closed · 0 errors · ₹0 penalty.", hi:"45 कम्प्लायंस लूप पूरे · 0 गलती · ₹0 पेनल्टी।" },
],
outcome: { en:"Filed on time. Zero penalties. Staff went home.", hi:"समय पर फ़ाइल। शून्य पेनल्टी। स्टाफ घर चला गया।" },
roi: {
  humanOutput:   { en:"~40 returns/day, errors creep in", hi:"~40 रिटर्न/दिन, गलतियाँ संभव" },
  digitalOutput: { en:"Unlimited, 24×7, zero errors",     hi:"असीमित, 24×7, शून्य गलती" },
  costSaved: "70–80%"
}
```

### Worked example B — `voice` × `clinic`
```ts
bottleneck: {
  en: "🔴 Monday OPD rush. 60 missed calls, no-shows pile up, reception can't dial back fast enough.",
  hi: "🔴 सोमवार OPD की भीड़। 60 मिस्ड कॉल, मरीज़ नहीं आ रहे, रिसेप्शन वापस कॉल ही नहीं कर पा रहा।"
},
steps: [
  { tag:'BOOT',     en:"Digital Voice Caller coming online…",         hi:"डिजिटल वॉइस कॉलर ऑनलाइन हो रहा है…" },
  { tag:'SCAN',     en:"Pulling 60 missed-call numbers…",             hi:"60 मिस्ड-कॉल नंबर निकाल रहा है…" },
  { tag:'OUTREACH', en:"Calling back in patient's language…",         hi:"मरीज़ की भाषा में वापस कॉल कर रहा है…" },
  { tag:'MATCH',    en:"Offering next open OPD slots…",               hi:"अगले खाली OPD स्लॉट बता रहा है…" },
  { tag:'NOTIFY',   en:"Sending WhatsApp slot confirmations…",        hi:"WhatsApp पर स्लॉट कन्फ़र्मेशन भेज रहा है…" },
  { tag:'CHECK',    en:"Re-trying 9 unanswered numbers later…",       hi:"9 अनुत्तरित नंबरों को बाद में फिर ट्राई कर रहा है…" },
  // … expand to 24–28 steps (reminders, reschedules, doctor-wise routing), then:
  { tag:'SUCCESS',  en:"38 appointments rebooked · 0 calls dropped.", hi:"38 अपॉइंटमेंट दोबारा बुक · 0 कॉल छूटी।" },
],
outcome: { en:"Empty slots filled. Footfall recovered.", hi:"खाली स्लॉट भरे। मरीज़ों की संख्या वापस आई।" },
roi: {
  humanOutput:   { en:"~30 callbacks/day", hi:"~30 कॉलबैक/दिन" },
  digitalOutput: { en:"Every call returned, 24×7", hi:"हर कॉल का जवाब, 24×7" },
  costSaved: "60–75%"
}
```

### Workforce role
For `workforce` × any industry, the scenario shows **3–5 named digital workers acting in coordination** (e.g. Receptionist hands off to Sales hands off to Support), with `LogTag`s alternating to make the teamwork visible. Bottleneck framing: "an entire shift's worth of chaos, handled by a coordinated team."

### Travel industry — mandatory signature scenario (the "never miss a 2 AM booking" story)
This is the highest-conversion story for the travel segment, so write it with extra care. Context: most Indian cab/travel operators are solo or run 1–3 vehicles; a customer who messages at 2 AM and gets no reply is a lost booking. The Digital Employee answers instantly any hour, captures the booking, and **briefs the owner first thing in the morning to call and confirm** — so no lead is ever lost. Use this as the `reception` × `travel` scenario, and adapt the same spine for `support`/`voice`/`sales`/`workforce` × `travel`.

```ts
bottleneck: {
  en: "🔴 2:14 AM. A customer messages on WhatsApp for an airport cab at 6 AM. The owner is asleep. Normally — booking lost by morning.",
  hi: "🔴 रात 2:14 बजे। एक ग्राहक WhatsApp पर सुबह 6 बजे एयरपोर्ट कैब के लिए मैसेज करता है। मालिक सो रहा है। आम तौर पर — सुबह तक बुकिंग हाथ से निकल जाती।"
},
steps: [
  { tag:'BOOT',    en:"Digital Booking Agent awake at 2 AM…",        hi:"डिजिटल बुकिंग एजेंट रात 2 बजे भी जाग रहा है…" },
  { tag:'INBOUND', en:"Reading the customer's WhatsApp message…",    hi:"ग्राहक का WhatsApp मैसेज पढ़ रहा है…" },
  { tag:'OUTREACH',en:"Replying instantly, politely, in Hindi…",     hi:"तुरंत, विनम्रता से, हिंदी में जवाब दे रहा है…" },
  { tag:'MATCH',   en:"Asking pickup, drop, time, passengers…",      hi:"पिकअप, ड्रॉप, समय, यात्री पूछ रहा है…" },
  { tag:'CHECK',   en:"Checking the 6 AM slot is free…",             hi:"सुबह 6 बजे का स्लॉट खाली है, जाँच रहा है…" },
  { tag:'DRAFT',   en:"Holding a tentative booking, sharing fare…",  hi:"अस्थायी बुकिंग रोककर किराया बता रहा है…" },
  { tag:'NOTIFY',  en:"Telling customer: our team will confirm soon…",hi:"ग्राहक को बता रहा है: हमारी टीम जल्द पुष्टि करेगी…" },
  // … expand to 24–28 steps (collecting details, sharing driver-will-call note, logging the lead), then the two closers:
  { tag:'NOTIFY',  en:"Morning brief queued for owner at 7 AM…",     hi:"मालिक के लिए सुबह 7 बजे का ब्रीफ तैयार…" },
  { tag:'SUCCESS', en:"Booking saved overnight · owner reminded to call · 0 leads lost.", hi:"रातभर में बुकिंग सेव · मालिक को कॉल का रिमाइंडर · 0 लीड खोई।" },
],
outcome: { en:"The 2 AM customer is booked. Owner just calls to confirm. Zero missed bookings.", hi:"रात 2 बजे वाला ग्राहक बुक हो गया। मालिक सिर्फ पुष्टि के लिए कॉल करता है। एक भी बुकिंग नहीं छूटी।" },
roi: {
  humanOutput:   { en:"Sleeps at night → misses after-hours bookings", hi:"रात को सोता है → देर रात की बुकिंग छूट जाती है" },
  digitalOutput: { en:"Answers every message, any hour, 24×7",          hi:"हर मैसेज का जवाब, किसी भी समय, 24×7" },
  costSaved: "One saved booking/week pays for itself"
}
```
**Booking-flow rule:** the Digital Employee never *finalises* payment autonomously — it captures and holds the booking, reassures the customer that the team will confirm, logs the lead, and **pushes a morning brief to the owner to call back**. This keeps the human in the loop (trust) while guaranteeing the lead is never lost. Make this human-handoff explicit in the simulation and in the booking copy.

---

## 7. Screen-by-screen build spec

### STEP 1 — Greeting (`greeting`)
- Center stage: an **animated audio-waveform panel** = the Digital Staffing Assistant. Bars animate while "speaking" (drive from `speechSynthesis` `onboundary`/`onstart`/`onend`, or a time-based fallback). A clean play/pause + mute control.
- The assistant **speaks** the greeting (Web Speech API in the active language) **and** shows it as **synchronized kinetic text** (word/line reveal). Autoplay audio is blocked by browsers → start muted, show a glowing **"▶ Tap to hear"** affordance; first user gesture unlocks audio.
- **Language toggle** top-right: `[🇮🇳 हिन्दी] / [🇬🇧 English]`. Switching re-speaks + re-renders.
- **Greeting copy:**
  - EN: *"Hey — I'm your GoLuQ Digital Staffing Assistant. In under a minute I'll deploy a Digital Employee for your business: works 24×7, makes zero errors, takes zero salary, never takes leave. Want to watch one work live, right now, for free? Pick a role below to test-drive it."*
  - HI: *"नमस्ते! मैं हूँ आपका GoLuQ डिजिटल स्टाफिंग असिस्टेंट। एक मिनट से भी कम में मैं आपके बिज़नेस के लिए एक डिजिटल कर्मचारी तैनात कर दूँगा — जो 24×7 काम करता है, कोई गलती नहीं करता, कोई सैलरी नहीं लेता, और कभी छुट्टी नहीं लेता। क्या आप अभी, मुफ़्त में, उसे लाइव काम करते देखना चाहेंगे? नीचे से एक रोल चुनिए और टेस्ट कीजिए।"*
- **Reassurance ribbon** (displayed under the greeting, before the role grid — addresses the #1 silent objection of non-technical Indian owners: *"what if it makes a mistake and I don't know tech?"*). Subtle glass strip with a 🎓 icon, NOT spoken (keeps the greeting short):
  - EN: *"Not technical? No problem. We train you in simple language so you can run your Digital Employee with full confidence — you're never left alone with something you don't understand."*
  - HI: *"तकनीकी नहीं हैं? कोई बात नहीं। हम आपको आसान भाषा में पूरी ट्रेनिंग देते हैं, ताकि आप बिना किसी डर के अपने डिजिटल कर्मचारी को आराम से चला सकें — आपको कभी अकेला नहीं छोड़ा जाता।"*
- **Role cards grid** (5 glass cards, responsive 1-col mobile → 2/3-col up). On hover/tap: lift + teal border sweep. Labels:

| id | EN | HI | icon |
|---|---|---|---|
| voice | Digital Voice Calling Employee | डिजिटल वॉइस कॉलिंग कर्मचारी | Phone |
| support | Digital Customer Support Employee | डिजिटल कस्टमर सपोर्ट कर्मचारी | MessageSquare |
| sales | Digital Sales Employee | डिजिटल सेल्स कर्मचारी | TrendingUp |
| reception | Digital Receptionist | डिजिटल रिसेप्शनिस्ट | Building2 |
| workforce | Complete Digital Workforce (3–5 coordinated) | सम्पूर्ण डिजिटल वर्कफोर्स (3–5 कर्मचारी) | Network |

### STEP 2 — Industry (`industry`)
- Assistant prompts: EN *"Which industry is your business in?"* / HI *"आपका बिज़नेस किस इंडस्ट्री में है?"*
- 4 industry selectors (glass, icon + label):

| id | EN | HI | icon |
|---|---|---|---|
| clinic | Clinics & Hospitals | क्लिनिक और अस्पताल | Stethoscope |
| diagnostic | Diagnostic Centers | डायग्नोस्टिक सेंटर | FlaskConical |
| coaching | Coaching Institutes | कोचिंग संस्थान | BookOpen |
| ca | CA & Accounting Firms | सीए और अकाउंटिंग फर्म | Calculator |
| travel | Tours, Travel & Cab Services | टूर, ट्रैवल और कैब सर्विस | Car |

- Once both role + industry are set, reveal the **Go Luq** button.

### STEP 3 — Launch / "Go Luq" (`launch`)
- A massive, **pulsing cyan-and-white neon** button labeled **`Go Luq`** (keep this exact phonetic spelling — it should read like "Go Look"). Subtle continuous pulse + a stronger pulse on hover. Below it, tiny helper: EN *"Watch your Digital Employee work — live."* / HI *"अपने डिजिटल कर्मचारी को लाइव काम करते देखिए।"*
- Pressing it transitions to the simulation with a **cinematic screen-split** wipe.

### STEP 4 — Live Simulation (`simulation`)
- Header: a red **Bottleneck Banner** (`scenario.bottleneck`) with a subtle alarm-pulse.
- Below: a **terminal-style live log** inside a glass panel. Steps stream in via Framer Motion stagger (~140–180ms each, accelerating), each row = `[TAG chip] text … ✓`. Tag chips are color-coded by `LogTag`. Auto-scroll to newest. Total run ~5–7s.
- On final `SUCCESS` step: a **"Task Completed Flawlessly"** burst (scale-in check, teal glow, optional confetti-lite — respect reduced-motion). Hold ~1.2s, then auto-advance to booking.
- Provide a **"Run again" / "Try another role"** secondary control after completion in case they linger.

### STEP 5 — Booking & Upsell (`booking`)
- **ROI scorecard** (side-by-side glass cards): `roi.humanOutput` vs `roi.digitalOutput`, plus a bold **"Cost saved: up to {costSaved}"** ribbon.
- **Lead form** (React state + handlers, **never** a native `<form>` submit inside an artifact-style flow — use `onClick`):
  - Full Name (required)
  - Phone Number (required, IN format, `+91` prefix) — render an **OTP-style verify affordance** but see §8 (styled-only v1).
  - Email (optional)
  - Free-text: EN *"Tell us about your business process or workflow…"* / HI *"अपने बिज़नेस प्रोसेस या वर्कफ़्लो के बारे में बताइए…"*
  - **Training opt-in** (a prominent checkbox, **default checked** — low friction, positive framing, and a warm-lead signal): ☑ EN *"Yes — I'd like a free, simple-language training walkthrough"* / HI *"हाँ — मुझे आसान भाषा में मुफ़्त ट्रेनिंग वॉकथ्रू चाहिए"*. Send as `wantsTraining` in the payload.
- **Cross-sell matrix** (checkbox grid), heading: EN *"Want our custom engineering team to build other software for your business?"* / HI *"क्या आप चाहते हैं हमारी कस्टम इंजीनियरिंग टीम आपके बिज़नेस के लिए और सॉफ़्टवेयर बनाए?"*
  - ☐ Custom Website Creation / कस्टम वेबसाइट
  - ☐ Custom Mobile App (team or customers) / कस्टम मोबाइल ऐप
  - ☐ **🔒 Zero-Internet Local Software** — *runs 100% offline on your own office machines, no internet needed, for total data safety* / **🔒 बिना-इंटरनेट लोकल सॉफ़्टवेयर** — *आपकी अपनी ऑफिस मशीनों पर 100% ऑफलाइन चलता है* (highlight this one with a stronger border/glow)
  - ☐ Custom WhatsApp & Communication Automations / कस्टम WhatsApp ऑटोमेशन
- **"Don't worry, you'll be trained" reassurance card** (highlighted glass card directly above the trust badges — this is the conversion-saver for non-technical owners). Heading EN *"Worried it's too technical? Don't be."* / HI *"लगता है बहुत टेक्निकल है? बिल्कुल मत घबराइए।"* · Body EN *"Every trial includes a free, simple-language walkthrough. We sit with you until you're comfortable running it yourself — no tech knowledge needed."* / HI *"हर ट्रायल के साथ आसान भाषा में मुफ़्त वॉकथ्रू मिलता है। जब तक आप खुद आराम से चलाना न सीख लें, हम आपके साथ रहते हैं — किसी तकनीकी जानकारी की ज़रूरत नहीं।"*
- **Trust badge row** (see §9), then the main CTA:
  - EN **"Book Your Free Digital Employee Trial"** / HI **"अपना मुफ़्त डिजिटल कर्मचारी ट्रायल बुक करें"**
- On submit: validate → POST to `/api/lead` (§10) → success state (glass "We'll reach out on WhatsApp shortly" / "हम जल्द ही WhatsApp पर संपर्क करेंगे") with error handling + retry. Include the selected `role`, `industry`, cross-sell choices, and `wantsTraining` in the payload.

---

## 8. Voice / audio approach

- **Default (v1):** Web Speech API `speechSynthesis`. On language switch, pick a matching voice (`hi-IN` for Hindi, `en-IN`/`en-US` for English) from `getVoices()`; fall back gracefully if none. Always start muted; require a user gesture to speak (autoplay policy).
- **Waveform:** drive bar heights from speech events when available; otherwise a time-based animation lasting the estimated utterance duration.
- **Known limitation:** browser **Hindi** TTS quality varies a lot across devices. For production polish, support an optional **pre-rendered audio file** for the hero greeting (EN + HI) served from `/public/audio/`; if present, prefer it over `speechSynthesis` for that one line. Build the audio layer behind a small `speak(textKey)` abstraction so this is a config swap, not a rewrite.

---

## 9. Trust badges — defensible wording only

Use these (icon + short label). Do **not** claim certifications/government approval.
- 🛡️ EN "Encrypted & anti-fraud by design" / HI "एन्क्रिप्टेड और फ्रॉड-रोधी"
- 💼 EN "Your data stays under your control" / HI "आपका डेटा आपके नियंत्रण में"
- 🇮🇳 EN "Built in India, for Indian businesses" / HI "भारत में बना, भारतीय बिज़नेस के लिए"
- 🔒 EN "Safe, verified transactions" / HI "सुरक्षित, सत्यापित लेन-देन"
- 🎓 EN "Free training & hand-holding included" / HI "मुफ़्त ट्रेनिंग और पूरा सहयोग साथ में"

(If you later obtain real certifications, add them then.)

---

## 10. Lead capture backend (Cloudflare Pages Functions + D1)

Create `/functions/api/lead.ts` (a Pages Function — deploys automatically with the site, same origin, no CORS):

```ts
interface Env { DB: D1Database; }

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await request.json<any>();
    const { name, phone, email, message, role, industry, crossSell, wantsTraining, ref } = body;
    if (!name || !phone) return Response.json({ ok:false, error:'name & phone required' }, { status:400 });

    await env.DB.prepare(
      `INSERT INTO leads (name, phone, email, message, role, industry, cross_sell, wants_training, ref_code, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))`
    ).bind(name, phone, email ?? null, message ?? null, role ?? null, industry ?? null,
           JSON.stringify(crossSell ?? []), wantsTraining ? 1 : 0, ref ?? null).run();

    return Response.json({ ok:true });
  } catch (e) {
    return Response.json({ ok:false, error:'server' }, { status:500 });
  }
};
```

D1 schema (`schema.sql`):
```sql
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT,
  message TEXT, role TEXT, industry TEXT, cross_sell TEXT,
  wants_training INTEGER DEFAULT 0,
  ref_code TEXT,                       -- affiliate attribution (last-click within window)
  created_at TEXT NOT NULL
);
-- Affiliate tables: see §10A for the full schema (affiliates, ref_hits, commissions).
```

Setup commands:
```bash
npx wrangler d1 create goluq-leads
npx wrangler d1 execute goluq-leads --file=./schema.sql --remote
```
Then in the **Cloudflare Pages dashboard → Settings → Functions → D1 bindings**, bind variable `DB` → `goluq-leads`.

**OTP (deferred, do not fake):** leave a clearly-marked `TODO: integrate MSG91 OTP` seam in the phone field and a `verifyOtp()` stub. v1 ships the OTP *visual* but does not pretend to verify. Wire a real Indian SMS gateway (MSG91 / 2Factor / Twilio) in phase 2 via a `/functions/api/otp` function. **Do not** mark a number "verified" without an actual gateway round-trip.

**Optional simpler sink:** if you'd rather not use D1 yet, the same function can `fetch()`-forward the lead to a webhook (e.g. your existing PocketBase/Razorpay stack or a Google Sheet endpoint). Keep the function's interface identical so the front end never changes.

---

## 10A. Affiliate / Partner module ("Become a Partner & Earn")

> **Strategic intent:** the affiliate is the *human trust-bridge*. Non-tech owners trust a local person who explains things in plain Hindi before they trust a "digital employee." The affiliate page is **itself a live demo** of the digital sales agent — the same bot greets, explains, calculates earnings, answers questions, and walks the user through registration with salesman-style nudges. Selling the affiliate program proves the product.

### Locked decisions (build exactly these)
- **Commission model — front-loaded taper:** **35%** of the customer's monthly price for **months 1–12**, then **12% lifetime** while that customer stays active. Per referred customer, attributed to the affiliate's `code`.
- **Bot Q&A:** curated tappable **question-chips** (crafted answers, on-brand, zero hallucination). A free-form Claude fallback is a **phase-2 seam** only — do not wire it in v1.
- **Auth:** **secret token-link dashboard** — each affiliate gets a unique unguessable URL `/partner/dashboard?token=…`. No password in v1. Phone-OTP login is a phase-2 upgrade.
- **Payouts:** collect **PAN + UPI** at registration. **Manual** UPI disbursement in v1 (no auto-payout). Minimum payout **₹500**. Show a TDS note (see Payout ops).

### Config constants (single source — `src/content/affiliateConfig.ts`)
Prices come from the **GoLuQ Pricing Model** (separate workbook). Use the **plan price map**, not a single number — the calculator lets the affiliate pick which Digital Employee they sell.
```ts
export const RATE_YEAR1 = 0.35;              // affiliate, months 1–12
export const RATE_LIFETIME = 0.12;           // affiliate, month 13+
export const ATTRIBUTION_DAYS = 90;          // last-click window
export const MIN_PAYOUT_INR = 500;

// ⚠️ Confirm against the Pricing Model workbook before launch. Prices in ₹/month; cap = included fair-use quota.
export const PLANS = [
  { id:'reception',     priceInr: 799,  cap:'1,500 conversations', labelKey:'plans.reception' },
  { id:'support',       priceInr: 999,  cap:'2,000 conversations', labelKey:'plans.support' },
  { id:'sales',         priceInr: 1499, cap:'3,000 conversations', labelKey:'plans.sales' },
  { id:'voiceLite',     priceInr: 4999, cap:'1,200 call-minutes',  labelKey:'plans.voiceLite' },
  { id:'voicePro',      priceInr: 6999, cap:'2,500 call-minutes',  labelKey:'plans.voicePro' },
  { id:'workforce',     priceInr: 9999, cap:'2,000 mins + 3–4k chats', labelKey:'plans.workforce' },
] as const;
export const DEFAULT_PLAN_ID = 'sales';      // sensible mid default for the calculator
```
Travel/cab operators are sold the `reception` or `support` plan (₹799–₹999). The earnings calculator and any pricing display must read from `PLANS` — never hardcode a price inline.

### Attribution chain (must connect perfectly end-to-end)
1. Affiliate shares `https://goluq.com/?ref=<CODE>` (works on every route).
2. **On app mount**, read `?ref=` from the URL. If present: write `{ code, exp: Date.now()+ATTRIBUTION_DAYS*86400000 }` to `localStorage['goluq_ref']` (**last-click wins**, overwrite), then `POST /api/affiliate/track {code}` (fire-and-forget; records a click). Strip `ref` from the visible URL with `history.replaceState` (clean address bar, attribution kept).
3. A tiny `getActiveRef()` helper returns the stored code **only if not expired**, else `null`.
4. The **lead form** (Step 5) reads `getActiveRef()` and includes it as `ref` in its POST to `/api/lead` (already wired in §10 → `ref_code`).
5. **Conversion → commission** happens later when that lead becomes a paying customer. In v1 this is an **admin action** (`/api/affiliate/convert`, protected by `ADMIN_SECRET`) that creates ledger rows; phase-2 seam: a Razorpay webhook calls the same accrual logic on each successful charge.
6. The **dashboard** reads clicks (`ref_hits`), attributed leads (`leads.ref_code`), conversions + earnings (`commissions`) for the token's affiliate.

### Routes & pages (react-router)
- `/` — staffing app (unchanged). Add a persistent, dismissable **"Become a Partner & Earn 35%"** entry point (header chip + a card the homepage bot references — see Bot cross-mention).
- `/partner` — affiliate landing with the **PartnerBot** (reused `WaveformAssistant`), earnings calculator, question-chips, and a **Register** flow.
- `/partner/dashboard?token=…` — token-gated stats dashboard.
- SPA fallback `public/_redirects` (`/* /index.html 200`) is now **required** (deep links + token URLs).

### The PartnerBot flow (`/partner`) — a guided, nudging sales conversation
Reuse `WaveformAssistant` with a partner script. Bilingual throughout. Steps as a mini state machine (`partnerStep`): `intro → calculator → questions → register → done`.

1. **Intro (spoken + kinetic text):**
   - EN: *"Welcome! Want to earn every single month — without any tech skills? Refer GoLuQ Digital Employees to businesses you already know. You earn 35% every month for the first year, and keep earning for as long as they stay. Many partners run a small YouTube channel and earn while they sleep. Want me to show you how much you could make?"*
   - HI: *"स्वागत है! बिना किसी तकनीकी जानकारी के, हर महीने कमाई करना चाहते हैं? जिन बिज़नेस को आप पहले से जानते हैं, उन्हें GoLuQ डिजिटल कर्मचारी रेफर कीजिए। पहले साल हर महीने 35% कमाएँ, और जब तक ग्राहक जुड़ा रहे, कमाते रहें। कई पार्टनर एक छोटा सा YouTube चैनल चलाकर सोते-सोते भी कमाते हैं। दिखाऊँ आप कितना कमा सकते हैं?"*
2. **Earnings calculator** (interactive, the hook). Two controls: a **plan picker** (the 6 `PLANS`, default `DEFAULT_PLAN_ID`) and a slider *"How many businesses can you refer?"* (`N`, 1–50). Price = the selected plan's `priceInr`. Compute live and display in glass cards:
   ```ts
   const price = PLANS.find(p => p.id === selectedId)!.priceInr;
   const year1Monthly   = N * RATE_YEAR1    * price;   // ₹/mo during year 1
   const year1Total     = year1Monthly * 12;
   const ongoingMonthly = N * RATE_LIFETIME * price;   // ₹/mo from month 13
   const cumulative24m  = year1Total + ongoingMonthly * 12; // 2-year projection
   ```
   Show all four, animate the numbers (count-up), and a one-line **honest caveat**: EN *"Assumes referred businesses stay active. Real earnings vary."* / HI *"मानकर चला गया है कि रेफर किए गए बिज़नेस जुड़े रहते हैं। असल कमाई अलग हो सकती है।"* Format ₹ with Indian grouping (`toLocaleString('en-IN')`).
3. **Question-chips** (curated). Tapping a chip makes the bot "answer" (kinetic text + optional speak). Provide all of these EN/HI in i18n:
   - "How much can I earn?" → restate the taper + point at the calculator.
   - "When and how do I get paid?" → monthly via UPI, after ₹500 minimum, manual review.
   - "Do I need any tech knowledge?" → no — you connect us to the business, we handle setup + training.
   - "How do I find customers?" → people you know, local shops/clinics, your WhatsApp, a small YouTube channel.
   - "Is there any joining fee?" → free to join.
   - "How is my referral tracked?" → your personal link + code; you see every click and lead in your dashboard.
   After any answer, the bot **nudges**: EN *"Shall I guide you to register? It takes 2 minutes."* / HI *"क्या मैं आपको रजिस्टर करने में मदद करूँ? सिर्फ 2 मिनट लगेंगे।"*
4. **Register (bot-guided, one field at a time with encouragement):** fields below. The bot introduces each, confirms as they go, and nudges if idle.
   - Full Name *(req)*, Phone `+91` *(req, `^[6-9]\d{9}$`)*, Email *(optional)*
   - **PAN** *(req for payouts, `^[A-Z]{5}[0-9]{4}[A-Z]$`, auto-uppercase)*
   - **UPI ID** *(req, `^[\w.\-]{2,256}@[a-zA-Z]{2,64}$`)*
   - **YouTube/Social URL** *(optional — flags the "creator" affiliate type)*
   - City *(optional)*
   On submit → `POST /api/affiliate/register`. On success the bot celebrates and reveals **(a)** their share link `https://goluq.com/?ref=<code>` with a copy button, and **(b)** their private dashboard link `https://goluq.com/partner/dashboard?token=<token>` with a clear warning: EN *"Save this link — it's your private key, don't share it."* / HI *"यह लिंक सेव कर लें — यह आपकी निजी चाबी है, किसी को न दें।"*
5. **Done:** quick-start tips (share on WhatsApp, make one short Hindi video, target 3 local businesses this week) + a button back to the homepage demo *"See what you'll be selling."*

### Nudge engine (shared by BOTH bots — `src/lib/useNudge.ts`)
A salesman-in-a-shop, not a nag. Behavior:
- **Idle detection:** if no pointer/key/scroll/tap for **~8s** on the current step, fire one contextual nudge line (bot speaks/shows a short prompt relevant to where they are).
- **Cooldown:** after a nudge, wait **≥ 20s** before another; **max 2 nudges per step**; any user interaction resets/cancels.
- **Always closeable:** the assistant bubble has a dismiss (×); dismissing silences nudges for that step. Never block interaction, never cover the primary CTA.
- **Reduced-motion / accessibility:** no motion-heavy nudges when `prefers-reduced-motion`; nudges are `aria-live="polite"` and de-duplicated.
- **Homepage use:** the homepage bot uses the same engine while the user is on the booking form (e.g. *"Stuck? I can fill this with you — just tell me your name and number."*) — demonstrating the digital salesperson live.
- Define a per-step nudge map: `{ [step]: { en: string[]; hi: string[] } }` and cycle without repeating until exhausted.

### Bot cross-mention (homepage → affiliate)
After the homepage greeting's role grid, the homepage bot adds ONE soft line (shown, not necessarily spoken), with the **"Become a Partner & Earn"** button beside it:
- EN: *"Know other business owners? You can earn 35% every month by referring them. Tap 'Become a Partner'."*
- HI: *"और बिज़नेस मालिकों को जानते हैं? उन्हें रेफर करके हर महीने 35% कमाएँ। 'पार्टनर बनें' पर टैप करें।"*

### D1 schema additions (append to `schema.sql`)
```sql
CREATE TABLE IF NOT EXISTS affiliates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,          -- short share code, e.g. RAVI4K9
  token TEXT UNIQUE NOT NULL,         -- secret dashboard key (32+ hex)
  name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, city TEXT,
  pan TEXT NOT NULL, upi_id TEXT NOT NULL, youtube_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ref_hits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,                 -- no PII stored (privacy): code + time only
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS commissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  affiliate_code TEXT NOT NULL,
  lead_id INTEGER,                    -- nullable link back to the originating lead
  customer_ref TEXT,                  -- your internal customer id once converted
  period_month TEXT,                  -- 'YYYY-MM' the commission is for
  rate REAL NOT NULL,                 -- 0.35 or 0.12 (snapshot at accrual)
  amount_inr REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | paid
  created_at TEXT NOT NULL, paid_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_hits_code ON ref_hits(code);
CREATE INDEX IF NOT EXISTS idx_comm_code ON commissions(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_leads_ref ON leads(ref_code);
```

### Pages Functions (all under `/functions/api/affiliate/`)
All share `interface Env { DB: D1Database; ADMIN_SECRET: string; }`. Validate inputs server-side too (never trust the client). Return `Response.json({...})`.

- **`register.ts` (`onRequestPost`)** — validate name/phone/PAN/UPI (same regexes). Generate `code` (e.g. first 4 letters of name uppercased + 3 random alphanumerics; **retry on UNIQUE collision**, max 5 tries) and `token` (`crypto.getRandomValues` → 32-byte hex). Insert affiliate. Return `{ ok:true, code, token, shareUrl, dashboardUrl }`. On duplicate phone, return the existing record's links (idempotent re-register) rather than erroring.
- **`track.ts` (`onRequestPost`)** — body `{code}`; if a matching active affiliate exists, insert a `ref_hits` row. Always return `{ok:true}` quickly (fire-and-forget; never block the page).
- **`stats.ts` (`onRequestGet`)** — query `?token=`. Look up affiliate by token (404 if none). Return aggregates for that affiliate's `code`:
  ```ts
  { ok:true, affiliate:{name, code, shareUrl},
    clicks:   /* COUNT ref_hits where code */,
    leads:    /* COUNT leads where ref_code=code */,
    conversions: /* COUNT DISTINCT customer_ref in commissions */,
    earnings: { pending, approved, paid },   // SUM amount_inr grouped by status
    recent:   /* last 10 commission rows */ }
  ```
- **`convert.ts` (`onRequestPost`, admin)** — header `x-admin-secret` must equal `ADMIN_SECRET` (else 401). Body `{ affiliateCode, leadId?, customerRef, planPriceInr, months: number }` → for each month, accrue a commission row using `RATE_YEAR1` for months 1–12 and `RATE_LIFETIME` after, `amount = rate * planPriceInr` (price of the plan that customer actually bought, from `PLANS`). This is the manual-ops accrual; the **same function body** is what a future Razorpay webhook calls per charge (phase-2 seam — leave a clearly-commented `// PHASE 2: Razorpay webhook entry point` above it).

Set `ADMIN_SECRET` in **Pages → Settings → Environment variables** (encrypted). Bind the **same** `DB` (one database holds leads + affiliate tables).

### The dashboard page (`/partner/dashboard`)
- Read `token` from the URL, `GET /api/affiliate/stats?token=…`. If invalid → a friendly "link not recognised — re-check your private link" screen (no data leak).
- Show, in glass cards: greeting with affiliate name, the **share link + copy + WhatsApp-share button**, big numbers (Clicks · Leads · Conversions), an **Earnings** panel (Pending / Approved / Paid, ₹ Indian-formatted), and a recent-activity list. Bilingual. Mobile-first.
- Add a "How payouts work" expander (see Payout ops). No write actions on this page in v1.

### Payout ops (v1 = manual, honest)
- Disburse via UPI manually when an affiliate's **approved** balance ≥ `MIN_PAYOUT_INR` (₹500). Mark rows `paid` + set `paid_at` (admin/D1).
- **TDS note** shown to affiliates (defensible, not advice): EN *"Commission payouts may be subject to TDS under Indian tax law; PAN is required."* / HI *"कमीशन भुगतान पर भारतीय कर नियमों के तहत TDS लागू हो सकता है; इसलिए PAN आवश्यक है।"* — **Dushyant: confirm exact TDS handling (Sec 194H) with your CA; this is not tax advice.**
- Do **not** automate disbursement or promise instant payouts in copy.

---

## 11. i18n setup

- `src/i18n/en.json`, `src/i18n/hi.json` — mirror structure exactly. Namespaced: `roles.*`, `industries.*`, `greeting.*`, `sim.*`, `booking.*`, `trust.*`.
- Scenario step text stays in `scenarios.ts` (not the JSON), since each step carries `en`/`hi` inline — select by `state.lang`.
- Detector order: `localStorage` → browser → default `en`. Persist on toggle.
- Default for Indian visitors: you may default to `hi` if `navigator.language` starts with `hi`, else `en`. Toggle always wins.

---

## 12. Accessibility, SEO, performance

- Semantic landmarks, focus management on step change (move focus to the new step's heading), visible focus rings, aria-live on the simulation log (`aria-live="polite"`, but throttle so it doesn't spam screen readers — announce bottleneck + final outcome, not every tick).
- Particle canvas: `aria-hidden`, paused on `prefers-reduced-motion` and `document.hidden`.
- SEO/meta in `index.html`: title, description, **Open Graph + Twitter cards** (the hero/brand image), `lang` attribute updates with toggle, favicon, theme-color `#05070D`.
- Lazy-load the simulation content + heaviest motion. Preload fonts (Devanagari subset) to avoid Hindi layout shift.

---

## 13. File structure

```
goluq-staffing/
├─ public/
│  ├─ audio/            # optional pre-rendered greeting (en/hi)
│  ├─ _redirects        # /* /index.html 200  (SPA fallback — required for routes + token links)
│  └─ og-image.png
├─ functions/
│  └─ api/
│     ├─ lead.ts                 # lead capture (+ ref_code)
│     └─ affiliate/
│        ├─ register.ts          # create affiliate, return code + token + links
│        ├─ track.ts             # record a ref click
│        ├─ stats.ts             # token-gated dashboard data
│        └─ convert.ts           # admin accrual (+ phase-2 Razorpay webhook seam)
├─ schema.sql                    # leads + affiliates + ref_hits + commissions
├─ wrangler.toml
├─ src/
│  ├─ main.tsx                   # router root (BrowserRouter)
│  ├─ App.tsx                    # routes: / , /partner , /partner/dashboard
│  ├─ pages/
│  │  ├─ StaffingApp.tsx         # the 5-step homepage flow
│  │  ├─ PartnerLanding.tsx      # affiliate bot flow (intro→calculator→questions→register→done)
│  │  └─ PartnerDashboard.tsx    # token dashboard
│  ├─ state/{useAppState.ts, usePartnerState.ts}
│  ├─ i18n/{index.ts,en.json,hi.json}
│  ├─ content/{roles.ts,industries.ts,scenarios.ts,affiliateConfig.ts}
│  ├─ lib/{speak.ts, useNudge.ts, refAttribution.ts}   # refAttribution = get/set/track ref
│  ├─ components/
│  │  ├─ BrandMark.tsx
│  │  ├─ ParticleField.tsx
│  │  ├─ LanguageToggle.tsx
│  │  ├─ ThemeToggle.tsx        # light/dark, persists goluq_theme
│  │  ├─ WaveformAssistant.tsx   # reused by homepage bot AND PartnerBot
│  │  ├─ RoleGrid.tsx
│  │  ├─ IndustryGrid.tsx
│  │  ├─ GoLuqButton.tsx
│  │  ├─ Simulation.tsx
│  │  ├─ RoiScorecard.tsx
│  │  ├─ LeadForm.tsx
│  │  ├─ CrossSellGrid.tsx
│  │  ├─ TrustBadges.tsx
│  │  ├─ PartnerCTA.tsx          # "Become a Partner & Earn 35%" entry point
│  │  ├─ EarningsCalculator.tsx
│  │  ├─ QuestionChips.tsx
│  │  └─ AffiliateRegisterForm.tsx
│  ├─ index.css
│  └─ index.html → (at repo root)
├─ tailwind.config.js
└─ index.html
```

`wrangler.toml`:
```toml
name = "goluq-staffing"
compatibility_date = "2024-11-01"
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "goluq-leads"
database_id = "<paste-from-wrangler-d1-create>"
```

Also add `public/_redirects` for SPA fallback if you introduce client routing:
```
/*  /index.html  200
```

---

## 14. Build order (do it in milestones; verify each before moving on)

1. **Scaffold + Tailwind + theme-token system (light/dark CSS vars) + `<BrandMark>` + `<ThemeToggle>` + `ParticleField` + background.** Get the look right on mobile, tablet, and desktop in *both* themes before moving on.
2. **i18n wiring + LanguageToggle** (persisted). Stub copy so toggling visibly works. Include `plans.*` and the 5th industry (`travel`) keys.
3. **State machine** with empty placeholder screens + `AnimatePresence` transitions + back/lang on every step.
4. **Step 1 greeting** (waveform + `speak()` + kinetic text + role grid).
5. **Step 2 industry** + **Step 3 Go Luq** reveal logic.
6. **`scenarios.ts`**: write examples A, B, and the travel signature scenario verbatim, then generate the other 22 to the same bar (25 total = 5 roles × 5 industries).
7. **Step 4 simulation** cascade + completion beat.
8. **Step 5 booking**: ROI scorecard, lead form, cross-sell, trust badges, success/error states.
9. **Pages Function + D1** wiring (leads); test a real lead end-to-end (incl. `ref_code` capture).
10. **Affiliate module:** `affiliateConfig.ts` + `refAttribution.ts` (capture `?ref=`, store, track) → schema additions → `/partner` PartnerBot flow (intro → calculator → question-chips → bot-guided register) → `register/track/stats/convert` functions → `/partner/dashboard` token page → `PartnerCTA` on homepage + bot cross-mention. Verify the full chain: click `?ref=CODE` → hit recorded → submit a lead → `ref_code` stored → admin `convert` → earnings show on that token's dashboard.
11. **Shared nudge engine** (`useNudge`) applied to both bots; tune idle/cooldown; confirm dismissable + reduced-motion safe.
12. **Polish:** reduced-motion, a11y, Lighthouse, Hindi rendering pass, jargon-lint, OG meta, ₹ Indian number formatting everywhere.

---

## 15. Definition of done

- Full 5-step flow works in both EN and HI, **in both light and dark themes**, across **mobile, tablet, and desktop** (no horizontal scroll, AA contrast in both themes), with no banned jargon anywhere (lint passes).
- All **25** scenarios present (5 roles × 5 industries incl. `travel`), each 24–28 steps, bilingual, specific, quantified; the travel "2 AM booking → morning owner brief" signature scenario is implemented with the human-handoff rule.
- Assistant speaks (after gesture) and shows synced text; waveform reacts.
- Simulation runs in ~5–7s with a satisfying completion beat, then booking.
- Lead submits to D1 via the Pages Function; success + error + retry all handled.
- `prefers-reduced-motion` fully respected; Lighthouse mobile Perf ≥ 90 / A11y ≥ 95.
- Trust copy is defensible (no false certification claims); OTP is styled-only with a clear integration seam, not faked.
- Training reassurance appears in both languages at two touchpoints (greeting ribbon + booking card), the opt-in checkbox is present and defaults checked, and `wants_training` persists to D1.
- **Affiliate chain proven end-to-end:** `?ref=CODE` is captured (last-click, 90-day), a click lands in `ref_hits`, an attributed lead stores `ref_code`, admin `convert` accrues commissions at 35%/12% off the converted plan's price (from `PLANS`), and that token's dashboard shows clicks/leads/conversions/earnings. Registration validates PAN + UPI and returns a working share link + private token dashboard link.
- **Both bots nudge** like a polite shop salesman (idle prompts, cooldown, max 2/step, always dismissable, reduced-motion safe). The PartnerBot's calculator reads the `PLANS` price map (plan picker + N), math matches the config constants; all ₹ use Indian formatting.
- All affiliate copy obeys the jargon ban and uses defensible earnings language with the "real earnings vary" caveat.
- Each plan's **fair-use cap** (included quota) is displayed clearly wherever the plan/price is shown; the overage/upgrade policy is reflected in copy (soft cap → owner notified → upgrade or overage, never a silent hard stop). Note in code that cap *enforcement* lives in the product runtime, not this site.

---

## 16. Pricing model (summary — full math in `GoLuQ_Pricing_Model.xlsx`)

Every price splits three ways **as a % of price**: `Price = COGS + Affiliate + Founder`. Affiliate is 35% (Y1) / 12% (lifetime); the founder keeps the rest — a ~15–35% floor in Year 1 that expands to ~46–58% lifetime as the affiliate share tapers. Rule of thumb: keep true COGS ≤ ~50% of price for text employees, ≤ ~35% for voice/premium. Text employees are cheap to run (own-number WhatsApp via Baileys = no Meta per-message fees); voice carries real telephony cost and is priced as premium.

Launch price ladder (₹/month; confirm against the workbook before publishing):

| Plan | Price | Est. COGS | Included / month (fair-use cap) | Founder Y1 | Founder lifetime |
|---|---|---|---|---|---|
| Digital Receptionist (text) | ₹799 | ~₹300 | 1,500 conversations | ~28% | ~51% |
| Digital Customer Support (text) | ₹999 | ~₹350 | 2,000 conversations | ~30% | ~53% |
| Digital Sales (WhatsApp) | ₹1,499 | ~₹450 | 3,000 conversations | ~35% | ~58% |
| Voice Calling — Lite (capped) | ₹4,999 | ~₹1,700 | 1,200 call-minutes | ~31% | ~54% |
| Voice Calling — Pro | ₹6,999 | ~₹2,950 | 2,500 call-minutes | ~23% | ~46% |
| Complete Digital Workforce | ₹9,999 | ~₹3,200 | 2,000 mins + ~3–4k chats | ~33% | ~56% |

### Fair-use caps & metering (critical for cost control — enforced in the Digital Employee runtime, NOT this website)
Without a cap, one high-traffic customer can spike COGS and erase the margin. Every plan includes a monthly quota (above). The **`GoLuQ_Pricing_Model.xlsx` → Fair-Use Caps** sheet proves the founder margin stays **≥ 20% in Year 1 even at full cap** on every plan — that's the whole point of the cap.
- **Metering lives in your product backend** (the WhatsApp/voice runtime), not in this Pages site. This spec records the policy so the two stay in sync; the homepage's job is only to **display** each plan's included quota clearly.
- **Overage policy (never a hard stop):** soft cap with a ~10% buffer → **notify the business owner** → then either per-unit overage billing (≈₹0.50/conversation, ≈₹2.50/minute — 2–3× unit cost) **or** a one-tap upgrade to the next plan. If a customer ignores it, degrade gracefully to "our team will get back to you" handoff mode — the end customer always gets a reply; the owner is never silently billed or silently cut off.
- **Annual plan:** pay for 10 months, get 12 (~17% off) — improves cash flow and cuts churn, which protects the taper economics.
- **Value framing in copy:** lead with "replace a ₹12,000–₹18,000/month hire for under ₹1,000" — the legitimate ₹200-value-for-₹100 story.
- These prices and caps feed the affiliate `PLANS` map in §10A. Keep the three in sync (spec table ↔ workbook ↔ `affiliateConfig.ts`).

---

## 17. Phase 2 — international expansion (plan only; do not build in v1)

The same psychological engine ports to other geographies by **swapping trust signals, price anchors, and bottlenecks** — not rebuilding. Architect v1 so this is configuration, not a rewrite: a `region` config object (currency, locale, price map, trust-badge set, scenario pack, compliance copy) selected by domain or a region switch. Keep all money/labels going through that config now.

What changes per region (the psychology, not the mechanics):
- **US / UK / ANZ:** trust comes from privacy/compliance proof (SOC 2, GDPR/UK-GDPR, "your data stays in-region"), reviews/social proof, transparent month-to-month billing and easy cancellation, and integrations (Google Calendar, HubSpot, Stripe). Price in $/£ — a digital employee is *dramatically* cheaper than local wages there, so the savings story is even stronger; lead with ROI and hours reclaimed, less with "fear of tech." Currency: USD/GBP/AUD/NZD; Stripe instead of Razorpay; WhatsApp **+ SMS/email/voice** channel mix (WhatsApp is less dominant than in India).
- **UAE / Saudi (GCP/APAC):** bilingual **Arabic (RTL) + English**, local-language voice, trust via local presence/partners and data-residency assurances, premium positioning. Build with RTL in mind (logical CSS properties) so the layout flips cleanly.
- **Shared:** the talking-bot demo, the live simulation, the affiliate bridge, and the nudge engine all carry over unchanged — only content packs and trust framing are localized.

Phase-2 build seams to leave in v1: the `region` config object, currency formatting through one helper (not hardcoded ₹), scenario packs keyed by region, a payment-provider abstraction (Razorpay now, Stripe later), and RTL-safe styling utilities. **Do not implement these regions in v1 — just don't paint yourself into a corner.**

---

## 18. Deploy to Cloudflare (DNS already on Cloudflare)

1. Push the repo to GitHub.
2. **Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git** → select repo. Build command `npm run build`, output dir `dist`.
3. After first deploy: **Settings → Functions → D1 bindings** → add `DB` → `goluq-leads`. Under **Environment variables** add `ADMIN_SECRET` (encrypted; used by `/api/affiliate/convert`) and later `MSG91_KEY`.
4. **Custom domains → Set up a custom domain → `goluq.com`** (and `www`). Since DNS is already in Cloudflare, it provisions and issues SSL in one step.
5. Re-deploy; verify `/api/lead` works on the live domain and a test lead lands in D1 (`wrangler d1 execute goluq-leads --command "SELECT * FROM leads" --remote`).

---

*End of spec. Build in milestone order. When a scenario or copy choice is ambiguous, prefer the most specific, industry-true, emotionally concrete option a real Indore SMB owner would recognise — never generic filler.*
