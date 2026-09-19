import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import {
  MousePointerClick, Users, TrendingUp, Copy, Check, MessageCircle,
  LogOut, RefreshCw, Wallet,
} from "lucide-react";
import { TopBar } from "../components/TopBar";
import { BrandMark } from "../components/BrandMark";
import { Button } from "../components/ui/Button";
import { inputClass } from "../lib/ui";
import {
  affLogin, affForgot, affLogout, affStats, getAffToken, setAffToken,
  type AffiliateStats,
} from "../lib/affiliateApi";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    .format(Math.round(n || 0));

/**
 * Route "/partner/dashboard" — the partner's own account.
 *
 * Previously this was a secret URL: lose the WhatsApp message and the account
 * was gone forever. It is now a real login (phone + password, reset by email),
 * and it shows the partner what actually happened to each business they
 * referred plus the commission ledger behind their earnings — because a number
 * with no workings behind it is exactly what makes people distrust a scheme.
 *
 * The legacy `?token=` link still works so existing partners aren't locked out.
 */
/**
 * The partner kit — everything a new partner needs on day one, in the
 * dashboard: their link and QR, the cards to forward with the link already in
 * the caption, message scripts for each channel, and the four steps. Nothing
 * here states a commission rate; the live terms are one tap away.
 */
function PartnerKit({ code, shareUrl, name }: { code: string; shareUrl: string; name: string }) {
  const { i18n } = useTranslation();
  const hi = i18n.language.startsWith("hi");
  const [qr, setQr] = useState("");
  const [copiedKey, setCopiedKey] = useState("");
  useEffect(() => { QRCode.toDataURL(shareUrl, { width: 320, margin: 1, color: { dark: "#0E1629", light: "#FFFFFF" } }).then(setQr).catch(() => {}); }, [shareUrl]);
  const wa = `https://wa.me/918349504400?text=${encodeURIComponent(`Hi GoLuQ, ref ${code}`)}`;
  const cards = [
    ["whatsappOffice", "WhatsApp Office"], ["whatsappStore", "WhatsApp Store"], ["for_coaching", "For coaching institutes"], ["for_clinic", "For clinics"],
    ["for_garment", "For garment wholesalers"], ["for_distributor", "For distributors"], ["dept_crm", "CRM & sales pipeline"], ["dept_billing", "Billing & GST"],
    ["founder", "Meet the founder"],
    ["aff_office", "Become a partner"], ["aff_network", "Your network is the business"], ["aff_share", "Share, that is the job"], ["aff_earn", "What a partner earns"], ["aff_steps", "Steps to the first order"], ["aff_kit", "Your partner kit"],
    ["aff_who", "Who makes a good partner"], ["aff_income", "One introduction, two incomes"], ["aff_whitelabel", "Your name on the software"], ["aff_first", "The easiest first introduction"], ["aff_payout", "Paid simply"], ["aff_nowork", "What a partner never does"],
  ];
  const scripts = hi ? [
    ["WhatsApp स्टेटस / ग्रुप", `${name} की ओर से: क्या आपका बिज़नेस फ़ोन पर अटका रहता है? GoLuQ.com सॉफ़्टवेयर, WhatsApp सिस्टम और टोल-फ़्री लाइन बनाता है — तय कीमत, हफ़्तों में। पहले लिखित प्लान, फिर कोटेशन: ${shareUrl}`],
    ["Facebook / Instagram कैप्शन", `बिलिंग वाला छुट्टी पर है तो सब कुछ छुट्टी पर? GoLuQ.com काम को सिस्टम में लाता है — CRM, बिलिंग, इन्वेंटरी, WhatsApp। लिखित प्लान मुफ़्त: ${shareUrl}`],
    ["सीधा मैसेज (दुकानदार / क्लिनिक)", `नमस्ते, आपकी दुकान/क्लिनिक के लिए एक चीज़ दिखानी है — पेमेंट रिमाइंडर, बुकिंग और ग्राहक फ़ॉलो-अप अपने आप, आपके WhatsApp नंबर से। 2 मिनट में देखिए: ${shareUrl}`],
  ] : [
    ["WhatsApp status / groups", `From ${name}: is your business stuck on the phone? GoLuQ.com builds the software, WhatsApp systems and toll-free lines a growing business runs on — fixed price, weeks not months. Written plan first, then a quote: ${shareUrl}`],
    ["Facebook / Instagram caption", `When the billing man is on leave, is everything on leave? GoLuQ.com moves the work into a system — CRM, billing, inventory, WhatsApp. Free written plan: ${shareUrl}`],
    ["Direct message (shop / clinic owner)", `Hi, one thing worth two minutes for your shop/clinic — payment reminders, bookings and customer follow-ups that run by themselves from your own WhatsApp number. Have a look: ${shareUrl}`],
  ];
  const copy = (k: string, v: string) => { navigator.clipboard?.writeText(v); setCopiedKey(k); setTimeout(() => setCopiedKey(""), 1500); };
  return (
    <div className="glass mt-6 rounded-2xl p-5">
      <p className="font-display text-lg font-bold text-fg">{hi ? "आपका पार्टनर किट" : "Your partner kit"}</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-fg">
        {(hi
          ? ["साइन-अप हो गया — यह किट आपका है।", "नीचे के कार्ड, रील और संदेश अपने सोशल मीडिया पर डालिए और अपने नेटवर्क में भेजिए।", "कोई बिज़नेस रुचि दिखाए तो हमें सिर्फ़ ज़रूरत भेजिए — ग्राहक की जानकारी नहीं।", "GoLuQ टीम के साथ 30 मिनट की कॉल बुक कीजिए; हम मिलकर तय करते हैं।", "हर ऑर्डर पर हिस्सा, मैनेज्ड ग्राहकों पर हर महीने, अपसेल पर ज़्यादा — शर्तें कॉल पर तय। व्हाइट-लेबल सॉफ़्टवेयर भी संभव है।"]
          : ["You are signed up — this kit is yours.", "Post the cards, reels and messages below on your social media and share them in your own network.", "When a business shows interest, send us only the requirement — not the client's details.", "Book a 30-minute call with the GoLuQ team; we finalise it together.", "A share on every order, monthly on managed customers, more on upsells — terms agreed on the call. White-label software under your own name is possible too."]
        ).map((x, i) => <li key={i}>{x}</li>)}
      </ol>
      <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]">
        <div className="rounded-2xl bg-white p-2">{qr && <img src={qr} alt="QR" className="w-full" />}</div>
        <div className="space-y-2 text-sm">
          <p className="text-muted">{hi ? "आपका कोड" : "Your code"}: <b className="font-mono text-fg">{code}</b></p>
          <p className="text-muted">{hi ? "WhatsApp पर सीधे भेजने के लिए (आपका कोड जुड़ा है)" : "Send someone straight to our WhatsApp (your code attached)"}:</p>
          <p className="break-all font-mono text-xs text-brand-luq">{wa}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="md" variant="secondary" onClick={() => copy("wa", wa)}>{copiedKey === "wa" ? <Check size={16} /> : <Copy size={16} />} {hi ? "WhatsApp लिंक कॉपी" : "Copy WhatsApp link"}</Button>
            {qr && <a href={qr} download={`goluq-partner-${code}.png`}><Button size="md" variant="secondary">QR PNG</Button></a>}
          </div>
        </div>
      </div>
      <p className="mt-5 font-semibold text-fg">{hi ? "कार्ड — दबाकर सेव करें, लिंक के साथ भेजें" : "Cards — save and forward with your link"}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {cards.map(([id, label]) => (
          <a key={id} href={`/catalog/${hi ? "hi/" : ""}${id}.jpg`} download className="overflow-hidden rounded-xl border border-hairline/15">
            <img src={`/catalog/${hi ? "hi/" : ""}${id}.jpg`} alt={label} loading="lazy" className="aspect-square w-full object-cover" />
            <p className="truncate px-2 py-1 text-xs text-muted">{label}</p>
          </a>
        ))}
      </div>
      <p className="mt-5 font-semibold text-fg">{hi ? "तैयार संदेश — कॉपी करके भेजें" : "Ready messages — copy and send"}</p>
      <div className="mt-2 space-y-2">
        {scripts.map(([k, v]) => (
          <div key={k} className="rounded-xl border border-hairline/15 bg-panel/30 p-3">
            <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-faint">{k}</p><button type="button" onClick={() => copy(k, v)} className="text-xs font-semibold text-brand-luq">{copiedKey === k ? (hi ? "कॉपी हो गया" : "Copied") : (hi ? "कॉपी" : "Copy")}</button></div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-fg">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PartnerDashboard() {
  const { t } = useTranslation();
  const legacy = new URLSearchParams(window.location.search).get("token") || "";

  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await affStats(legacy || undefined);
    setStats(d?.ok ? d : null);
    setLoading(false);
  }, [legacy]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <Shell><p className="text-center text-muted">{t("partner.dash.loading")}</p></Shell>;
  }

  if (!stats?.affiliate) {
    return <SignIn onIn={load} hadLegacy={!!legacy} />;
  }

  const a = stats.affiliate;
  const total = stats.earnings.pending + stats.earnings.approved + stats.earnings.paid;

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-fg sm:text-3xl">
          {t("partner.dash.greeting")}, {a.name} 👋
        </h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" onClick={load}><RefreshCw size={16} /></Button>
          <Button variant="secondary" size="md"
            onClick={async () => { await affLogout(); window.location.href = "/partner"; }}>
            <LogOut size={16} /> {t("partner.dash.signOut")}
          </Button>
        </div>
      </div>

      {/* Share link */}
      <div className="glass mt-6 rounded-2xl p-5">
        <p className="text-sm text-muted">{t("partner.done.shareLabel")}</p>
        <p className="mt-1 break-all font-mono text-sm text-brand-luq">{a.shareUrl}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="md" variant="secondary"
            onClick={() => { navigator.clipboard?.writeText(a.shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? t("partner.done.copied") : t("partner.done.copy")}
          </Button>
          <a href={`https://wa.me/?text=${encodeURIComponent(a.shareUrl)}`} target="_blank" rel="noreferrer">
            <Button size="md"><MessageCircle size={16} /> {t("partner.done.whatsapp")}</Button>
          </a>
        </div>
      </div>

      <PartnerKit code={a.code} shareUrl={a.shareUrl} name={a.name} />

      {/* Headline numbers */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<MousePointerClick size={18} />} label={t("partner.dash.clicks")} value={String(stats.clicks)} />
        <Stat icon={<Users size={18} />} label={t("partner.dash.leads")} value={String(stats.leads)} />
        <Stat icon={<TrendingUp size={18} />} label={t("partner.dash.conversions")} value={String(stats.conversions)} />
        <Stat icon={<Wallet size={18} />} label={t("partner.dash.earnings")} value={inr(total)} accent />
      </div>

      {/* Money, broken down */}
      <div className="glass mt-5 rounded-2xl p-5">
        <p className="font-display font-semibold text-fg">{t("partner.dash.earnings")}</p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Earn label={t("partner.dash.pending")} v={stats.earnings.pending} />
          <Earn label={t("partner.dash.approved")} v={stats.earnings.approved} />
          <Earn label={t("partner.dash.paid")} v={stats.earnings.paid} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-faint">
          {t("partner.dash.rateNote", {
            rate: Math.round(stats.rates.rate * 100),
            months: stats.rates.enhancementMonths,
            min: inr(stats.rates.minPayoutInr),
          })}
        </p>
      </div>

      {/* Their own referrals — what actually happened to each */}
      <div className="glass mt-5 overflow-hidden rounded-2xl">
        <p className="border-b border-hairline/10 p-5 font-display font-semibold text-fg">
          {t("partner.dash.referrals")}
        </p>
        {stats.referrals.length === 0 ? (
          <p className="p-5 text-sm text-muted">{t("partner.dash.none")}</p>
        ) : (
          <ul className="divide-y divide-hairline/8">
            {stats.referrals.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-fg">{r.name}</p>
                  <p className="text-xs text-faint">
                    {String(r.created_at).slice(0, 10)}
                    {r.industry ? ` · ${r.industry}` : ""}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                  r.converted_at
                    ? "bg-success/15 text-success ring-1 ring-success/30"
                    : "bg-panel/60 text-muted ring-1 ring-hairline/20"
                }`}>
                  {r.converted_at ? t("partner.dash.stConverted") : t(`partner.dash.st_${r.status}`, { defaultValue: r.status })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* The workings behind the earnings figure */}
      <div className="glass mt-5 overflow-hidden rounded-2xl">
        <p className="border-b border-hairline/10 p-5 font-display font-semibold text-fg">
          {t("partner.dash.ledger")}
        </p>
        {stats.ledger.length === 0 ? (
          <p className="p-5 text-sm text-muted">{t("partner.dash.ledgerNone")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-faint">
                <tr className="border-b border-hairline/12">
                  {[t("partner.dash.month"), t("partner.dash.customer"), t("partner.dash.rate"), t("partner.dash.amount"), ""].map((h, i) => (
                    <th key={i} className="p-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.ledger.map((l, i) => (
                  <tr key={i} className="border-b border-hairline/8">
                    <td className="p-3 font-mono text-muted">{l.period_month}</td>
                    <td className="p-3 text-fg">{l.customer || "—"}</td>
                    <td className="p-3 text-muted">{Math.round(l.rate * 100)}%</td>
                    <td className="p-3 font-semibold text-fg">{inr(l.amount_inr)}</td>
                    <td className="p-3 text-xs text-muted">{t(`partner.dash.${l.status}`, { defaultValue: l.status })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-5 text-sm text-muted">{t("partner.dash.payoutBody")}</p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      <TopBar showBack={false} onBack={() => {}} showPartnerCta={false} />
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 pt-4 sm:px-8">{children}</main>
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${accent ? "glass-bright" : "glass"}`}>
      <span className="text-brand-luq">{icon}</span>
      <p className="mt-1.5 text-xs text-muted">{label}</p>
      <p className="font-display text-xl font-bold text-fg">{value}</p>
    </div>
  );
}

function Earn({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-xl border border-hairline/15 bg-panel/40 p-3 text-center">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 font-display text-base font-bold text-fg">{inr(v)}</p>
    </div>
  );
}

/** Phone + password, with an emailed reset — no more unrecoverable secret links. */
function SignIn({ onIn, hadLegacy }: { onIn: () => void; hadLegacy: boolean }) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true); setErr(""); setMsg("");
    const r = await affLogin(phone.replace(/\D/g, ""), pw);
    setBusy(false);
    if (r?.ok && r.token) { setAffToken(r.token); onIn(); }
    else setErr(r?.error || t("partner.login.failed"));
  };

  const forgot = async () => {
    if (!/^\d{10}$/.test(phone.replace(/\D/g, ""))) return setErr(t("partner.reg.errPhone"));
    setBusy(true); setErr(""); setMsg("");
    const r = await affForgot(phone.replace(/\D/g, ""));
    setBusy(false);
    if (r?.ok) setMsg(r.message || t("partner.login.sent"));
    else setErr(r?.error || t("partner.login.failed"));
  };

  return (
    <div className="grid min-h-[70vh] place-items-center">
      <div className="glass w-full max-w-sm rounded-3xl p-8">
        <BrandMark className="text-2xl" />
        <h1 className="mt-4 font-display text-2xl font-bold text-fg">{t("partner.login.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("partner.login.sub")}</p>

        {hadLegacy && !getAffToken() && (
          <p className="mt-3 rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs text-muted">
            {t("partner.login.legacy")}
          </p>
        )}

        <label className="mt-5 block">
          <span className="mb-1.5 block text-sm font-semibold text-muted">{t("partner.reg.phone")}</span>
          <input className={inputClass} value={phone} inputMode="numeric" autoComplete="username"
            placeholder="10-digit mobile" onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="mt-3 block">
          <span className="mb-1.5 block text-sm font-semibold text-muted">{t("partner.login.password")}</span>
          <input type="password" className={inputClass} value={pw} autoComplete="current-password"
            onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        </label>

        {err && <p role="alert" className="mt-2 text-sm text-danger">{err}</p>}
        {msg && <p className="mt-2 text-sm text-success">{msg}</p>}

        <Button full className="mt-5" onClick={submit} disabled={busy}>
          {busy ? "…" : t("partner.login.signIn")}
        </Button>
        <button type="button" onClick={forgot} disabled={busy}
          className="mt-3 w-full text-sm font-semibold text-brand-luq hover:underline">
          {t("partner.login.forgot")}
        </button>
        <a href="/partner" className="mt-4 block text-center text-sm text-muted hover:text-fg">
          {t("partner.login.register")}
        </a>
      </div>
    </div>
  );
}
