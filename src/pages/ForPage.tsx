import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, MessageCircle, CheckCircle2 } from "lucide-react";
import { TopBar } from "../components/TopBar";
import { FilmGrid } from "../components/FilmGrid";
import { useSiteConfig, usePricing, useMoney } from "../lib/siteConfig";
import data from "../data/forPages.json";

/**
 * /for/<industry>/<city> — one page per industry and city, for the searches
 * an owner actually types ("software for coaching institutes in Indore").
 * Everything on it already exists elsewhere: the card, the film, the three
 * promises, the live price and the plan button. What is new is the words a
 * search engine needs: the industry, the city, three pains in that trade.
 */
type Industry = (typeof data.industries)[number];
type City = (typeof data.cities)[number];

export default function ForPage() {
  const { industry: iSlug, city: cSlug } = useParams();
  const { i18n } = useTranslation();
  const hi = i18n.language.startsWith("hi");
  const L = hi ? "hi" : "en";
  const cfg = useSiteConfig();
  const pricing = usePricing();
  const money = useMoney();
  const ind = data.industries.find((x) => x.slug === iSlug) as Industry | undefined;
  const city = data.cities.find((x) => x.slug === cSlug) as City | undefined;

  useEffect(() => {
    if (!ind) return;
    const where = city ? ` ${hi ? "में" : "in"} ${city[L]}` : "";
    const title = hi ? `${ind.hi.title}${where} · GoLuQ.com` : `${ind.en.title}${where} · GoLuQ.com`;
    document.title = title;
    let m = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
    m.content = hi
      ? `${ind.hi.name}${where} के लिए WhatsApp सिस्टम, बिलिंग, रिमाइंडर और मालिक की स्क्रीन। तय कीमत लिखकर, हफ़्तों में, कोड आपका। आज लिखित प्लान।`
      : `WhatsApp systems, billing, reminders and the owner's screen for ${ind.en.name}${where}. Fixed price in writing, weeks not months, you own the code. Written plan today.`;
    let c = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!c) { c = document.createElement("link"); c.rel = "canonical"; document.head.appendChild(c); }
    c.href = `https://goluq.com/for/${ind.slug}${city ? `/${city.slug}` : ""}`;
    return () => { document.title = "GoLuQ.com"; };
  }, [ind, city, hi, L]);

  if (!ind) return <div className="min-h-dvh"><TopBar showBack={false} onBack={() => {}} /><main className="mx-auto max-w-3xl px-5 py-20 text-muted">{hi ? "यह पेज नहीं मिला।" : "That page does not exist."} <Link to="/solutions" className="font-semibold text-brand-luq">{hi ? "समाधान देखिए" : "See solutions"}</Link></main></div>;

  const t = ind[L];
  const cityName = city ? city[L] : "";
  const office = pricing.find((p) => p.id === "whatsappOffice");
  const managed = pricing.find((p) => p.id === "officeManaged");
  const wa = cfg?.whatsapp || "";
  const start = `/start?business=${ind.business}${city ? `&city=${city.slug}` : ""}`;
  const promises = hi
    ? [["आपका नंबर, आपके ग्राहक", "हर चैट बिज़नेस के WhatsApp नंबर पर, सेल्समैन के फ़ोन पर नहीं।"], ["तय कीमत, लिखकर", "काम शुरू होने से पहले प्लान और कीमत लिखित में।"], ["कोड और डेटा आपका", "हफ़्तों में बना, आपके लिए चलाया हुआ, कभी भी सब लेकर जा सकते हैं।"]]
    : [["Your number, your customers", "Every chat on the business WhatsApp number, not a salesman's phone."], ["Fixed price, in writing", "The plan and the price before any work starts."], ["Your code, your data", "Built in weeks, run for you, and you can leave any time with everything."]];

  return (
    <div className="min-h-dvh">
      <TopBar showBack={false} onBack={() => {}} />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-6 sm:px-8 sm:pt-10">
        <p className="text-base font-semibold text-brand-luq">{hi ? "समाधान" : "Solutions"} · {t.name}{city ? ` · ${cityName}` : ""}</p>
        <h1 className="mt-2 max-w-3xl text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">
          <span className="text-gradient-accent">{t.title}{city ? (hi ? ` ${cityName} में` : ` in ${cityName}`) : ""}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">
          {hi
            ? `${cityName ? cityName + " के " : ""}${t.name} के लिए बना: WhatsApp पर जवाब, बुकिंग और रिमाइंडर, बिलिंग, और मालिक की एक स्क्रीन। आपके काम के हिसाब से, हिंदी या अंग्रेज़ी में।`
            : `Built for ${t.name}${cityName ? " in " + cityName : ""}: replies, bookings and reminders on WhatsApp, billing, and one screen for the owner. Shaped to how you work, in Hindi or English.`}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={start} className="inline-flex items-center gap-2 rounded-full bg-fg px-5 py-3 text-base font-bold text-[rgb(var(--c-base))]">{hi ? "अपनी ज़रूरत बताइए" : "Tell us your need"} <ArrowRight size={18} /></Link>
          {wa && <a href={`https://wa.me/${wa}?text=${encodeURIComponent(hi ? `नमस्ते GoLuQ, ${t.name}${cityName ? ", " + cityName : ""} के लिए पूछना है` : `Hi GoLuQ, asking for ${t.name}${cityName ? " in " + cityName : ""}`)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-success/15 px-5 py-3 text-base font-bold text-success ring-1 ring-success/30"><MessageCircle size={18} /> WhatsApp</a>}
        </div>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <img src={`/catalog/${hi ? "hi/" : ""}${ind.card}.jpg`} alt={t.title} loading="lazy" className="w-full rounded-2xl border border-hairline/15" />
          <div>
            <h2 className="font-display text-2xl font-bold text-fg">{hi ? "आज क्या होता है" : "What happens today"}</h2>
            <ul className="mt-3 space-y-2">
              {t.pains.map((p) => <li key={p} className="flex items-start gap-2 text-[15px] text-muted"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#EA580C]" />{p}</li>)}
            </ul>
            <h2 className="mt-7 font-display text-2xl font-bold text-fg">{hi ? "GoLuQ के साथ" : "With GoLuQ"}</h2>
            <ul className="mt-3 space-y-3">
              {promises.map(([h, p]) => <li key={h} className="flex items-start gap-2.5"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand-luq" /><span><span className="font-semibold text-fg">{h}</span> <span className="text-muted">{p}</span></span></li>)}
            </ul>
            {(office || managed) && (
              <p className="mt-6 rounded-2xl border border-brand-luq/25 bg-brand-luq/5 p-4 text-[15px] text-fg">
                {office && <>{hi ? "WhatsApp Office, सेटअप" : "WhatsApp Office, set up"}: <b>{money(office.offer ?? office.from)}</b></>}
                {managed && <>{office ? " · " : ""}{hi ? "चलाना" : "run for you"}: <b>{money(managed.offer ?? managed.from)}</b>/{hi ? "महीना" : "month"}</>}
                <span className="block text-sm text-muted">{hi ? "कस्टम सॉफ़्टवेयर: लिखित प्लान के बाद तय कीमत।" : "Custom software: a fixed quote after the written plan."}</span>
              </p>
            )}
          </div>
        </section>

        {ind.film && (
          <section className="mt-12">
            <FilmGrid cols={2} heading={hi ? "नब्बे सेकंड की कहानी" : "The ninety-second story"} note={hi ? "आँकड़े उदाहरण हैं।" : "The figures are a worked example."} films={[{ media: ind.film, title: t.title, sub: hi ? "एक मालिक की कहानी, क्या बदलता है।" : "One owner's story: what changes." }]} />
          </section>
        )}

        <section className="mt-12">
          <h2 className="font-display text-xl font-bold text-fg">{hi ? "अन्य शहर" : "Other cities"}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.cities.filter((c) => c.slug !== city?.slug).map((c) => <Link key={c.slug} to={`/for/${ind.slug}/${c.slug}`} className="rounded-full border border-hairline/25 px-3 py-1.5 text-sm text-muted hover:text-fg">{c[L]}</Link>)}
          </div>
          <h2 className="mt-6 font-display text-xl font-bold text-fg">{hi ? "अन्य बिज़नेस" : "Other businesses"}{city ? ` · ${cityName}` : ""}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.industries.filter((x) => x.slug !== ind.slug).map((x) => <Link key={x.slug} to={`/for/${x.slug}${city ? `/${city.slug}` : ""}`} className="rounded-full border border-hairline/25 px-3 py-1.5 text-sm text-muted hover:text-fg">{x[L].name}</Link>)}
          </div>
        </section>
      </main>
    </div>
  );
}
