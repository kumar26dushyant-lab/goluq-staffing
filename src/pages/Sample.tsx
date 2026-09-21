import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Banknote, BookOpen, Briefcase, GraduationCap, Headset, MessageCircle, Minus, Plus, ServerCog, Users, Wallet } from "lucide-react";
import { TopBar } from "../components/TopBar";
import { FilmGrid } from "../components/FilmGrid";
import { useSiteConfig, usePricing, useMoney } from "../lib/siteConfig";

/**
 * /sample — a design draft, not a live page. The all-in-one theme ("why pay
 * for six software") rebuilt phone-first against the UI/UX guidance:
 * one idea per screen, 44px targets, a comparison told as stacked cards
 * rather than a table, motion that respects reduced-motion, live prices,
 * and every figure labelled as a worked example. Not linked, not indexed.
 */
const DEPTS = [
  { id: "crm", Icon: Users, en: ["CRM", "Every enquiry lands in one list, with the next step and the date."], hi: ["CRM", "हर पूछताछ एक लिस्ट में, अगले कदम और तारीख़ के साथ।"] },
  { id: "sales", Icon: Briefcase, en: ["Sales", "Quotes, follow-ups and reminders go out on their own."], hi: ["सेल्स", "कोटेशन, फ़ॉलो-अप और रिमाइंडर अपने आप जाते हैं।"] },
  { id: "finance", Icon: Wallet, en: ["Finance", "Invoices, dues and collections on one screen the owner reads."], hi: ["फ़ाइनेंस", "इनवॉइस, बकाया और वसूली एक स्क्रीन पर, जो मालिक पढ़ता है।"] },
  { id: "hr", Icon: BookOpen, en: ["HR", "Attendance, leave and payroll data without the paper."], hi: ["HR", "हाज़िरी, छुट्टी और पेरोल का डेटा, बिना काग़ज़ के।"] },
  { id: "training", Icon: GraduationCap, en: ["Training", "New staff learn from the same system they will work in."], hi: ["ट्रेनिंग", "नया स्टाफ़ उसी सिस्टम से सीखता है जिसमें काम करेगा।"] },
  { id: "it", Icon: ServerCog, en: ["IT and support", "Backups, logins and a help desk, run for you."], hi: ["IT और सपोर्ट", "बैकअप, लॉगिन और हेल्प डेस्क, आपके लिए चलाया हुआ।"] },
] as const;

const PER_TOOL = [1500, 3000, 5000];

