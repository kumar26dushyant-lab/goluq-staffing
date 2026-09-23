import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, MessageCircle, Send, Volume2, CalendarDays, Sunrise, Moon } from "lucide-react";
import { TopBar } from "../components/TopBar";
import { useSiteConfig } from "../lib/siteConfig";
import { useRegion } from "../lib/region";
import { BrandText } from "../components/BrandText";
import { useFilm } from "../lib/videoLang";
import { VideoLangToggle } from "../components/VideoLangToggle";

/**
 * /ceo — "Become the CEO of your business", the story page.
 *
 * One owner per chapter, in an ordinary bad moment, then the same owner once
 * the thing we build is in place. Three regional sets: India, the Gulf,
 * Australia / New Zealand (the rest of the world reads the AU/NZ set). The
 * region comes from the visitor's country, `?r=` overrides it for checking.
 * Pictures are the story scenes under /public/story; the India chapters also
 * link to their reels. Every line is illustrative: no client is named, no
 * number is claimed.
 */
type Region = "in" | "gulf" | "intl";
type Chapter = { id: string; who: string; hook: string; before: string; after: string; changed: string; product: string; reel?: boolean };

const REGION_LABEL: Record<Region, [string, string]> = { in: ["India", "भारत"], gulf: ["Gulf", "खाड़ी"], intl: ["Australia & NZ", "ऑस्ट्रेलिया और NZ"] };

/** The three story videos (India cut first; Gulf and AU/NZ cuts follow). */
const STORIES = [
  { id: "coach", media: "ceo-coach", en: ["A coaching institute", "The 9 pm calls nobody answers: ₹75,000 a month walking to the competitor, and what the number gets back."], hi: ["एक कोचिंग इंस्टीट्यूट", "रात 9 बजे के फ़ोन जो कोई नहीं उठाता: हर महीने ₹75,000 प्रतिद्वंद्वी के पास, और नंबर क्या वापस लाता है।"] },
  { id: "dist", media: "ceo-dist", en: ["An FMCG distributor", "Forty shops paying twenty days late on ₹10 lakh a month, and the ₹3 lakh that comes back when reminders send themselves."], hi: ["एक FMCG डिस्ट्रीब्यूटर", "₹10 लाख महीने पर चालीस दुकानें बीस दिन देर से, और वे ₹3 लाख जो रिमाइंडर अपने आप जाने पर वापस आते हैं।"] },
  { id: "ca", media: "ceo-ca", en: ["A CA firm of four", "Clients drifting over late replies, invoices a month late, and the memory that stays with the firm."], hi: ["चार लोगों की CA फ़र्म", "देर से जवाब पर जाते क्लाइंट, महीना देर से इनवॉइस, और वह याददाश्त जो फ़र्म के पास रहती है।"] },
  { id: "adv", media: "ceo-adv", partner: true, en: ["An advisor who partners", "Twenty owners a week already ask him who builds this. He opens a partner office and earns on every order, and every month."], hi: ["एक सलाहकार जो पार्टनर बना", "हफ़्ते में बीस मालिक पहले से पूछते थे कि यह कौन बनाता है। उसने पार्टनर ऑफ़िस खोला; हर ऑर्डर और हर महीने कमाई।"] },
  { id: "cap", media: "ceo-cap", partner: true, en: ["A CA firm that partners", "Her 150 clients kept asking the same question. Now the firm has the answer, her name can go on the software, and a second income arrives monthly."], hi: ["एक CA फ़र्म जो पार्टनर बनी", "150 क्लाइंट वही सवाल पूछते थे। अब फ़र्म के पास जवाब है, सॉफ़्टवेयर पर उनका नाम हो सकता है, और दूसरी आमदनी हर महीने।"] },
  { id: "pharm", media: "pharm", en: ["Rent forever, or own once?", "Six medical stores, one renewal invoice a year, and not one line of the software his. The house analogy, and the ₹1.8 lakh a year that stays."], hi: ["हमेशा किराया, या एक बार अपना?", "छह मेडिकल स्टोर, हर साल एक रिन्यूअल इनवॉइस, और सॉफ़्टवेयर की एक लाइन भी उनकी नहीं। घर वाली मिसाल, और साल के ₹1.8 लाख जो बचते हैं।"] },
  { id: "aiostory", media: "aiostory", en: ["Six rents, or one that is yours", "A pharma distributor on six software that do not talk to each other, and the one system built for his company that he owns."], hi: ["छह किराए, या एक जो आपका हो", "छह ऐसे सॉफ़्टवेयर पर चलता एक फ़ार्मा डिस्ट्रीब्यूटर जो आपस में बात नहीं करते, और वह एक सिस्टम जो उनकी कंपनी के लिए बना और उनका है।"] },
  { id: "boss", media: "boss", partner: true, en: ["The day Kavita became her own boss", "Two hundred shopkeepers on her phone and no office, until one evening. The five-step playbook, and a market that is hers."], hi: ["जिस दिन कविता अपनी बॉस बनीं", "फ़ोन में दो सौ दुकानदार और कोई ऑफ़िस नहीं, एक शाम तक। पाँच कदम की प्लेबुक, और एक बाज़ार जो उनका है।"] },
] as const;
/** Bump when a video is re-cut: the edge caches by URL. */
const VID_V = "3";

