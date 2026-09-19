import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarClock, MessageCircle, PenLine, Send, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { StoryChapters } from "../components/story/StoryChapters";
import { StorySpotlight } from "../components/story/StorySpotlight";
import { ProductsBand } from "../components/ProductsBand";
import { useSiteConfig } from "../lib/siteConfig";
import { useRegion } from "../lib/region";

/**
 * The homepage as a story — currently at /preview while the owner reviews it.
 *
 * Order of the page is the order of a decision: feel the problem (chapters),
 * see the thing that fixes it (products, live-priced), hear it from someone
 * who bought (stories), meet the person (founder), act.
 */
export function StoryHome() {
  const { t, i18n } = useTranslation();
  const reduced = useReducedMotion();
  const cfg = useSiteConfig();
  const wa = cfg?.whatsapp || "";
  const tg = cfg?.telegram || "";
  const region = useRegion();
  const telegramFirst = region === "cis";

  // The region-forced preview must not be indexed; chapters snap like a reel.
  useEffect(() => {
    const isPreview = window.location.pathname.startsWith("/preview");
    const meta = document.createElement("meta");
    if (isPreview) {
      meta.name = "robots";
      meta.content = "noindex, nofollow";
      document.head.appendChild(meta);
    }
    const prev = document.documentElement.style.scrollSnapType;
    document.documentElement.style.scrollSnapType = "y proximity";
    return () => {
      meta.remove();
      document.documentElement.style.scrollSnapType = prev;
    };
  }, []);

  return (
    <div className="relative">
      <TopBar showBack={false} onBack={() => {}} />

      {/* One breath before the story: the promise, then straight in. */}
      <section className="mx-auto max-w-6xl px-5 pb-8 pt-8 sm:px-8 lg:pb-12 lg:pt-14">
        <motion.p
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-base font-semibold text-brand-luq sm:text-lg"
        >
          {t(`story.regions.${region}.kicker`, { defaultValue: t("story.kicker") })}
        </motion.p>
        <motion.h1
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-3 max-w-3xl text-balance font-display text-4xl font-bold leading-[1.04] sm:text-6xl"
        >
          <span className="text-gradient-accent">{t("story.title")}</span>
        </motion.h1>
        <motion.p
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mt-4 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl"
        >
          {t("story.sub")}
        </motion.p>
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
          className="mt-6 flex flex-wrap gap-3"
        >
          <Link to="/start"
            className="inline-flex items-center gap-2 rounded-full bg-fg px-5 py-3 text-base font-bold text-[rgb(var(--c-base))] shadow-lg">
            <PenLine size={18} /> {t("story.start")}
          </Link>
          {cfg?.bookingUrl && (
            <a href={cfg.bookingUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-hairline/30 px-5 py-3 text-base font-bold text-fg">
              <CalendarClock size={18} /> {t("story.book")}
            </a>
          )}
          {wa && (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-success/15 px-5 py-3 text-base font-bold text-success ring-1 ring-success/30">
              <MessageCircle size={18} /> {t("story.founder.cta")}
            </a>
          )}
        </motion.div>
      </section>

      {/* The eye-catcher: the ninety-second stories, before the chapters. */}
      <StorySpotlight />

      <StoryChapters />

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <ProductsBand />
      </section>

      {/* Already built, already running — the proof, in the owner's own products. */}
      <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8 sm:pb-24" aria-labelledby="built-title">
        <p className="font-mono text-sm uppercase tracking-[0.28em] text-brand-luq">{t("products.kicker")}</p>
        <h2 id="built-title" className="mt-2 font-display text-2xl font-bold sm:text-4xl">{t("products.title")}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {([["nidaan", "https://nidaanpartner.com", "for_ca"], ["sarathi", "https://sarathi-ai.com", "dept_crm"], ["eagleeye", "https://eagleeye.work", "dept_dashboard"]] as const).map(([key, url, card]) => (
            <a key={key} href={url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-3xl border border-hairline/15 bg-panel/40 transition hover:border-brand-luq/50">
              <img src={`/catalog/${card}.jpg`} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover object-top" />
              <div className="p-5">
                <p className="font-display text-xl font-bold text-fg">{t(`products.${key}.name`)}{key === "eagleeye" ? <span className="ml-2 rounded-full bg-brand-luq/15 px-2 py-0.5 text-xs font-semibold text-brand-luq">prototype</span> : null}</p>
                <p className="mt-2 text-base text-muted">{t(`products.${key}.desc`)}</p>
                <p className="mt-3 text-sm font-semibold text-brand-luq">{t("products.visit")} →</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* The ninety-second stories live on /ceo; here, one row of doors to them. */}
      <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8 sm:pb-24" aria-labelledby="ceo-strip-title">
        <div className="overflow-hidden rounded-3xl bg-[#0B1020] text-white ring-1 ring-white/10">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#22D3EE]">{t("story.ceoStrip.kicker")}</p>
              <h2 id="ceo-strip-title" className="mt-2 font-display text-2xl font-bold sm:text-3xl">{t("story.ceoStrip.title")}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-white/70">{t("story.ceoStrip.sub")}</p>
              <Link to="/ceo" className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-base font-bold text-[#0B1020] transition hover:bg-[#22D3EE]"><Video size={18} /> {t("story.ceoStrip.cta")}</Link>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {(["coach", "dist", "adv"] as const).map((id) => (
                <Link key={id} to="/ceo" className="group overflow-hidden rounded-2xl border border-white/10">
                  <img src={`/media/ceo-${id}-${i18n.language.startsWith("hi") ? "hi" : "en"}-poster.jpg?v=1`} alt="" loading="lazy" className="aspect-video w-full object-cover transition group-hover:scale-105" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust, before the ask. */}
      <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8 sm:pb-24">
        <div className="rounded-3xl border border-brand-luq/25 bg-brand-luq/5 p-6 sm:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-brand-luq">{t("story.secure.kicker")}</p>
          <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{t("story.secure.title")}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {(["one", "two", "three"] as const).map((k) => (
              <div key={k} className="rounded-2xl bg-[rgb(var(--c-base))]/70 p-4">
                <p className="font-semibold text-fg">{t(`story.secure.${k}`)}</p>
                <p className="mt-1 text-sm text-muted">{t(`story.secure.${k}Sub`)}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link to="/security" className="inline-flex items-center gap-2 rounded-full bg-fg px-5 py-3 text-base font-bold text-[rgb(var(--c-base))]">{t("story.secure.cta")}</Link>
            <Link to="/security#video" className="inline-flex items-center gap-2 rounded-full border border-hairline/30 px-5 py-3 text-base font-semibold text-fg">{t("story.secure.watch")}</Link>
          </div>
        </div>
      </section>

      {/* Partners: the other door, for people who know owners. */}
      <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8 sm:pb-24">
        <div className="grid gap-6 rounded-3xl border border-hairline/15 bg-panel/40 p-6 sm:p-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-brand-luq">{t("story.partnerStrip.kicker")}</p>
            <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{t("story.partnerStrip.title")}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{t("story.partnerStrip.sub")}</p>
            <Link to="/partner" className="mt-5 inline-flex items-center gap-2 rounded-full bg-fg px-5 py-3 text-base font-bold text-[rgb(var(--c-base))]">{t("story.partnerStrip.cta")}</Link>
          </div>
          <Link to="/partner" className="group overflow-hidden rounded-2xl border border-hairline/15">
            <img src={`/catalog/${i18n.language.startsWith("hi") ? "hi/" : ""}aff_boss.jpg`} alt="" loading="lazy" className="w-full object-cover transition group-hover:scale-[1.02]" />
          </Link>
        </div>
      </section>

      {/* The human behind it */}
      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="glass grid gap-6 overflow-hidden rounded-3xl sm:grid-cols-[260px_1fr] sm:items-center">
          <img src="/story/founder.webp" alt="Dushyant Sharma" className="aspect-[4/5] w-full object-cover sm:aspect-auto sm:h-full" loading="lazy" />
          <div className="p-6 sm:p-8">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-brand-luq">{t("story.founder.kicker")}</p>
            <h2 className="mt-2 font-display text-3xl font-bold">Dushyant Sharma</h2>
            <p className="mt-3 max-w-xl text-lg text-muted">{t("story.founder.line")}</p>
            <div className={`mt-6 flex flex-wrap gap-3 ${telegramFirst ? "flex-row-reverse justify-end" : ""}`}>
              {wa && (
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-success/15 px-5 py-3 text-base font-bold text-success ring-1 ring-success/30"
                >
                  <MessageCircle size={18} /> {t("story.founder.cta")}
                </a>
              )}
              {tg && (
                <a
                  href={`https://t.me/${tg}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-brand-blue/15 px-5 py-3 text-base font-bold text-brand-blue ring-1 ring-brand-blue/30"
                >
                  <Send size={18} /> {t("story.founder.ctaTelegram")}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