export default function Sample() {
  const { i18n } = useTranslation();
  const hi = i18n.language.startsWith("hi");
  const reduced = useReducedMotion();
  const cfg = useSiteConfig();
  const pricing = usePricing();
  const money = useMoney();
  const [mode, setMode] = useState<"today" | "goluq">("today");
  const [tools, setTools] = useState(6);
  const [perTool, setPerTool] = useState(3000);
  const monthly = tools * perTool;
  const office = pricing.find((p) => p.id === "whatsappOffice");
  const managed = pricing.find((p) => p.id === "officeManaged");
  const wa = cfg?.whatsapp || "";
  const waText = encodeURIComponent(hi ? "नमस्ते GoLuQ, छह सॉफ़्टवेयर की जगह एक सिस्टम के बारे में पूछना है" : "Hi GoLuQ, asking about one system instead of six software");

  useEffect(() => {
    document.title = hi ? "नमूना पेज · GoLuQ.com" : "Sample page · GoLuQ.com";
    let m = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!m) { m = document.createElement("meta"); m.name = "robots"; document.head.appendChild(m); }
    m.content = "noindex, nofollow";
    return () => { document.title = "GoLuQ.com"; m?.remove(); };
  }, [hi]);

  const fade = useMemo(() => (i: number) => reduced ? {} : { initial: { opacity: 0, y: 14 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-40px" }, transition: { duration: 0.35, delay: i * 0.06 } }, [reduced]);

  return (
    <div className="min-h-dvh pb-24 sm:pb-0">
      <TopBar showBack={false} onBack={() => {}} />
      <p className="mx-auto max-w-6xl px-5 pt-4 text-sm text-muted sm:px-8">
        <span className="rounded-full bg-warn/15 px-2.5 py-1 font-semibold text-warn">{hi ? "नमूना" : "Sample"}</span>{" "}
        {hi ? "ऑल-इन-वन थीम का डिज़ाइन ड्राफ़्ट। साइट से लिंक नहीं, सर्च में नहीं।" : "A design draft of the all-in-one theme. Not linked from the site, not in search."}
      </p>

      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* 1 · One question, one switch */}
        <section className="pt-8 sm:pt-14" aria-labelledby="s-title">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-luq">{hi ? "ऑल-इन-वन" : "All-in-one"}</p>
          <h1 id="s-title" className="mt-2 max-w-3xl text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">
            {hi ? "छह सॉफ़्टवेयर का किराया क्यों?" : "Why pay for six software?"}
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-muted">
            {hi ? "CRM, सेल्स, फ़ाइनेंस, HR, ट्रेनिंग, IT और सपोर्ट: छह लॉगिन, छह इनवॉइस, और कोई किसी से बात नहीं करता। एक सिस्टम, आपके काम के हिसाब से बना, आपका।" : "CRM, sales, finance, HR, training, IT and support: six logins, six invoices, and none of them talk. One system, built for how you work, yours."}
          </p>

          <div role="tablist" aria-label={hi ? "आज या GoLuQ के साथ" : "Today or with GoLuQ"} className="mt-6 inline-flex rounded-full border border-hairline/20 bg-panel/60 p-1">
            {(["today", "goluq"] as const).map((m) => (
              <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`min-h-11 rounded-full px-5 text-base font-bold transition-colors duration-200 ${mode === m ? "bg-fg text-[rgb(var(--c-base))]" : "text-muted hover:text-fg"}`}>
                {m === "today" ? (hi ? "आज" : "Today") : (hi ? "GoLuQ के साथ" : "With GoLuQ")}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {mode === "today" ? (
              DEPTS.map((d, i) => (
                <motion.div key={d.id} layout {...fade(i)} className="flex items-center gap-3 rounded-2xl border border-hairline/15 bg-panel/40 p-4">
                  <d.Icon size={22} className="shrink-0 text-muted" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-fg">{hi ? d.hi[0] : d.en[0]}</p>
                    <p className="text-sm text-muted">{hi ? "अलग लॉगिन · सालाना रिन्यूअल · प्रति यूज़र" : "Own login · yearly renewal · per user"}</p>
                  </div>
                  <span className="rounded-full bg-danger/10 px-2.5 py-1 text-xs font-bold text-danger">{hi ? "किराया" : "rent"}</span>
                </motion.div>
              ))
            ) : (
              <motion.div layout {...fade(0)} className="rounded-3xl border border-brand-luq/40 bg-brand-luq/5 p-5 sm:col-span-2">
                <p className="font-display text-xl font-bold text-fg">{hi ? "एक सिस्टम। एक लॉगिन। आपका।" : "One system. One login. Yours."}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {DEPTS.map((d) => (
                    <span key={d.id} className="inline-flex items-center gap-1.5 rounded-full bg-panel/70 px-3 py-1.5 text-sm font-semibold text-fg ring-1 ring-hairline/15"><d.Icon size={14} className="text-brand-luq" aria-hidden />{hi ? d.hi[0] : d.en[0]}</span>
                  ))}
                </div>
                <p className="mt-3 text-sm text-muted">{hi ? "तय कीमत लिखकर · कोई प्रति-यूज़र फ़ीस नहीं · कोड और डेटा आपका" : "Fixed price in writing · no per-user fees · the code and the data are yours"}</p>
              </motion.div>
            )}
          </div>
        </section>

        {/* 2 · The rent, added up: a worked example the visitor can change */}
        <section className="mt-14 rounded-3xl border border-hairline/15 bg-panel/40 p-5 sm:p-8" aria-labelledby="calc-title">
          <h2 id="calc-title" className="font-display text-2xl font-bold text-fg sm:text-3xl">{hi ? "किराया जोड़कर देखिए" : "The rent, added up"}</h2>
          <p className="mt-1 text-sm text-muted">{hi ? "एक उदाहरण। अपने आँकड़े लगाइए।" : "A worked example. Put in your own numbers."}</p>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-fg">{hi ? "कितने सॉफ़्टवेयर किराए पर हैं" : "How many software you rent"}</p>
                <div className="mt-2 inline-flex items-center rounded-full border border-hairline/20 bg-panel/60">
                  <button aria-label={hi ? "एक कम" : "One fewer"} onClick={() => setTools((t) => Math.max(2, t - 1))} className="grid h-11 w-11 place-items-center rounded-full text-fg transition-colors hover:bg-panel"><Minus size={18} /></button>
                  <span className="w-12 text-center font-display text-2xl font-bold text-fg" aria-live="polite">{tools}</span>
                  <button aria-label={hi ? "एक और" : "One more"} onClick={() => setTools((t) => Math.min(10, t + 1))} className="grid h-11 w-11 place-items-center rounded-full text-fg transition-colors hover:bg-panel"><Plus size={18} /></button>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-fg">{hi ? "हर एक का महीना, कहिए" : "Say each one costs, a month"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PER_TOOL.map((v) => (
                    <button key={v} aria-pressed={perTool === v} onClick={() => setPerTool(v)} className={`min-h-11 rounded-full px-4 text-base font-bold transition-colors duration-200 ${perTool === v ? "bg-fg text-[rgb(var(--c-base))]" : "border border-hairline/20 text-fg hover:bg-panel"}`}>{money(v)}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[[hi ? "महीना" : "A month", monthly], [hi ? "साल" : "A year", monthly * 12], [hi ? "पाँच साल" : "Five years", monthly * 60]].map(([label, v], i) => (
                <motion.div key={String(label)} {...fade(i)} className={`rounded-2xl p-4 ${i === 2 ? "bg-danger/10 ring-1 ring-danger/30" : "bg-panel/60 ring-1 ring-hairline/10"}`}>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
                  <p className={`mt-1 whitespace-nowrap font-display text-[clamp(15px,4.4vw,24px)] font-bold tabular-nums ${i === 2 ? "text-danger" : "text-fg"}`}>{money(Number(v))}</p>
                  {i === 2 && <p className="mt-1 text-xs text-muted">{hi ? "और आपका कुछ नहीं" : "and nothing is yours"}</p>}
                </motion.div>
              ))}
              <div className="col-span-3 rounded-2xl border border-brand-luq/30 bg-brand-luq/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-luq">{hi ? "GoLuQ के साथ" : "With GoLuQ"}</p>
                <p className="mt-1 text-[15px] text-fg">
                  {hi ? "एक तय कीमत, लिखकर, एक बार।" : "One fixed price, in writing, once."}
                  {office && <> {hi ? "WhatsApp Office से शुरू" : "The WhatsApp Office starts at"} <b>{money(office.offer ?? office.from)}</b></>}
                  {managed && <>{hi ? "; चलाना" : "; run for you"} <b>{money(managed.offer ?? managed.from)}</b>/{hi ? "महीना" : "month"}</>}.
                </p>
                <p className="mt-1 text-sm text-muted">{hi ? "पूरा ऑल-इन-वन: लिखित प्लान के बाद तय कोट।" : "The full all-in-one: a fixed quote after the written plan."}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3 · The six departments, one line each */}
        <section className="mt-14" aria-labelledby="dept-title">
          <h2 id="dept-title" className="font-display text-2xl font-bold text-fg sm:text-3xl">{hi ? "एक सिस्टम में क्या-क्या" : "What runs in the one system"}</h2>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DEPTS.map((d, i) => (
              <motion.article key={d.id} {...fade(i)} className="rounded-2xl border border-hairline/15 bg-panel/40 p-5 transition-colors duration-200 hover:border-brand-luq/50">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-luq/12 text-brand-luq"><d.Icon size={22} aria-hidden /></span>
                <h3 className="mt-3 text-lg font-bold text-fg">{hi ? d.hi[0] : d.en[0]}</h3>
                <p className="mt-1 text-[15px] leading-snug text-muted">{hi ? d.hi[1] : d.en[1]}</p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* 4 · The story, once */}
        <section className="mt-14">
          <FilmGrid cols={2} heading={hi ? "छह किराए, या एक जो आपका हो" : "Six rents, or one that is yours"} note={hi ? "एक मालिक की कहानी। आँकड़े उदाहरण हैं।" : "One owner's story. The figures are a worked example."} films={[{ media: "aiostory", title: hi ? "छह सॉफ़्टवेयर जो आपस में बात नहीं करते" : "Six software that do not talk to each other", sub: hi ? "और एक सिस्टम जो कंपनी के लिए बना।" : "And one system built for the company.", len: "1:43" }]} />
        </section>

        {/* 5 · The ask */}
        <section className="mt-14 rounded-3xl bg-[#0B1020] p-6 text-white ring-1 ring-white/10 sm:p-10">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">{hi ? "अपने छह गिनाइए। हम एक का प्लान लिखकर देंगे।" : "Name your six. We write the plan for one."}</h2>
          <p className="mt-2 max-w-2xl text-[15px] text-white/70">{hi ? "तीस मिनट की बात, फिर लिखित प्लान और कीमत। कोई काम शुरू नहीं होता जब तक आप हाँ न कहें।" : "A thirty-minute talk, then the plan and the price in writing. Nothing starts until you say yes."}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/start?business=allinone" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-5 text-base font-bold text-[#0B1020] transition-colors hover:bg-[#22D3EE]">{hi ? "अपनी ज़रूरत बताइए" : "Tell us your need"} <ArrowRight size={18} /></Link>
            {wa && <a href={`https://wa.me/${wa}?text=${waText}`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#25D366]/15 px-5 text-base font-bold text-[#25D366] ring-1 ring-[#25D366]/40 transition-colors hover:bg-[#25D366]/25"><MessageCircle size={18} /> WhatsApp</a>}
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-white/50"><Banknote size={16} aria-hidden /> {hi ? "कीमतें लाइव हैं, बदल सकती हैं। उदाहरण के आँकड़े उदाहरण ही हैं।" : "Prices are live and can change. Example figures are examples."}</p>
        </section>
      </main>

      {/* Phone only: the ask stays within a thumb's reach */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline/15 bg-[rgb(var(--c-base))]/90 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur sm:hidden">
        <div className="flex gap-3">
          <Link to="/start?business=allinone" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-fg text-base font-bold text-[rgb(var(--c-base))]">{hi ? "प्लान माँगिए" : "Get the plan"} <ArrowRight size={18} /></Link>
          {wa && <a href={`https://wa.me/${wa}?text=${waText}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="grid h-12 w-12 place-items-center rounded-full bg-[#25D366]/15 text-[#25D366] ring-1 ring-[#25D366]/40"><Headset size={20} /></a>}
        </div>
      </div>
    </div>
  );
}