const COPY = {
  en: {
    kicker: "The story",
    title: "Become the CEO of your business.",
    sub: "Five owners and three partners, ninety seconds each: what runs on their phone today, what it costs, and what changes in money, time and control once GoLuQ runs it.",
    storiesTitle: "Eight stories, ninety seconds each",
    storiesNote: "The numbers are worked examples, not client results. Put in your own; the plan we write uses yours.",
    example: "Worked example",
    pillars: [
      ["Money", "Enquiries answered at night, dues collected on time, invoices out the same day. Revenue you already earned, kept."],
      ["Efficiency", "One screen for the whole business. Reminders, bookings and follow-ups send themselves; people do the work only people can do."],
      ["Cost", "Fixed price, weeks not months, then a monthly plan that costs less than one salary. You own the code and the data."],
    ],
    more: "Short versions for your region",
    pick: "Read it for",
    before: "Before",
    after: "With GoLuQ",
    changed: "What changed",
    watch: "Watch with sound",
    weekTitle: "A CEO's week, once it runs",
    week: [
      ["Monday morning", "A brief on your phone: who came in, what was paid, the two things that need you."],
      ["Every day", "Your number answers, reminders go out, orders and bookings land. Your people work from one screen you can see."],
      ["Evening", "The system closes the day. You leave at seven, and the business does not leave with anyone."],
    ],
    howTitle: "How it starts",
    how: "Tell us your need in your own words. We write a plan you can read, quote a fixed price, build it in weeks, then run it for you. You own the code and the data.",
    cta: "Tell us your need", wa: "Ask on WhatsApp", tg: "Ask on Telegram",
    security: "How we secure your data",
  },
  hi: {
    kicker: "कहानी",
    title: "अपने बिज़नेस के CEO बनिए।",
    sub: "पाँच मालिक और तीन पार्टनर, नब्बे-नब्बे सेकंड: आज उनके फ़ोन पर क्या चलता है, उसकी क्या कीमत है, और GoLuQ के चलाने पर पैसे, समय और नियंत्रण में क्या बदलता है।",
    storiesTitle: "आठ कहानियाँ, नब्बे-नब्बे सेकंड",
    storiesNote: "आँकड़े उदाहरण हैं, किसी क्लाइंट के नतीजे नहीं। अपने आँकड़े डालिए; हमारा प्लान आपके आँकड़ों पर बनता है।",
    example: "उदाहरण",
    pillars: [
      ["पैसा", "रात की पूछताछ का जवाब, समय पर वसूली, उसी दिन इनवॉइस। जो कमाई आपकी थी, वह आपके पास रही।"],
      ["दक्षता", "पूरे बिज़नेस की एक स्क्रीन। रिमाइंडर, बुकिंग और फ़ॉलो-अप अपने आप; लोग सिर्फ़ वह काम करें जो लोग ही कर सकते हैं।"],
      ["लागत", "तय कीमत, हफ़्तों में, फिर एक तनख़्वाह से कम का मासिक प्लान। कोड और डेटा आपके।"],
    ],
    more: "आपके क्षेत्र के छोटे संस्करण",
    pick: "किसके लिए पढ़ें",
    before: "पहले",
    after: "GoLuQ के साथ",
    changed: "क्या बदला",
    watch: "आवाज़ के साथ देखें",
    weekTitle: "चलने के बाद, CEO का हफ़्ता",
    week: [
      ["सोमवार सुबह", "फ़ोन पर ब्रीफ़: कौन आया, क्या भुगतान हुआ, वे दो बातें जिन्हें आपकी ज़रूरत है।"],
      ["हर दिन", "आपका नंबर उठता है, रिमाइंडर जाते हैं, ऑर्डर और बुकिंग आती हैं। आपकी टीम एक स्क्रीन पर काम करती है, जो आप देख सकते हैं।"],
      ["शाम", "दिन का हिसाब सिस्टम बंद करता है। आप सात बजे निकलते हैं, और बिज़नेस किसी के साथ बाहर नहीं जाता।"],
    ],
    howTitle: "शुरुआत कैसे होती है",
    how: "अपनी ज़रूरत अपने शब्दों में बताइए। हम पढ़ने लायक प्लान लिखते हैं, तय कीमत बताते हैं, हफ़्तों में बनाते हैं, फिर आपके लिए चलाते हैं। कोड और डेटा आपके।",
    cta: "अपनी ज़रूरत बताइए", wa: "WhatsApp पर पूछिए", tg: "Telegram पर पूछिए",
    security: "हम आपका डेटा कैसे सुरक्षित रखते हैं",
  },
};

