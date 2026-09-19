import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Play, Volume2 } from "lucide-react";

/**
 * The homepage's eye-catcher: the "Become the CEO of your business" story
 * videos, right under the headline.
 *
 * A silent 16-second montage of the chosen story loops on its own (small,
 * muted, so every browser allows it); one tap swaps in the full film with
 * its voice-over. Thumbnails switch the story. Nothing heavy loads until a
 * person asks for it: the montage is ~150 KB, the film only on play.
 */
const STORIES = ["coach", "dist", "ca"] as const;
type StoryId = (typeof STORIES)[number];
/** Bump when a film is re-cut: the edge caches by URL. */
const V = "1";

export function StorySpotlight() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("hi") ? "hi" : "en";
  const [story, setStory] = useState<StoryId>("coach");
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  // Switching story or language goes back to the silent loop.
  useEffect(() => { setPlaying(false); }, [story, lang]);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.load();
    if (playing) { v.muted = false; v.play().catch(() => setPlaying(false)); }
    else { v.muted = true; v.play().catch(() => { /* poster stays */ }); }
  }, [playing, story, lang]);

  const src = playing ? `/media/ceo-${story}-${lang}.mp4?v=${V}` : `/media/preview-ceo-${story}-${lang}.mp4?v=${V}`;
  const poster = `/media/ceo-${story}-${lang}-poster.jpg?v=${V}`;

  return (
    <section aria-labelledby="spot-title" className="mx-auto max-w-6xl px-5 pb-10 sm:px-8 lg:pb-14">
      <div className="overflow-hidden rounded-3xl bg-[#0B1020] text-white shadow-2xl shadow-black/20 ring-1 ring-white/10">
        <div className="grid lg:grid-cols-[1.35fr_1fr]">
          {/* The film */}
          <div className="relative bg-black">
            <video
              ref={ref}
              key={`${story}-${lang}-${playing ? "full" : "loop"}`}
              poster={poster}
              playsInline
              loop={!playing}
              controls={playing}
              preload={playing ? "auto" : "metadata"}
              onEnded={() => setPlaying(false)}
              className="aspect-video w-full object-cover"
            >
              <source src={src} type="video/mp4" />
            </video>
            {!playing && (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="group absolute inset-0 grid place-items-center bg-gradient-to-t from-black/60 via-black/10 to-black/20 text-white"
                aria-label={t("story.spot.watch")}
              >
                <span className="flex items-center gap-3 rounded-full bg-white/95 px-5 py-3 text-base font-bold text-[#0B1020] shadow-xl transition group-hover:scale-105 sm:text-lg">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0B1020] text-white"><Play size={18} className="ml-0.5" /></span>
                  {t("story.spot.watch")} · 1:20
                </span>
                <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#22D3EE] backdrop-blur">{t("story.spot.example")}</span>
              </button>
            )}
          </div>

          {/* The words and the other stories */}
          <div className="flex flex-col justify-between p-5 sm:p-7">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#22D3EE]">{t("story.spot.kicker")}</p>
              <h2 id="spot-title" className="mt-2 font-display text-2xl font-bold leading-tight sm:text-3xl">{t("story.spot.title")}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-white/70">{t("story.spot.sub")}</p>
            </div>
            <div className="mt-5 grid gap-2">
              {STORIES.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStory(id)}
                  className={`flex items-center gap-3 rounded-2xl border p-2 text-left transition ${id === story ? "border-[#22D3EE]/70 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                >
                  <img src={`/media/ceo-${id}-${lang}-poster.jpg?v=${V}`} alt="" loading="lazy" className="h-14 w-24 shrink-0 rounded-lg object-cover" />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-bold">{t(`story.spot.${id}`)}</span>
                    <span className="block truncate text-sm text-white/65">{t(`story.spot.${id}Hook`)}</span>
                  </span>
                  {id === story && <Volume2 size={16} className="ml-auto shrink-0 text-[#22D3EE]" />}
                </button>
              ))}
            </div>
            <Link to="/ceo" className="mt-4 inline-flex items-center gap-2 self-start rounded-full bg-white px-4 py-2.5 text-sm font-bold text-[#0B1020] transition hover:bg-[#22D3EE]">
              {t("story.spot.all")} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
