import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MessageCircle, Send, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TopBar } from "../components/TopBar";
import { StoryChapters } from "../components/story/StoryChapters";
import { ProductsBand } from "../components/ProductsBand";
import { Testimonials } from "../components/Testimonials";
import { SiteFooter } from "../components/SiteFooter";
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
  const { t } = useTranslation();
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
      </section>

      <StoryChapters />

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <ProductsBand />
      </section>

      {/* Customer stories — the space is reserved even while the first video is being recorded. */}
      <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8 sm:pb-24" aria-labelledby="stories-title">
        <p className="font-mono text-sm uppercase tracking-[0.28em] text-brand-luq">{t("story.stories.kicker")}</p>
        <h2 id="stories-title" className="mt-2 font-display text-2xl font-bold sm:text-4xl">{t("story.stories.title")}</h2>
        <Testimonials className="mt-6" />
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-dashed border-hairline/25 p-5 text-sm text-muted">
          <Video size={18} className="shrink-0 text-brand-luq" /> {t("story.stories.soon")}
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

      <SiteFooter />
    </div>
  );
}
