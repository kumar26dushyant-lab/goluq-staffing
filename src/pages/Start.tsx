import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, CalendarClock, Check, Mail, MessageCircle, Mic, Square, Loader2, Pencil } from "lucide-react";
import { TopBar } from "../components/TopBar";
import { SiteFooter } from "../components/SiteFooter";
import { useSiteConfig } from "../lib/siteConfig";
import { captureUtm, sessionId } from "../lib/track";
import { inputClass } from "../lib/ui";

/**
 * /start — the self-service intake.
 *
 * A prospect arrives from an ad, signs in with what they already have (email
 * code, WhatsApp code, Google), picks their business and the departments that
 * hurt, says what is going wrong in their own words (voice or text), answers
 * up to four follow-up questions from the guide, and leaves with a written
 * plan and a booked call. Nothing here quotes a price: the quote is fixed
 * on the call, after the plan.
 *
 * Copy lives in this file in both languages: this page has its own voice and
 * changes with the ads, so it should not be spread across the site bundles.
 */
const TOKEN_KEY = "goluq_portal_token";
const DRAFT_KEY = "goluq_start_draft";

type Step = "signin" | "business" | "departments" | "tell" | "ask" | "plan" | "done";
interface Brd { title: string; summary: string; goals: string[]; users: string[]; scenarios: { name: string; steps: string[] }[]; integrations: string[]; timeline: string; open_questions: string[] }

const BUSINESS = [
  ["coaching", "Coaching institute", "कोचिंग इंस्टीट्यूट"], ["clinic", "Clinic / hospital", "क्लिनिक / अस्पताल"], ["ca", "CA / law firm", "CA / लॉ फ़र्म"],
  ["garment", "Garments / textiles", "गारमेंट / टेक्सटाइल"], ["distributor", "Distributor / wholesale", "डिस्ट्रीब्यूटर / होलसेल"], ["realestate", "Real estate", "रियल एस्टेट"],
  ["restaurant", "Restaurant / café", "रेस्टोरेंट / कैफ़े"], ["salon", "Salon / gym", "सैलून / जिम"], ["school", "School / college", "स्कूल / कॉलेज"],
  ["logistics", "Logistics / transport", "लॉजिस्टिक्स / ट्रांसपोर्ट"], ["manufacturing", "Manufacturing", "मैन्युफ़ैक्चरिंग"], ["retail", "Shop / retail chain", "दुकान / रिटेल चेन"],
  ["services", "Services / agency", "सर्विस / एजेंसी"], ["other", "Something else", "कुछ और"],
] as const;

const DEPTS = [
  ["sales", "Sales & follow-ups", "सेल्स और फ़ॉलो-अप"], ["billing", "Billing & accounts", "बिलिंग और अकाउंट्स"], ["inventory", "Stock & purchase", "स्टॉक और खरीद"],
  ["hr", "Staff, attendance, payroll", "स्टाफ़, अटेंडेंस, पेरोल"], ["training", "Staff training", "स्टाफ़ ट्रेनिंग"], ["vendors", "Vendors & suppliers", "वेंडर और सप्लायर"],
  ["support", "Customer support", "कस्टमर सपोर्ट"], ["field", "Field staff & delivery", "फ़ील्ड स्टाफ़ और डिलीवरी"], ["whatsapp", "WhatsApp & marketing", "WhatsApp और मार्केटिंग"],
  ["calls", "Calls & missed calls", "कॉल और मिस्ड कॉल"], ["dashboard", "Owner's view of everything", "मालिक की पूरी नज़र"], ["website", "Website / app", "वेबसाइट / ऐप"],
] as const;

