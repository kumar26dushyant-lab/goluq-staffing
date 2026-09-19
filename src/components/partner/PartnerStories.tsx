import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Play } from "lucide-react";

/**
 * The two partner story films on the partner page: an advisor who opens a
 * partner office, and a CA firm that becomes the one-stop. Voice follows the
 * site language; nothing loads until play. Figures inside are worked
 * examples, and the films say so.
 */
const STORIES = ["adv", "cap"] as const;
type Id = (typeof STORIES)[number];
const V = "1";

export function PartnerStories() {
  const { i18n } = useTranslation();
  const hi = i18n.language.startsWith("hi");
  const lang = hi ? "hi" : "en";
  const [id, setId] = useState<Id>("adv");
  const T = {
    adv: hi ? ["एक सलाहकार जो पार्टनर बना", "रोहन बीस मालिकों को हफ़्ते में मिलता है। उसने मिलवाया; अब हर ऑर्डर और हर महीने उसकी कमाई।"] : ["An advisor who partners", "Rohan sees twenty owners a week. He introduced; now he earns on every order and every month."],
    cap: hi ? ["एक CA फ़र्म जो पार्टनर बनी", "अंजलि के 150 क्लाइंट वही सवाल पूछते थे। अब उनकी फ़र्म के पास जवाब है, और एक दूसरी आमदनी।"] : ["A CA firm that partners", "Anjali's 150 clients kept asking the same question. Now her firm has the answer, and a second income."],
  };
  return (
    <section className="mt-6 overflow-hidden rounded-3xl bg-[#0B1020] text-white ring-1 ring-white/10">
      <video key={`${id}-${lang}`} controls playsInline preload="none" poster={`/media/ceo-${id}-${lang}-poster.jpg?v=${V}`} className="aspect-video w-full bg-black">
        <source src={`/media/ceo-${id}-${lang}.mp4?v=${V}`} type="video/mp4" />
      </video>
      <div className="grid gap-2 p-4 sm:grid-cols-2">
        {STORIES.map((s) => (
          <button key={s} type="button" onClick={() => setId(s)}
            className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition ${s === id ? "border-[#22D3EE]/70 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[#0B1020]"><Play size={14} className="ml-0.5" /></span>
            <span className="min-w-0">
              <span className="block text-[15px] font-bold">{T[s][0]}</span>
              <span className="block text-sm text-white/65">{T[s][1]}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="px-4 pb-4 text-xs text-white/50">{hi ? "आँकड़े उदाहरण हैं; सटीक शर्तें साइन-अप के बाद 30 मिनट की कॉल पर तय होती हैं।" : "Figures are worked examples; exact terms are agreed on a 30-minute call after sign-up."}</p>
    </section>
  );
}
