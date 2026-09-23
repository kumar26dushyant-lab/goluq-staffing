import { useFilm } from "../lib/videoLang";
import { VideoLangToggle } from "./VideoLangToggle";

/**
 * A row of films, each with its poster until play, in the visitor's film
 * language with one toggle for the row. `media` is the file stem under
 * /media (e.g. "pharm" → /media/pharm-en.mp4, -poster.jpg).
 */
export type Film = { media: string; title: string; sub?: string; len?: string; tag?: string };

export function FilmGrid({ films, heading, note, dark = false, cols = 3, v = "2" }: { films: Film[]; heading?: string; note?: string; dark?: boolean; cols?: 2 | 3; v?: string }) {
  const { lang, setLang, sfx } = useFilm();
  return (
    <section className={dark ? "text-white" : ""}>
      {(heading || note) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {heading && <h2 className={`font-display text-2xl font-bold sm:text-3xl ${dark ? "" : "text-fg"}`}>{heading}</h2>}
            {note && <p className={`mt-1 text-sm ${dark ? "text-white/65" : "text-muted"}`}>{note}</p>}
          </div>
          <VideoLangToggle lang={lang} onChange={setLang} dark={dark} />
        </div>
      )}
      <div className={`mt-5 grid gap-5 sm:grid-cols-2 ${cols === 3 ? "lg:grid-cols-3" : ""}`}>
        {films.map((f) => (
          <figure key={f.media} className={`overflow-hidden rounded-2xl border ${dark ? "border-white/12 bg-white/5" : "border-hairline/15 bg-panel/40"}`}>
            <div className="relative">
              <video key={`${f.media}-${sfx(f.media)}`} data-seq="grid" controls playsInline preload="none" poster={`/media/${f.media}-${sfx(f.media)}-poster.jpg?v=${v}`} className="aspect-video w-full bg-black">
                <source src={`/media/${f.media}-${sfx(f.media)}.mp4?v=${v}`} type="video/mp4" />
              </video>
              {f.len && <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white">{f.len}</span>}
            </div>
            <figcaption className="p-4">
              {f.tag && <p className={`text-xs font-bold uppercase tracking-wide ${dark ? "text-[#22D3EE]" : "text-brand-luq"}`}>{f.tag}</p>}
              <p className={`mt-1 text-lg font-bold ${dark ? "" : "text-fg"}`}>{f.title}</p>
              {f.sub && <p className={`mt-1 text-[15px] leading-snug ${dark ? "text-white/70" : "text-muted"}`}>{f.sub}</p>}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