const C = {
  en: {
    kicker: "Tell us once. Get a written plan.",
    title: "What slows your business down?",
    sub: "Say it the way you would to a friend. You get a written plan today and a fixed quote on a 30-minute call. No forms longer than this page.",
    signinTitle: "First, where should the plan go?",
    signinSub: "One code, no password. We never message you without a reason.",
    name: "Your name", email: "Email", phone: "WhatsApp number", sendCode: "Send code", code: "6-digit code", verify: "Continue",
    google: "Continue with Google", orWhatsapp: "or by WhatsApp", orEmail: "or by email", codeSent: "Code sent to",
    resend: "Send again", wrong: "That code did not match. Try again.", expired: "The code expired. Send a new one.", tooMany: "Too many tries. Wait a little and send a new code.",
    sendFail: "Could not send the code. Check the address and try again.",
    businessTitle: "What kind of business?", deptTitle: "Where does it hurt?", deptSub: "Pick everything that applies.",
    tellTitle: "Tell us what is going wrong", tellSub: "Hold the mic and talk, or type. Hindi, English, mixed, all fine.",
    placeholder: "Example: my two salesmen keep customer chats on their own phones. When one left last month we lost his customers. Payment reminders go out only when I remember…",
    hold: "Hold to talk", recording: "Recording… release to stop", transcribing: "Writing it down…",
    next: "Next", back: "Back", askTitle: "A couple of questions so the plan is right", answer: "Your answer", skip: "Skip",
    planTitle: "Your plan", planSub: "Read it. Change anything that is not right. Then send it to Dushyant.",
    goals: "Goals", users: "Who uses it", scenarios: "Day to day", integrations: "Connects to", timeline: "Timeline", open: "Still to decide",
    contactTitle: "Where should Dushyant reach you?", company: "Business name (optional)", send: "Send my plan", sending: "Sending…",
    doneTitle: "Your plan is with Dushyant.", doneSub: "He reads every one himself. The next step is a 30-minute call, where you get a fixed quote — priced for a small business, not an enterprise.",
    book: "Pick a time for the call", wa: "Message on WhatsApp", home: "Back to goluq.com",
    drafting: "Writing your plan…", draftFail: "Could not write the plan just now. Try again.", needMore: "A few more words would help — what happens, and who it happens to.",
    edit: "Edit", editDone: "Done",
  },
  hi: {
    kicker: "एक बार बताइए। लिखित प्लान पाइए।",
    title: "आपके बिज़नेस को क्या धीमा करता है?",
    sub: "वैसे ही बताइए जैसे किसी दोस्त को बताते। आज लिखित प्लान मिलेगा और 30 मिनट की कॉल पर तय कोटेशन। इस पेज से लंबा कोई फ़ॉर्म नहीं।",
    signinTitle: "पहले, प्लान कहाँ भेजें?",
    signinSub: "एक कोड, पासवर्ड नहीं। बिना वजह हम कभी मैसेज नहीं करते।",
    name: "आपका नाम", email: "ईमेल", phone: "WhatsApp नंबर", sendCode: "कोड भेजें", code: "6 अंकों का कोड", verify: "आगे बढ़ें",
    google: "Google से जारी रखें", orWhatsapp: "या WhatsApp से", orEmail: "या ईमेल से", codeSent: "कोड भेजा गया:",
    resend: "फिर भेजें", wrong: "कोड मेल नहीं खाया। फिर कोशिश करें।", expired: "कोड की समय-सीमा खत्म। नया भेजें।", tooMany: "बहुत कोशिशें हो गईं। थोड़ा रुककर नया कोड भेजें।",
    sendFail: "कोड नहीं भेजा जा सका। पता जाँचकर फिर कोशिश करें।",
    businessTitle: "किस तरह का बिज़नेस?", deptTitle: "कहाँ दिक्कत है?", deptSub: "जो-जो लागू हो, सब चुनें।",
    tellTitle: "बताइए क्या गड़बड़ हो रही है", tellSub: "माइक दबाकर बोलिए, या लिखिए। हिंदी, अंग्रेज़ी, मिली-जुली — सब चलेगा।",
    placeholder: "जैसे: मेरे दो सेल्समैन ग्राहकों की चैट अपने फ़ोन पर रखते हैं। पिछले महीने एक गया तो उसके ग्राहक भी गए। पेमेंट रिमाइंडर तभी जाता है जब मुझे याद रहे…",
    hold: "दबाकर बोलें", recording: "रिकॉर्ड हो रहा है… छोड़ने पर रुकेगा", transcribing: "लिखा जा रहा है…",
    next: "आगे", back: "पीछे", askTitle: "दो-चार सवाल, ताकि प्लान सही बने", answer: "आपका जवाब", skip: "छोड़ें",
    planTitle: "आपका प्लान", planSub: "पढ़िए। जो ठीक न लगे, बदलिए। फिर दुष्यंत को भेजिए।",
    goals: "लक्ष्य", users: "कौन इस्तेमाल करेगा", scenarios: "रोज़ का काम", integrations: "किससे जुड़ेगा", timeline: "समय", open: "अभी तय करना बाकी",
    contactTitle: "दुष्यंत आपसे कहाँ संपर्क करें?", company: "बिज़नेस का नाम (वैकल्पिक)", send: "मेरा प्लान भेजें", sending: "भेजा जा रहा है…",
    doneTitle: "आपका प्लान दुष्यंत के पास है।", doneSub: "हर प्लान वे खुद पढ़ते हैं। अगला कदम 30 मिनट की कॉल — वहीं तय कोटेशन मिलेगा, छोटे बिज़नेस के बजट के हिसाब से।",
    book: "कॉल का समय चुनें", wa: "WhatsApp पर मैसेज करें", home: "goluq.com पर वापस",
    drafting: "आपका प्लान लिखा जा रहा है…", draftFail: "अभी प्लान नहीं बन पाया। फिर कोशिश करें।", needMore: "थोड़ा और बताइए — क्या होता है, और किसके साथ।",
    edit: "बदलें", editDone: "हो गया",
  },
};

