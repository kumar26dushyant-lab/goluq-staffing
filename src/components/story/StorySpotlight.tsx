import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSiteConfig } from "../../lib/siteConfig";
import { useFilm } from "../../lib/videoLang";
import { VideoLangToggle } from "../VideoLangToggle";
import { useTranslation } from "react-i18next";
import { ArrowRight, MessageCircle, PenLine, Play, Volume2 } from "lucide-react";

/**
 * The homepage's eye-catcher: the three forty-second theme films (own, not
 * rent · all-in-one · your own business), right under the headline. The
 * ninety-second owner and partner stories live on /ceo, /partner and /build
 * so no story is told twice on one page.
 *
 * A silent 16-second montage of the chosen story loops on its own (small,
 * muted, so every browser allows it); one tap swaps in the full film with
 * its voice-over. Thumbnails switch the story. Nothing heavy loads until a
 * person asks for it: the montage is ~150 KB, the film only on play.
 */
const STORIES = [
  { id: "house", len: "0:43" },
  { id: "aioshort", len: "0:42" },
  { id: "five", len: "0:58" },
] as const;
type StoryId = (typeof STORIES)[number]["id"];
/** Bump when a film is re-cut: the edge caches by URL. */
const V = "1";

export function StorySpotlight() {
  const { t } = useTranslation();
  const { lang, setLang, sfx } = useFilm();
  const [story, setStory] = useState<StoryId>("house");
  const cur = STORIES.find((x) => x.id === story) || STORIES[0];
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  // Set when the story changes because a film ended or the visitor picked
  // another while one was playing: the next one keeps playing with sound.
  const keepPlaying = useRef(false);
  const pick = (id: StoryId) => { if (playing) keepPlaying.current = true; setStory(id); };
  const advance = () => {
    const i = STORIES.findIndex((x) => x.id === story);
    const next = STORIES[(i + 1) % STORIES.length].id;
    keepPlaying.current = true;
    setStory(next);
  };
  const cfg = useSiteConfig();
  const facts = t(`story.spot.facts.${story}`, { returnObjects: true }) as unknown;
  const [today, after, cost] = Array.isArray(facts) ? (facts as string[]) : ["", "", ""];

  // Switching story or language goes back to the silent loop.
  useEffect(() => {
    if (keepPlaying.current) { keepPlaying.current = false; return; }
    setPlaying(false);
  }, [story, lang]);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.load();
    if (playing) { v.muted = false; v.play().catch(() => setPlaying(false)); }
    else { v.muted = true; v.play().catch(() => { /* poster stays */ }); }
  }, [playing, story, lang]);

  const s = sfx(story);
  const src = playing ? `/media/${story}-${s}.mp4?v=${V}` : `/media/preview-${story}-${s}.mp4?v=${V}`;
  const poster = `/media/${story}-${s}-poster.jpg?v=${V}`;

  return (
    <section aria-labelledby="spot-title" className="mx-auto max-w-6xl px-5 pb-10 sm:px-8 lg:pb-14">
      <div className="overflow-hidden rounded-3xl bg-[#0B1020] text-white shadow-2xl shadow-black/20 ring-1 ring-white/10">
        <div className="grid lg:grid-cols-[1.35fr_1fr]">
          {/* The film, and under it the story's own numbers so the column is never empty */}
          <div className="flex flex-col bg-black">
          <div className="relative">
            <video
              ref={ref}
              key={`${story}-${s}-${playing ? "full" : "loop"}`}
              poster={poster}
              playsInline
              loop={!playing}
              controls={playing}
              preload={playing ? "auto" : "metadata"}
              onEnded={() => { if (playing) advance(); }}
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
                  {t("story.spot.watch")} · {cur.len}
                </span>
                <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#22D3EE] backdrop-blur">{t("story.spot.example")}</span>
              </button>
            )}
            <VideoLangToggle lang={lang} onChange={setLang} className="absolute right-4 top-4 z-10" />
          </div>
          <div className="flex flex-1 flex-col justify-between gap-4 bg-gradient-to-b from-[#0F1730] to-[#0B1020] p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {[[t("story.spot.today"), today, "text-white/60"], [t("story.spot.withGoluq"), after, "text-[#22D3EE]"], [t("story.spot.runsFor"), cost, "text-[#F59E0B]"]].map(([label, line, color]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                  <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${color}`}>{label}</p>
                  <p className="mt-1.5 text-[15px] font-semibold leading-snug text-white">{line}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link to="/start" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-[#0B1020] transition hover:bg-[#22D3EE]"><PenLine size={15} /> {t("story.spot.ask")}</Link>
              {cfg?.whatsapp && (
                <a href={`https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(lang === "hi" ? "नमस्ते GoLuQ, कहानी देखी" : "Hi GoLuQ, I watched the story")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#25D366]/15 px-4 py-2.5 text-sm font-bold text-[#25D366] ring-1 ring-[#25D366]/40 transition hover:bg-[#25D366]/25"><MessageCircle size={15} /> {t("story.spot.wa")}</a>
              )}
              <span className="ml-auto text-xs text-white/45">{t("story.spot.example")}</span>
            </div>
          </div>
          </div>

          {/* The words and the other stories */}
          <div className="flex flex-col justify-between p-5 sm:p-7">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#22D3EE]">{t("story.spot.kicker")}</p>
              <h2 id="spot-title" className="mt-2 font-display text-2xl font-bold leading-tight sm:text-3xl">{t("story.spot.title")}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-white/70">{t("story.spot.sub")}</p>
            </div>
            <div className="mt-5 grid gap-2">
              {STORIES.map(({ id, len }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => pick(id)}
                  className={`flex items-center gap-3 rounded-2xl border p-2 text-left transition ${id === story ? "border-[#22D3EE]/70 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                >
                  <span className="relative shrink-0"><img src={`/media/${id}-${sfx(id)}-poster.jpg?v=${V}`} alt="" loading="lazy" className="h-12 w-20 rounded-lg object-cover" /><span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[10px] font-bold">{len}</span></span>
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