const CHAPTERS: Record<"en" | "hi", Record<Region, Chapter[]>> = {
  en: {
    in: [
      { id: "coaching", reel: true, who: "A coaching institute, Indore", hook: "The 9 pm call", before: "A parent calls at 9 pm. Nobody answers. Tomorrow they join the institute that did.", after: "Your number answers at 9 pm, books the visit and calls back in the morning.", changed: "The admission is yours, and you were at dinner.", product: "WhatsApp Office" },
      { id: "distributor", reel: true, who: "A distributor, forty shops", hook: "Forty reminders", before: "Forty shops, forty reminders, one phone. The shop nobody chased is the one that never pays.", after: "Reminders go out on their own, with a payment link. You see who paid on one screen.", changed: "Money comes in while you sleep.", product: "WhatsApp Store with reminders" },
      { id: "ca", reel: true, who: "A CA firm", hook: "The billing man is on leave", before: "So is everything he knew. The client is at the door.", after: "Every client, file and rate in one place. Anyone at any desk can answer.", changed: "You run the firm; it no longer runs you.", product: "Custom software" },
      { id: "garment", reel: true, who: "A garment wholesaler", hook: "One upload", before: "New designs every other day, sent one chat at a time. The buyer already ordered from someone faster.", after: "One upload. Buyers in five countries see it. Orders arrive while you drink your chai.", changed: "The catalogue sells while you cut.", product: "WhatsApp Store" },
      { id: "claims", reel: true, who: "Four offices", hook: "Nobody knows the status", before: "Four offices, four versions of the truth. The owner finds out last.", after: "One screen shows all four, now.", changed: "You decide instead of chase.", product: "Owner's dashboard" },
      { id: "ceo", reel: true, who: "You", hook: "Still closing the day", before: "Everyone else went home. You are still closing the day.", after: "The system closes the day. You read the brief on WhatsApp in the morning.", changed: "You run it like a CEO, for less than one salary a month.", product: "Managed plan" },
    ],
    gulf: [
      { id: "gulf_trader", who: "A textile trader, Deira", hook: "Three countries, one salesman's phone", before: "Buyers from three countries message your salesman's phone. The day he leaves, they leave with him.", after: "They message the shop's number, in Arabic or English. He still replies; every chat is on your screen.", changed: "The buyers belong to the business.", product: "WhatsApp Office" },
      { id: "gulf_invoices", who: "Sunday morning", hook: "Chasing dirhams", before: "The accountant spends Sunday on the phone, chasing last month's invoices.", after: "Reminders and payment links go out on their own, in the customer's language. You see who paid.", changed: "Sunday is for coffee.", product: "WhatsApp Store with reminders" },
      { id: "gulf_twocities", who: "Dubai and Sharjah", hook: "Across the creek", before: "The shop is in Deira, the warehouse in Sharjah. You learn what happened yesterday, by phone.", after: "One screen shows both: stock, orders, who is doing what, now.", changed: "You decide instead of chase.", product: "Owner's dashboard" },
    ],
    intl: [
      { id: "anz_rep", who: "A plumbing-supplies distributor", hook: "The best rep moves across town", before: "Your best rep takes a job with the competitor. Half your tradies were in his phone.", after: "They message the business number. The new rep picks up the same conversations on the same screen.", changed: "Customers stay with the business.", product: "WhatsApp Office" },
      { id: "anz_quotes", who: "Six in the morning", hook: "Quotes from the ute", before: "A tradie needs a quote before the job starts. You type it into a phone at six, line by line.", after: "Catalogue, quote and invoice from one place. The tradie has it before his coffee.", changed: "Quotes in minutes, invoices by themselves.", product: "WhatsApp Store" },
      { id: "anz_friday", who: "Friday night", hook: "Friday paperwork", before: "Everyone left at five. You are at the kitchen table with the invoices.", after: "The system closes the week. Saturday is the barbecue.", changed: "You run it like a CEO, for less than one wage a month.", product: "Managed plan" },
    ],
  },
  hi: {
    in: [
      { id: "coaching", reel: true, who: "एक कोचिंग इंस्टीट्यूट, इंदौर", hook: "रात 9 बजे का फ़ोन", before: "रात 9 बजे एक अभिभावक का फ़ोन। कोई नहीं उठाता। कल वे उस इंस्टीट्यूट में जाते हैं जिसने उठाया।", after: "आपका नंबर रात 9 बजे उठता है, विज़िट बुक करता है, सुबह वापस कॉल करता है।", changed: "एडमिशन आपका, और आप खाने की मेज़ पर थे।", product: "WhatsApp Office" },
      { id: "distributor", reel: true, who: "एक डिस्ट्रीब्यूटर, चालीस दुकानें", hook: "चालीस रिमाइंडर", before: "चालीस दुकानें, चालीस रिमाइंडर, एक फ़ोन। जिस दुकान को किसी ने नहीं टोका, वही कभी नहीं देती।", after: "रिमाइंडर अपने आप जाते हैं, पेमेंट लिंक के साथ। किसने दिया, एक स्क्रीन पर।", changed: "पैसा तब भी आता है जब आप सो रहे हों।", product: "WhatsApp Store, रिमाइंडर के साथ" },
      { id: "ca", reel: true, who: "एक CA फ़र्म", hook: "बिलिंग वाला छुट्टी पर है", before: "और उसके साथ वो सब जो उसे पता था। क्लाइंट दरवाज़े पर है।", after: "हर क्लाइंट, फ़ाइल और रेट एक जगह। कोई भी, किसी भी डेस्क से जवाब दे सकता है।", changed: "फ़र्म आप चलाते हैं — फ़र्म आपको नहीं।", product: "कस्टम सॉफ़्टवेयर" },
      { id: "garment", reel: true, who: "एक गारमेंट होलसेलर", hook: "एक अपलोड", before: "हर दूसरे दिन नए डिज़ाइन, एक-एक चैट में। खरीदार ने किसी तेज़ वाले से ऑर्डर कर लिया।", after: "एक अपलोड। पाँच देशों के खरीदार देखते हैं। ऑर्डर तब आते हैं जब आप चाय पी रही हों।", changed: "कैटलॉग बेचता है, आप कटिंग करते हैं।", product: "WhatsApp Store" },
      { id: "claims", reel: true, who: "चार ऑफ़िस", hook: "किसी को स्टेटस नहीं पता", before: "चार ऑफ़िस, सच के चार वर्ज़न। मालिक को सबसे बाद में पता चलता है।", after: "एक स्क्रीन पर चारों, अभी।", changed: "आप पीछा नहीं करते, फ़ैसला करते हैं।", product: "मालिक का डैशबोर्ड" },
      { id: "ceo", reel: true, who: "आप", hook: "अभी भी दिन का हिसाब", before: "सब घर चले गए। आप अभी भी दिन का हिसाब बंद कर रहे हैं।", after: "हिसाब सिस्टम बंद करता है। सुबह ब्रीफ़ WhatsApp पर पढ़ते हैं।", changed: "CEO की तरह चलाइए, महीने की एक तनख़्वाह से कम में।", product: "मैनेज्ड प्लान" },
    ],
    gulf: [
      { id: "gulf_trader", who: "एक टेक्सटाइल ट्रेडर, देरा", hook: "तीन देश, एक सेल्समैन का फ़ोन", before: "तीन देशों के खरीदार आपके सेल्समैन के फ़ोन पर मैसेज करते हैं। जिस दिन वह जाता है, वे उसके साथ जाते हैं।", after: "वे दुकान के नंबर पर मैसेज करते हैं, अरबी या अंग्रेज़ी में। वह अब भी जवाब देता है; हर चैट आपकी स्क्रीन पर।", changed: "खरीदार बिज़नेस के हैं।", product: "WhatsApp Office" },
      { id: "gulf_invoices", who: "रविवार की सुबह", hook: "दिरहम का पीछा", before: "अकाउंटेंट रविवार फ़ोन पर बिताता है, पिछले महीने के इनवॉइस का पीछा करते हुए।", after: "रिमाइंडर और पेमेंट लिंक अपने आप जाते हैं, ग्राहक की भाषा में। किसने दिया, आप देखते हैं।", changed: "रविवार कॉफ़ी के लिए है।", product: "WhatsApp Store, रिमाइंडर के साथ" },
      { id: "gulf_twocities", who: "दुबई और शारजाह", hook: "क्रीक के उस पार", before: "दुकान देरा में, गोदाम शारजाह में। कल क्या हुआ, फ़ोन से पता चलता है।", after: "एक स्क्रीन पर दोनों: स्टॉक, ऑर्डर, कौन क्या कर रहा है, अभी।", changed: "आप पीछा नहीं करते, फ़ैसला करते हैं।", product: "मालिक का डैशबोर्ड" },
    ],
    intl: [
      { id: "anz_rep", who: "एक प्लंबिंग-सप्लाई डिस्ट्रीब्यूटर", hook: "सबसे अच्छा रेप शहर के उस पार चला गया", before: "आपका सबसे अच्छा रेप प्रतिद्वंद्वी के यहाँ चला गया। आधे ग्राहक उसके फ़ोन में थे।", after: "वे बिज़नेस के नंबर पर मैसेज करते हैं। नया रेप वही बातचीत, उसी स्क्रीन पर उठा लेता है।", changed: "ग्राहक बिज़नेस के साथ रहते हैं।", product: "WhatsApp Office" },
      { id: "anz_quotes", who: "सुबह छह बजे", hook: "गाड़ी से कोटेशन", before: "काम शुरू होने से पहले ग्राहक को कोटेशन चाहिए। आप सुबह छह बजे फ़ोन पर लाइन-दर-लाइन टाइप करते हैं।", after: "कैटलॉग, कोटेशन और इनवॉइस एक जगह से। ग्राहक के पास उसकी कॉफ़ी से पहले।", changed: "कोटेशन मिनटों में, इनवॉइस अपने आप।", product: "WhatsApp Store" },
      { id: "anz_friday", who: "शुक्रवार की रात", hook: "शुक्रवार की काग़ज़ी", before: "सब पाँच बजे निकल गए। आप रसोई की मेज़ पर इनवॉइस के साथ हैं।", after: "हफ़्ते का हिसाब सिस्टम बंद करता है। शनिवार बारबेक्यू का है।", changed: "CEO की तरह चलाइए, महीने की एक तनख़्वाह से कम में।", product: "मैनेज्ड प्लान" },
    ],
  },
};

