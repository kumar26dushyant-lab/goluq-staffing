import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShieldCheck, Lock, KeyRound, EyeOff, Server, Download, MessageCircle, PlayCircle } from "lucide-react";
import { TopBar } from "../components/TopBar";
import { useSiteConfig } from "../lib/siteConfig";

/**
 * /security — "How we secure your data", in the words a shop owner uses.
 *
 * A trust page, not a feature page: three promises a customer can repeat,
 * then the specifics we actually do (nothing aspirational), a slot for the
 * regional video (script in docs/SECURITY-VIDEO.md; the reel pipeline makes
 * it), and the questions people really ask. No certification is claimed
 * here until the owner confirms the exact credential.
 */
const C = {
  en: {
    kicker: "How we secure your data",
    title: "Your customers stay yours. Your data stays yours.",
    sub: "Plain answers to the question every owner asks before handing us a customer list, a price list or a WhatsApp number.",
    promises: [
      ["Your number, your customers", "Every chat runs on your business WhatsApp number, not on a salesman's phone. When a person leaves, the customers stay with the business."],
      ["Only the people you name can see", "You decide who sees what: the owner sees everything, a salesperson sees their customers, an accountant sees invoices. Nobody else has a login."],
      ["We never sell or share it, and you can leave", "Your data is never sold, rented or used for anyone else. Ask, and you get a full export of everything; we delete our copy."],
    ],
    howTitle: "What we actually do, in every project",
    how: [
      ["Encrypted at rest and in transit", "Disks, backups and every connection are encrypted. A stolen drive or an intercepted connection shows nothing readable."],
      ["Access by role, with a record", "Each person gets a role and a login of their own. Every change is stamped with who did it and when."],
      ["Official platforms only", "WhatsApp runs on Meta's official WhatsApp Business Platform, Telegram on its official Bot API. Every message from those platforms is signature-checked before we act on it."],
      ["Secrets never in code", "Tokens, keys and passwords live in a locked settings store on the server, written once, never displayed again, rotated when needed."],
      ["One door, behind Cloudflare", "Your system sits behind Cloudflare's network with the server closed to everything else. Bots and floods stop at the edge."],
      ["Backups you can ask for", "Nightly encrypted backups, kept for two weeks. You can ask for a copy at any time."],
      ["Your customers' consent respected", "Marketing goes only to people who opted in, at sensible hours, and stops the moment someone says stop. That protects your WhatsApp number's standing with Meta."],
      ["Built to be handed over", "You own the code and the data. If you ever move on, you take both."],
    ],
    videoTitle: "In two minutes, in your language",
    videoSub: "A short story of one owner and one customer, made for your region. Coming to this page first for India, then the Gulf, Australia and New Zealand.",
    faqTitle: "Questions owners ask",
    faq: [
      ["Where is my data stored?", "On a server in Mumbai, India, behind Cloudflare. For customers outside India who need it elsewhere, we agree the location before the build."],
      ["Can my staff see everything?", "No. Each person sees what their role allows. The owner decides the roles."],
      ["What happens if I stop working with you?", "You get a full export of your data and the code you paid for. We delete our copy after you confirm."],
      ["Does anyone at GoLuQ read my customers' chats?", "Only when you ask us to help with a specific conversation, and only the person helping. Never for any other reason."],
      ["Is WhatsApp on the official API safe?", "It is the same infrastructure large banks and airlines use, with a verified business name and messages signed by Meta. It is safer than a phone with the app on it."],
    ],
    cta: "Ask us anything about this on WhatsApp", start: "Tell us what you need",
  },
  hi: {
    kicker: "हम आपका डेटा कैसे सुरक्षित रखते हैं",
    title: "आपके ग्राहक आपके रहते हैं। आपका डेटा आपका रहता है।",
    sub: "हर मालिक जो सवाल ग्राहक सूची, रेट लिस्ट या WhatsApp नंबर देने से पहले पूछता है — उसके सीधे जवाब।",
    promises: [
      ["आपका नंबर, आपके ग्राहक", "हर चैट आपके बिज़नेस WhatsApp नंबर पर चलती है, सेल्समैन के फ़ोन पर नहीं। कोई जाए तो ग्राहक बिज़नेस के साथ रहते हैं।"],
      ["सिर्फ़ वही देख सकें जिन्हें आप कहें", "कौन क्या देखे, आप तय करते हैं: मालिक सब, सेल्समैन अपने ग्राहक, अकाउंटेंट इनवॉइस। और किसी का लॉगिन नहीं।"],
      ["हम कभी बेचते या बाँटते नहीं, और आप जब चाहें जा सकते हैं", "आपका डेटा कभी बेचा, किराए पर दिया या किसी और के लिए इस्तेमाल नहीं होता। माँगिए और पूरा एक्सपोर्ट मिलेगा; हम अपनी कॉपी हटा देंगे।"],
    ],
    howTitle: "हर प्रोजेक्ट में हम असल में क्या करते हैं",
    how: [
      ["सहेजते और भेजते समय एन्क्रिप्टेड", "डिस्क, बैकअप और हर कनेक्शन एन्क्रिप्टेड। चोरी हुई ड्राइव या बीच में पकड़ा कनेक्शन कुछ पढ़ने लायक नहीं देता।"],
      ["भूमिका के हिसाब से पहुँच, रिकॉर्ड के साथ", "हर व्यक्ति की अपनी भूमिका और अपना लॉगिन। हर बदलाव पर दर्ज — किसने, कब।"],
      ["सिर्फ़ आधिकारिक प्लेटफ़ॉर्म", "WhatsApp Meta के आधिकारिक WhatsApp Business Platform पर, Telegram उसके आधिकारिक Bot API पर। उन प्लेटफ़ॉर्म से आया हर संदेश हस्ताक्षर-जाँच के बाद ही माना जाता है।"],
      ["गुप्त कुंजियाँ कभी कोड में नहीं", "टोकन, कुंजियाँ और पासवर्ड सर्वर पर लॉक्ड सेटिंग में — एक बार लिखे, फिर कभी दिखाए नहीं, ज़रूरत पर बदले।"],
      ["एक दरवाज़ा, Cloudflare के पीछे", "आपका सिस्टम Cloudflare के नेटवर्क के पीछे, सर्वर बाकी सबके लिए बंद। बॉट और हमले किनारे पर ही रुक जाते हैं।"],
      ["बैकअप जो आप माँग सकते हैं", "रोज़ रात एन्क्रिप्टेड बैकअप, दो हफ़्ते तक। कॉपी कभी भी माँग सकते हैं।"],
      ["ग्राहकों की सहमति का सम्मान", "मार्केटिंग सिर्फ़ उन्हें जिन्होंने हाँ कहा, सही समय पर, और STOP कहते ही बंद। इससे Meta के पास आपके WhatsApp नंबर की साख बनी रहती है।"],
      ["सौंपने के लिए बना", "कोड और डेटा आपके हैं। कभी आगे बढ़ें तो दोनों साथ ले जाइए।"],
    ],
    videoTitle: "दो मिनट में, आपकी भाषा में",
    videoSub: "एक मालिक और एक ग्राहक की छोटी कहानी, आपके क्षेत्र के लिए बनी। पहले भारत, फिर खाड़ी, ऑस्ट्रेलिया और न्यूज़ीलैंड।",
    faqTitle: "मालिक जो सवाल पूछते हैं",
    faq: [
      ["मेरा डेटा कहाँ रहता है?", "मुंबई, भारत के सर्वर पर, Cloudflare के पीछे। भारत के बाहर के ग्राहकों को कहीं और चाहिए तो निर्माण से पहले जगह तय करते हैं।"],
      ["क्या मेरा स्टाफ़ सब देख सकता है?", "नहीं। हर व्यक्ति उतना ही देखता है जितना उसकी भूमिका में है। भूमिकाएँ मालिक तय करता है।"],
      ["अगर मैं आपके साथ काम बंद कर दूँ?", "पूरा डेटा एक्सपोर्ट और जिस कोड का भुगतान किया, वह आपको मिलता है। आपकी पुष्टि के बाद हम अपनी कॉपी हटा देते हैं।"],
      ["क्या GoLuQ में कोई मेरे ग्राहकों की चैट पढ़ता है?", "सिर्फ़ तब जब आप किसी ख़ास बातचीत में मदद माँगें, और सिर्फ़ मदद करने वाला। किसी और वजह से कभी नहीं।"],
      ["क्या आधिकारिक API पर WhatsApp सुरक्षित है?", "यही इन्फ्रास्ट्रक्चर बड़े बैंक और एयरलाइन इस्तेमाल करते हैं — वेरिफ़ाइड बिज़नेस नाम और Meta के हस्ताक्षर वाले संदेश। ऐप वाले फ़ोन से ज़्यादा सुरक्षित।"],
    ],
    cta: "इस बारे में WhatsApp पर कुछ भी पूछिए", start: "अपनी ज़रूरत बताइए",
  },
};
const ICONS = [Lock, KeyRound, ShieldCheck, EyeOff, Server, Download, MessageCircle, ShieldCheck];

