import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { TopBar } from "../components/TopBar";
import { SiteFooter } from "../components/SiteFooter";

/**
 * /solutions — the three ways a buyer looks for us: by the seat they sit in,
 * by the kind of business, by the industry. Each tile lands on the intake
 * with the business pre-picked, so the second click is already the plan.
 * The scenario cards are the pictures; the words are here in both languages.
 */
const ROLE = [
  ["owner", "Founders & owners", "मालिक और संस्थापक", "Run the business without being the phone.", "बिना फ़ोन बने बिज़नेस चलाइए।"],
  ["sales", "Sales teams", "सेल्स टीम", "Every lead and follow-up on the company's number.", "हर लीड और फ़ॉलो-अप कंपनी के नंबर पर।"],
  ["ops", "Operations", "ऑपरेशन", "Tasks, approvals and stock that do not live in one head.", "काम, मंज़ूरी और स्टॉक — एक सिर में नहीं।"],
  ["accounts", "Accounts", "अकाउंट्स", "Invoices out on time, money in on time.", "इनवॉइस समय पर, पैसा समय पर।"],
  ["support", "Support teams", "सपोर्ट टीम", "Every complaint becomes a ticket someone owns.", "हर शिकायत एक टिकट, जिसका ज़िम्मेदार हो।"],
  ["hr", "HR", "HR", "Attendance, leave, payslips, training — on the phone.", "अटेंडेंस, छुट्टी, पेस्लिप, ट्रेनिंग — फ़ोन पर।"],
] as const;

const TYPE = [
  ["distributor", "Distributors & wholesale", "डिस्ट्रीब्यूटर और होलसेल", "for_distributor"],
  ["garment", "Garments & textiles", "गारमेंट और टेक्सटाइल", "for_garment"],
  ["retail", "Shops & retail chains", "दुकानें और रिटेल चेन", "dept_inventory"],
  ["manufacturing", "Manufacturers", "मैन्युफ़ैक्चरर", "dept_allinone"],
  ["services", "Services & agencies", "सर्विस और एजेंसी", "dept_crm"],
  ["restaurant", "Restaurants & cafés", "रेस्टोरेंट और कैफ़े", "for_restaurant"],
  ["salon", "Salons & gyms", "सैलून और जिम", "for_salon"],
  ["logistics", "Logistics & transport", "लॉजिस्टिक्स और ट्रांसपोर्ट", "for_logistics"],
] as const;

const INDUSTRY = [
  ["clinic", "Healthcare", "हेल्थकेयर", "for_clinic"],
  ["coaching", "Education & coaching", "शिक्षा और कोचिंग", "for_coaching"],
  ["school", "Schools", "स्कूल", "for_school"],
  ["ca", "CA & law firms", "CA और लॉ फ़र्म", "for_ca"],
  ["realestate", "Real estate", "रियल एस्टेट", "for_realestate"],
  ["other", "Something else", "कुछ और", "dept_dashboard"],
] as const;

export default function Solutions() {
  const { i18n } = useTranslation();
  const hi = i18n.language.startsWith("hi");
  const start = (b: string) => `/start?business=${b}`;
  return (
    <div className="min-h-dvh">
      <TopBar showBack={false} onBack={() => {}} />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-6 sm:px-8 sm:pt-10">
        <p className="text-base font-semibold text-brand-luq">{hi ? "समाधान" : "Solutions"}</p>
        <h1 className="mt-2 max-w-3xl text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">
          <span className="text-gradient-accent">{hi ? "आपके बिज़नेस के लिए, आपकी भाषा में।" : "For your business, in your language."}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">
          {hi
            ? "हिंदी, अंग्रेज़ी या आपके ग्राहकों की कोई भी भाषा — सिस्टम, ट्रेनिंग और रिपोर्ट उसी में। नीचे से चुनिए; अगला कदम लिखित प्लान है।"
            : "Hindi, English or any language your customers use — the system, the training and the reports come in it. Pick below; the next step is a written plan."}
        </p>

        <Section title={hi ? "आपकी भूमिका" : "By role"}>
          {ROLE.map(([id, en, h, enS, hiS]) => (
            <Tile key={id} to={start(id === "owner" ? "other" : "services")} title={hi ? h : en} sub={hi ? hiS : enS} />
          ))}
        </Section>
        <Section title={hi ? "बिज़नेस का प्रकार" : "By business type"}>
          {TYPE.map(([id, en, h, card]) => <Tile key={id} to={start(id)} title={hi ? h : en} img={`/catalog/${hi ? "hi/" : ""}${card}.jpg`} />)}
        </Section>
        <Section title={hi ? "इंडस्ट्री" : "By industry"}>
          {INDUSTRY.map(([id, en, h, card]) => <Tile key={id} to={start(id)} title={hi ? h : en} img={`/catalog/${hi ? "hi/" : ""}${card}.jpg`} />)}
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-bold text-fg">{title}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
    </section>
  );
}

function Tile({ to, title, sub, img }: { to: string; title: string; sub?: string; img?: string }) {
  return (
    <Link to={to} className="group overflow-hidden rounded-2xl border border-hairline/20 bg-panel/40 transition hover:border-brand-luq/60">
      {img && <img src={img} alt="" loading="lazy" className="aspect-square w-full object-cover" />}
      <div className="p-3.5">
        <p className="flex items-center justify-between gap-2 text-base font-semibold text-fg">{title} <ArrowRight size={16} className="shrink-0 text-brand-luq opacity-0 transition group-hover:opacity-100" /></p>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
    </Link>
  );
}