/** Bump when a scene is regenerated: the edge caches images by URL. */
const V = "1";

export default function CeoStory() {
  const { i18n } = useTranslation();
  const hi = i18n.language.startsWith("hi");
  const lang = hi ? "hi" : "en";
  const t = COPY[lang];
  const { lang: vlang, setLang: setVlang, sfx } = useFilm();
  const cfg = useSiteConfig();
  // useLocation makes the region pills re-render the page on `?r=` changes.
  const { search } = useLocation();
  const detected = useRegion();
  const forced = new URLSearchParams(search).get("r");
  const region: Region = forced === "in" || forced === "gulf" || forced === "intl" ? forced : detected === "in" || detected === "gulf" ? detected : "intl";
  const chapters = CHAPTERS[lang][region];
  const telegramDoor = detected === "cis" || region === "gulf";

  return (
    <div className="min-h-dvh">
      <TopBar showBack={false} onBack={() => {}} />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-6 sm:px-8 sm:pt-10">
        <p className="text-base font-semibold text-brand-luq">{t.kicker}</p>
        <h1 className="mt-2 max-w-3xl text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">
          <span className="text-gradient-accent">{t.title}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">{t.sub}</p>

        {/* The stories: one video each, poster until play, voice in the site language. */}
        <section id="stories" className="mt-8 scroll-mt-24">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-bold text-fg sm:text-3xl">{t.storiesTitle}</h2>
            <VideoLangToggle lang={vlang} onChange={setVlang} dark={false} />
          </div>
          <p className="mt-1 text-sm text-muted">{t.storiesNote}</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {STORIES.map((st) => {
              const [name, hook] = st[lang];
              return (
                <figure key={st.id} className="overflow-hidden rounded-2xl border border-hairline/15 bg-panel/40">
                  <video key={`${st.id}-${sfx(st.media)}`} data-seq="ceo" controls playsInline preload="none"
                    poster={`/media/${st.media}-${sfx(st.media)}-poster.jpg?v=${VID_V}`}
                    className="aspect-video w-full bg-black object-cover">
                    <source src={`/media/${st.media}-${sfx(st.media)}.mp4?v=${VID_V}`} type="video/mp4" />
                  </video>
                  <figcaption className="p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-brand-luq">{"partner" in st && st.partner ? (hi ? "पार्टनर की कहानी · उदाहरण" : "Partner story · worked example") : t.example}</p>
                    <p className="mt-1 text-lg font-bold text-fg">{name}</p>
                    <p className="mt-1 text-[15px] leading-snug text-muted">{hook}</p>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {t.pillars.map(([h, p]) => (
            <div key={h} className="rounded-2xl border border-hairline/15 bg-panel/30 p-5">
              <p className="font-display text-xl font-bold text-fg">{h}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{p}</p>
            </div>
          ))}
        </section>

        <details className="group mt-12">
          <summary className="flex cursor-pointer list-none items-center gap-3 font-display text-2xl font-bold text-fg">
            {t.more}
            <span className="rounded-full border border-hairline/30 px-3 py-0.5 text-sm font-semibold text-muted group-open:hidden">+</span>
            <span className="hidden rounded-full border border-hairline/30 px-3 py-0.5 text-sm font-semibold text-muted group-open:inline">−</span>
          </summary>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-faint">{t.pick}</span>
            {(["in", "gulf", "intl"] as Region[]).map((r) => (
              <Link key={r} to={`/ceo?r=${r}`} replace
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${r === region ? "bg-fg text-[rgb(var(--c-base))]" : "border border-hairline/30 text-muted hover:text-fg"}`}>
                {REGION_LABEL[r][hi ? 1 : 0]}
              </Link>
            ))}
          </div>
          <div className="mt-8 space-y-12">
            {chapters.map((ch, i) => (
              <article key={ch.id} id={`ch-${ch.id}`} className="scroll-mt-24">
                <p className="inline-flex items-center gap-2 rounded-full bg-brand-luq/10 px-3 py-1 text-sm font-bold text-brand-luq">
                  <span className="font-mono">{String(i + 1).padStart(2, "0")}</span> · {ch.who}
                </p>
                <h3 className="mt-3 text-balance font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">{ch.hook}</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:gap-6">
                  <Scene src={`/story/${ch.id}_before.webp?v=${V}`} label={t.before} line={ch.before} muted />
                  <Scene src={`/story/${ch.id}_after.webp?v=${V}`} label={t.after} line={ch.after} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <p className="text-base text-fg"><span className="font-bold text-brand-luq">{t.changed}:</span> {ch.changed}</p>
                  <span className="rounded-full border border-brand-luq/40 bg-brand-luq/10 px-3 py-1 text-sm font-semibold text-brand-luq">{ch.product}</span>
                  {ch.reel && (
                    <a href={`/media/reel-${ch.id}-${lang}.mp4?v=3`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg">
                      <Volume2 size={15} /> {t.watch}
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </details>

        <section className="mt-16 rounded-3xl bg-[#0B1020] p-6 text-white sm:p-10">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">{t.weekTitle}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {t.week.map(([h, p], i) => {
              const Icon = [Sunrise, CalendarDays, Moon][i];
              return (
                <div key={h} className="rounded-2xl border border-white/12 bg-white/5 p-5">
                  <Icon size={22} className="text-[#22D3EE]" />
                  <p className="mt-3 text-lg font-bold">{h}</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-white/75">{p}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-12 max-w-3xl">
          <h2 className="font-display text-2xl font-bold text-fg sm:text-3xl">{t.howTitle}</h2>
          <p className="mt-3 text-lg leading-relaxed text-muted">{t.how}</p>
          <p className="mt-2 text-base text-muted"><BrandText text="GoLuQ.com Digital Consultancy" /> · <Link to="/security" className="font-semibold text-brand-luq hover:underline">{t.security}</Link></p>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/start" className="inline-flex items-center gap-2 rounded-full bg-fg px-5 py-3 text-base font-bold text-[rgb(var(--c-base))]">{t.cta} <ArrowRight size={18} /></Link>
          {cfg?.whatsapp && <a href={`https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(hi ? "नमस्ते GoLuQ, CEO वाली कहानी पढ़ी" : "Hi GoLuQ, I read the CEO story")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-success/15 px-5 py-3 text-base font-bold text-success ring-1 ring-success/30"><MessageCircle size={18} /> {t.wa}</a>}
          {telegramDoor && cfg?.telegram && <a href={`https://t.me/${cfg.telegram}?start=ceo`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-hairline/30 px-5 py-3 text-base font-bold text-fg"><Send size={18} /> {t.tg}</a>}
        </div>
      </main>
    </div>
  );
}

function Scene({ src, label, line, muted = false }: { src: string; label: string; line: string; muted?: boolean }) {
  return (
    <figure className={`overflow-hidden rounded-2xl border ${muted ? "border-hairline/15" : "border-brand-luq/40"} bg-panel/40`}>
      <img src={src} alt="" loading="lazy" className={`aspect-[4/5] w-full object-cover sm:aspect-[5/4] ${muted ? "saturate-[.7]" : ""}`} />
      <figcaption className="p-4">
        <p className={`text-xs font-bold uppercase tracking-wide ${muted ? "text-faint" : "text-brand-luq"}`}>{label}</p>
        <p className={`mt-1 text-balance text-lg font-semibold leading-snug ${muted ? "text-muted" : "text-fg"}`}>{line}</p>
      </figcaption>
    </figure>
  );
}