export default function Security() {
  const { i18n } = useTranslation();
  const t = C[i18n.language.startsWith("hi") ? "hi" : "en"];
  const cfg = useSiteConfig();
  return (
    <div className="min-h-dvh">
      <TopBar showBack={false} onBack={() => {}} />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-6 sm:px-8 sm:pt-10">
        <p className="text-base font-semibold text-brand-luq">{t.kicker}</p>
        <h1 className="mt-2 max-w-3xl text-balance font-display text-3xl font-bold leading-tight sm:text-5xl"><span className="text-gradient-accent">{t.title}</span></h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">{t.sub}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {t.promises.map(([h, p], i) => {
            const Icon = [MessageCircle, KeyRound, Download][i];
            return (
              <div key={h} className="rounded-3xl border border-hairline/15 bg-panel/40 p-6">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-luq/15 text-brand-luq"><Icon size={22} /></span>
                <p className="mt-4 font-display text-xl font-bold text-fg">{h}</p>
                <p className="mt-2 text-base leading-relaxed text-muted">{p}</p>
              </div>
            );
          })}
        </div>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold text-fg sm:text-3xl">{t.howTitle}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {t.how.map(([h, p], i) => {
              const Icon = ICONS[i % ICONS.length];
              return (
                <div key={h} className="flex gap-3 rounded-2xl border border-hairline/12 bg-panel/30 p-4">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-luq/12 text-brand-luq"><Icon size={18} /></span>
                  <div><p className="font-semibold text-fg">{h}</p><p className="mt-1 text-sm leading-relaxed text-muted">{p}</p></div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-14 rounded-3xl bg-[#0B1020] p-6 text-white sm:p-10">
          <div className="grid items-center gap-6 md:grid-cols-[1fr_320px]">
            <div>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">{t.videoTitle}</h2>
              <p className="mt-2 text-base text-white/70">{t.videoSub}</p>
            </div>
            <div className="grid aspect-video place-items-center rounded-2xl border border-white/15 bg-white/5 text-white/60"><PlayCircle size={40} /></div>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold text-fg sm:text-3xl">{t.faqTitle}</h2>
          <div className="mt-4 divide-y divide-hairline/12 rounded-2xl border border-hairline/12 bg-panel/30">
            {t.faq.map(([q, a]) => (
              <details key={q} className="group px-5 py-4">
                <summary className="cursor-pointer list-none text-base font-semibold text-fg">{q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          {cfg?.whatsapp && <a href={`https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent("Hi GoLuQ, a question about data security")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-success/15 px-5 py-3 text-base font-bold text-success ring-1 ring-success/30"><MessageCircle size={18} /> {t.cta}</a>}
          <Link to="/start" className="inline-flex items-center gap-2 rounded-full bg-fg px-5 py-3 text-base font-bold text-[rgb(var(--c-base))]">{t.start}</Link>
        </div>
      </main>
    </div>
  );
}