const api = async (path: string, body?: unknown) => {
  const token = localStorage.getItem(TOKEN_KEY) || "";
  const r = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json().catch(() => ({ ok: false, error: "network" }));
};

export default function Start() {
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith("hi") ? "hi" : "en";
  const t = C[lang];
  const cfg = useSiteConfig();
  const auth = cfg?.auth || { email: true, whatsapp: false, google: false };

  const [step, setStep] = useState<Step>("signin");
  const [business, setBusiness] = useState("");
  const [depts, setDepts] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [brd, setBrd] = useState<Brd | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [contact, setContact] = useState({ name: "", phone: "", email: "", company: "" });
  const [bookingUrl, setBookingUrl] = useState("");

  const label = (id: string, list: readonly (readonly [string, string, string])[]) => { const r = list.find((x) => x[0] === id); return r ? (lang === "hi" ? r[2] : r[1]) : id; };
  const ctx = () => ({ lang, businessType: label(business, BUSINESS), departments: depts.map((d) => label(d, DEPTS)), text });

  // Google sends the session token back in the URL fragment.
  useEffect(() => {
    const m = /[#&]token=([A-Za-z0-9_-]{32,})/.exec(window.location.hash);
    if (m) { localStorage.setItem(TOKEN_KEY, m[1]); window.history.replaceState(null, "", window.location.pathname + window.location.search); }
    captureUtm();
    // From /solutions: the business is already chosen.
    const pre = new URLSearchParams(window.location.search).get("business") || "";
    if (pre && BUSINESS.some((b) => b[0] === pre)) setBusiness(pre);
    try { const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null"); if (d) { setBusiness(d.business || ""); setDepts(d.depts || []); setText(d.text || ""); } } catch { /* fresh start */ }
    api("/api/intake").then((d) => { if (d.ok) { setContact((c) => ({ ...c, name: d.customer.name === "Customer" ? "" : d.customer.name, email: d.customer.email || "", phone: d.customer.phone.startsWith("email:") ? "" : d.customer.phone })); setStep("business"); } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ business, depts, text })); } catch { /* fine */ } }, [business, depts, text]);

  const signedIn = (d: any) => {
    localStorage.setItem(TOKEN_KEY, d.token);
    setContact((c) => ({ ...c, name: d.customer.name === "Customer" ? c.name : d.customer.name, email: d.customer.email || c.email, phone: d.customer.phone.startsWith("email:") ? c.phone : d.customer.phone }));
    setStep("business");
  };

  const askNext = async (hist: { q: string; a: string }[]) => {
    setBusy("ask"); setErr("");
    const d = await api("/api/intake", { action: "ask", ctx: ctx(), history: hist });
    setBusy("");
    if (d.ok && d.question) { setQuestion(d.question); setAnswer(""); setStep("ask"); }
    else await draft(hist);
  };
  const draft = async (hist: { q: string; a: string }[]) => {
    setBusy("draft"); setErr("");
    const d = await api("/api/intake", { action: "draft", ctx: ctx(), history: hist });
    setBusy("");
    if (d.ok) { setBrd(d.brd); setStep("plan"); } else { setErr(t.draftFail); setStep("tell"); }
  };
  const submit = async () => {
    if (!brd) return;
    setBusy("submit"); setErr("");
    const utm = captureUtm() as any;
    const source = [utm.utmSource, utm.utmMedium, utm.utmCampaign].filter(Boolean).join("/") || document.referrer.replace(/^https?:\/\//, "").split("/")[0] || "";
    const d = await api("/api/intake", { action: "submit", ctx: ctx(), history, brd, contact, source: source.slice(0, 200) + (sessionId() ? "" : "") });
    setBusy("");
    if (d.ok) { setBookingUrl(d.bookingUrl || cfg?.bookingUrl || ""); setStep("done"); try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* fine */ } }
    else setErr(d.error === "need_name_phone" ? (lang === "hi" ? "नाम और WhatsApp नंबर ज़रूरी है।" : "Name and WhatsApp number are needed.") : t.draftFail);
  };

  const steps: Step[] = ["business", "departments", "tell", "ask", "plan"];
  const progress = step === "signin" ? 0 : step === "done" ? 1 : (steps.indexOf(step) + 1) / (steps.length + 1);

  return (
    <div className="min-h-dvh">
      <TopBar showBack={false} onBack={() => {}} />
      <main className="mx-auto max-w-2xl px-5 pb-20 pt-6 sm:px-8 sm:pt-10">
        <p className="text-base font-semibold text-brand-luq">{t.kicker}</p>
        <h1 className="mt-2 text-balance font-display text-3xl font-bold leading-tight sm:text-5xl"><span className="text-gradient-accent">{t.title}</span></h1>
        {step === "signin" && <p className="mt-3 max-w-xl text-lg text-muted">{t.sub}</p>}
        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-panel/60"><div className="h-full rounded-full bg-brand-luq transition-all" style={{ width: `${Math.round(progress * 100)}%` }} /></div>

        {err && <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{err}</p>}

        {step === "signin" && <SignIn t={t} lang={lang} auth={auth} onDone={signedIn} />}

        {step === "business" && (
          <Section title={t.businessTitle}>
            <Tiles items={BUSINESS} lang={lang} value={[business]} onPick={(id) => { setBusiness(id); setStep("departments"); }} />
          </Section>
        )}

        {step === "departments" && (
          <Section title={t.deptTitle} sub={t.deptSub}>
            <Tiles items={DEPTS} lang={lang} value={depts} onPick={(id) => setDepts((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]))} />
            <Nav t={t} onBack={() => setStep("business")} onNext={() => setStep("tell")} nextDisabled={depts.length === 0} />
          </Section>
        )}

        {step === "tell" && (
          <Section title={t.tellTitle} sub={t.tellSub}>
            <textarea className={`${inputClass} min-h-[10rem]`} value={text} onChange={(e) => setText(e.target.value)} placeholder={t.placeholder} />
            <Recorder t={t} lang={lang} onText={(s) => setText((v) => (v ? v + "\n" : "") + s)} />
            <Nav t={t} onBack={() => setStep("departments")} onNext={() => { if (text.trim().length < 30) { setErr(t.needMore); return; } setErr(""); askNext(history); }} nextDisabled={busy !== ""} busy={busy === "ask" || busy === "draft" ? (busy === "draft" ? t.drafting : "…") : ""} />
          </Section>
        )}

        {step === "ask" && question && (
          <Section title={t.askTitle}>
            {history.map((h, i) => (
              <div key={i} className="mb-3 rounded-2xl border border-hairline/15 bg-panel/30 px-4 py-3 text-sm"><p className="font-semibold text-fg">{h.q}</p><p className="mt-1 text-muted">{h.a}</p></div>
            ))}
            <p className="text-lg font-semibold text-fg">{question}</p>
            <textarea className={`${inputClass} mt-3 min-h-[6rem]`} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={t.answer} />
            <Recorder t={t} lang={lang} onText={(s) => setAnswer((v) => (v ? v + " " : "") + s)} />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" disabled={busy !== "" || !answer.trim()} onClick={() => { const h = [...history, { q: question, a: answer.trim() }]; setHistory(h); askNext(h); }} className="inline-flex items-center gap-2 rounded-full bg-fg px-6 py-3 text-base font-bold text-[rgb(var(--c-base))] disabled:opacity-60">
                {busy ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />} {busy === "draft" ? t.drafting : t.next}
              </button>
              <button type="button" disabled={busy !== ""} onClick={() => draft(history)} className="rounded-full px-4 py-3 text-sm font-semibold text-muted">{t.skip}</button>
            </div>
          </Section>
        )}

        {step === "plan" && brd && (
          <Section title={t.planTitle} sub={t.planSub}>
            <Plan t={t} brd={brd} onChange={setBrd} />
            <h3 className="mt-8 font-display text-xl font-bold text-fg">{t.contactTitle}</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input className={inputClass} placeholder={t.name} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
              <input className={inputClass} placeholder={t.phone} inputMode="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
              <input className={inputClass} placeholder={t.email} inputMode="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
              <input className={inputClass} placeholder={t.company} value={contact.company} onChange={(e) => setContact({ ...contact, company: e.target.value })} />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" disabled={busy !== "" || !contact.name.trim() || contact.phone.replace(/\D/g, "").length < 10} onClick={submit} className="inline-flex items-center gap-2 rounded-full bg-fg px-6 py-3.5 text-lg font-bold text-[rgb(var(--c-base))] shadow-lg disabled:opacity-60">
                {busy === "submit" ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} {busy === "submit" ? t.sending : t.send}
              </button>
              <button type="button" onClick={() => setStep("tell")} className="rounded-full px-4 py-3 text-sm font-semibold text-muted">{t.back}</button>
            </div>
          </Section>
        )}

        {step === "done" && (
          <Section title={t.doneTitle} sub={t.doneSub}>
            <div className="flex flex-wrap gap-3">
              {bookingUrl && <a href={bookingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-fg px-5 py-3 text-base font-bold text-[rgb(var(--c-base))] shadow-lg"><CalendarClock size={18} /> {t.book}</a>}
              {cfg?.whatsapp && <a href={`https://wa.me/${cfg.whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-success/15 px-5 py-3 text-base font-bold text-success ring-1 ring-success/30"><MessageCircle size={18} /> {t.wa}</a>}
              <Link to="/" className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-muted">{t.home}</Link>
            </div>
          </Section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl font-bold text-fg sm:text-3xl">{title}</h2>
      {sub && <p className="mt-1.5 text-base text-muted">{sub}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Nav({ t, onBack, onNext, nextDisabled, busy }: { t: (typeof C)["en"]; onBack: () => void; onNext: () => void; nextDisabled?: boolean; busy?: string }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <button type="button" disabled={nextDisabled} onClick={onNext} className="inline-flex items-center gap-2 rounded-full bg-fg px-6 py-3 text-base font-bold text-[rgb(var(--c-base))] shadow-lg disabled:opacity-60">
        {busy ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />} {busy || t.next}
      </button>
      <button type="button" onClick={onBack} className="rounded-full px-4 py-3 text-sm font-semibold text-muted">{t.back}</button>
    </div>
  );
}

function Tiles({ items, lang, value, onPick }: { items: readonly (readonly [string, string, string])[]; lang: "en" | "hi"; value: string[]; onPick: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {items.map(([id, en, hi]) => {
        const on = value.includes(id);
        return (
          <button key={id} type="button" onClick={() => onPick(id)} aria-pressed={on}
            className={`min-h-[4.25rem] rounded-2xl border px-3 py-3 text-left text-base font-semibold leading-snug transition ${on ? "border-brand-luq bg-brand-luq/15 text-brand-luq" : "border-hairline/20 bg-panel/40 text-fg hover:border-hairline/40"}`}>
            {on && <Check size={14} className="mb-1 inline-block" />} {lang === "hi" ? hi : en}
          </button>
        );
      })}
    </div>
  );
}

/** Hold-to-talk. Records with the browser, sends the clip up to be written down. */
function Recorder({ t, lang, onText }: { t: (typeof C)["en"]; lang: string; onText: (s: string) => void }) {
  const [state, setState] = useState<"idle" | "rec" | "busy" | "unsupported">(() => (typeof MediaRecorder === "undefined" ? "unsupported" : "idle"));
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const start = async () => {
    if (state !== "idle") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported(m)) || "";
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      r.onstop = async () => {
        stream.getTracks().forEach((x) => x.stop());
        const blob = new Blob(chunks.current, { type: r.mimeType || mime || "audio/webm" });
        if (blob.size < 2000) { setState("idle"); return; }
        setState("busy");
        const b64 = await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1] || ""); fr.readAsDataURL(blob); });
        const d = await api("/api/intake", { action: "transcribe", mime: blob.type.split(";")[0], audio: b64, ctx: { lang } });
        if (d.ok && d.text) onText(String(d.text));
        setState("idle");
      };
      rec.current = r;
      r.start();
      setState("rec");
    } catch {
      setState("unsupported");
    }
  };
  const stop = () => { if (rec.current && rec.current.state !== "inactive") rec.current.stop(); };
  if (state === "unsupported") return null;
  return (
    <button type="button"
      onPointerDown={(e) => { e.preventDefault(); start(); }} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      className={`mt-3 inline-flex min-h-[3.25rem] select-none items-center gap-2 rounded-full px-5 py-3 text-base font-bold shadow-lg ${state === "rec" ? "bg-danger text-white" : "bg-brand-luq/15 text-brand-luq ring-1 ring-brand-luq/40"}`}>
      {state === "rec" ? <Square size={18} /> : state === "busy" ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
      {state === "rec" ? t.recording : state === "busy" ? t.transcribing : t.hold}
    </button>
  );
}

function Plan({ t, brd, onChange }: { t: (typeof C)["en"]; brd: Brd; onChange: (b: Brd) => void }) {
  const [editing, setEditing] = useState(false);
  const list = (title: string, key: "goals" | "users" | "integrations" | "open_questions") => brd[key].length > 0 && (
    <div>
      <p className="font-semibold text-fg">{title}</p>
      {editing ? <textarea className={`${inputClass} mt-1 text-sm`} rows={3} value={brd[key].join("\n")} onChange={(e) => onChange({ ...brd, [key]: e.target.value.split("\n").filter((x) => x.trim()) })} />
        : <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">{brd[key].map((x, i) => <li key={i}>{x}</li>)}</ul>}
    </div>
  );
  return (
    <div className="space-y-4 rounded-2xl border border-hairline/15 bg-panel/30 p-5 text-base">
      <div className="flex items-start justify-between gap-3">
        {editing ? <input className={inputClass} value={brd.title} onChange={(e) => onChange({ ...brd, title: e.target.value })} /> : <p className="font-display text-xl font-bold text-fg">{brd.title}</p>}
        <button type="button" onClick={() => setEditing((v) => !v)} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-hairline/25 px-3 py-1.5 text-sm font-semibold text-muted"><Pencil size={13} /> {editing ? t.editDone : t.edit}</button>
      </div>
      {editing ? <textarea className={inputClass} rows={5} value={brd.summary} onChange={(e) => onChange({ ...brd, summary: e.target.value })} /> : <p className="text-fg">{brd.summary}</p>}
      {list(t.goals, "goals")}
      {list(t.users, "users")}
      {brd.scenarios.map((s, i) => (
        <div key={i}>
          <p className="font-semibold text-fg">{t.scenarios} · {s.name}</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-muted">{s.steps.map((x, j) => <li key={j}>{x}</li>)}</ol>
        </div>
      ))}
      {list(t.integrations, "integrations")}
      {brd.timeline && <p className="text-muted"><b className="text-fg">{t.timeline}:</b> {brd.timeline}</p>}
      {list(t.open, "open_questions")}
    </div>
  );
}

function SignIn({ t, lang, auth, onDone }: { t: (typeof C)["en"]; lang: string; auth: { email: boolean; whatsapp: boolean; google: boolean }; onDone: (d: any) => void }) {
  const [channel, setChannel] = useState<"email" | "whatsapp">(auth.email || !auth.whatsapp ? "email" : "whatsapp");
  const [name, setName] = useState("");
  const [to, setTo] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const errText = (e: string) => e === "wrong_code" ? t.wrong : e === "expired" ? t.expired : e === "too_many" ? t.tooMany : t.sendFail;
  const send = async () => {
    setBusy(true); setErr("");
    const d = await api("/api/auth/otp", { action: "start", channel, to, name, lang });
    setBusy(false);
    if (d.ok) { setSent(d.to); setCode(""); } else setErr(errText(d.error));
  };
  const verify = async () => {
    setBusy(true); setErr("");
    const d = await api("/api/auth/otp", { action: "verify", channel, to, code });
    setBusy(false);
    if (d.ok) onDone(d); else setErr(errText(d.error));
  };
  return (
    <Section title={t.signinTitle} sub={t.signinSub}>
      {auth.google && (
        <a href={`/api/auth/google?next=/start&lang=${lang}`} className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-hairline/25 bg-panel/40 px-5 py-3.5 text-base font-bold text-fg">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.5 2.9-2.2 5.4-4.7 7.1l7.6 5.9c4.4-4.1 6.9-10.1 6.9-17z"/><path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.7-4.1-13.6-9.9l-7.8 6C6.5 42.6 14.6 48 24 48z"/></svg>
          {t.google}
        </a>
      )}
      <div className="space-y-3">
        <input className={inputClass} placeholder={t.name} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        {!sent ? (
          <>
            <div className="flex gap-2">
              <input className={inputClass} placeholder={channel === "email" ? t.email : t.phone} inputMode={channel === "email" ? "email" : "tel"} value={to} onChange={(e) => setTo(e.target.value)} autoComplete={channel === "email" ? "email" : "tel"} />
              <button type="button" disabled={busy || !to.trim()} onClick={send} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-fg px-5 py-3 text-base font-bold text-[rgb(var(--c-base))] disabled:opacity-60">
                {busy ? <Loader2 size={18} className="animate-spin" /> : channel === "email" ? <Mail size={18} /> : <MessageCircle size={18} />} {t.sendCode}
              </button>
            </div>
            {auth.whatsapp && auth.email && (
              <button type="button" onClick={() => { setChannel(channel === "email" ? "whatsapp" : "email"); setTo(""); }} className="text-sm font-semibold text-brand-luq">{channel === "email" ? t.orWhatsapp : t.orEmail}</button>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-muted">{t.codeSent} <b className="text-fg">{sent}</b></p>
            <div className="flex gap-2">
              <input className={`${inputClass} tracking-[0.3em]`} placeholder={t.code} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoComplete="one-time-code" />
              <button type="button" disabled={busy || code.length !== 6} onClick={verify} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-fg px-5 py-3 text-base font-bold text-[rgb(var(--c-base))] disabled:opacity-60">
                {busy ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />} {t.verify}
              </button>
            </div>
            <button type="button" onClick={() => { setSent(""); setCode(""); }} className="text-sm font-semibold text-muted">{t.resend}</button>
          </>
        )}
        {err && <p className="text-sm font-semibold text-danger">{err}</p>}
      </div>
    </Section>
  );
}
