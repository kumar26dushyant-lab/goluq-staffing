import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, MessageCircle, Mail, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { submitLead, fetchPublicConfig } from "../../lib/lead";
import { Button } from "../ui/Button";
import type { Region } from "../../content/buildPricing";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ARCHITECT_EMAIL = "dushyant@goluq.com";

/**
 * Architecture-call enquiry. Reuses the existing /api/lead pipeline (D1 + owner
 * WhatsApp alert) rather than introducing a second lead store, tagging the row
 * via crossSell so build enquiries are separable from Digital Employee trials.
 */
export function BuildEnquiryForm({ region, ns }: { region: Region; ns: string }) {
  const { t } = useTranslation();
  const intl = region === "global";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [wa, setWa] = useState("");

  useEffect(() => {
    fetchPublicConfig().then((c) => setWa(c.whatsapp));
  }, []);

  const phoneClean = phone.replace(/[\s-]/g, "");
  const phoneValid = intl
    ? /^\+?[1-9]\d{7,14}$/.test(phoneClean)
    : /^[6-9]\d{9}$/.test(phoneClean);

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (name.trim().length < 2) return setErr(t("booking.errName"));
    if (!phoneValid)
      return setErr(intl ? "Enter a valid phone number with country code." : t("booking.errPhone"));
    if (email && !EMAIL_RE.test(email)) return setErr(t("booking.errEmail"));

    setErr(null);
    setStatus("sending");
    try {
      await submitLead({
        name: name.trim(),
        phone: phoneClean,
        email: email.trim() || undefined,
        message: `[CUSTOM BUILD ENQUIRY · ${region.toUpperCase()}] ${message.trim()}`,
        crossSell: ["custom-build"],
        wantsTraining: false,
        intl,
      });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass glow-teal rounded-2xl p-8 text-center"
      >
        <CheckCircle2 size={44} className="mx-auto text-success" />
        <p className="mt-4 font-display text-xl font-bold text-fg">{t("booking.successTitle")}</p>
        <p className="mt-2 text-base text-muted">
          {intl
            ? "The Principal Architect will be in touch by email to schedule the session."
            : t("booking.successBody")}
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="glass rounded-2xl p-6 sm:p-7" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("booking.name")} id="b-name">
          <input
            id="b-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("booking.namePh")}
            autoComplete="name"
            className={INPUT}
          />
        </Field>
        <Field
          label={intl ? "Phone (with country code)" : t("booking.phone")}
          id="b-phone"
        >
          <input
            id="b-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={intl ? "+1 555 000 1234" : t("booking.phonePh")}
            inputMode="tel"
            autoComplete="tel"
            className={INPUT}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label={intl ? "Work email" : t("booking.email")} id="b-email">
          <input
            id="b-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("booking.emailPh")}
            inputMode="email"
            autoComplete="email"
            className={INPUT}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label={t("booking.message")} id="b-msg">
          <textarea
            id="b-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className={`${INPUT} resize-y`}
          />
        </Field>
      </div>

      {err && (
        <p role="alert" className="mt-3 flex items-center gap-2 text-sm font-semibold text-danger">
          <AlertTriangle size={15} /> {err}
        </p>
      )}
      {status === "error" && (
        <p role="alert" className="mt-3 text-sm font-semibold text-danger">
          {t("booking.errorBody")}
        </p>
      )}

      <Button type="submit" size="lg" full className="mt-6" disabled={status === "sending"}>
        {status === "sending" ? t("booking.submitting") : t(`${ns}.final.cta`)}
      </Button>

      <p className="mt-3 text-center text-sm text-faint">{t(`${ns}.hero.ctaNote`)}</p>

      <div className="mt-5 flex flex-wrap justify-center gap-3 border-t border-hairline/10 pt-5">
        {!intl && wa && (
          <a
            href={`https://wa.me/${wa.replace(/\D/g, "")}?text=${encodeURIComponent(
              "Hi GoLuQ — I have a question about a custom software build."
            )}`}
            target="_blank"
            rel="noreferrer"
            className="glass glass-interactive inline-flex items-center gap-2 rounded-full px-5 py-3 text-base font-semibold text-fg"
          >
            <MessageCircle size={17} className="text-brand-luq" /> {t(`${ns}.final.alt`)}
          </a>
        )}
        <a
          href={`mailto:${ARCHITECT_EMAIL}?subject=${encodeURIComponent(
            "Architecture session request"
          )}`}
          className="glass glass-interactive inline-flex items-center gap-2 rounded-full px-5 py-3 text-base font-semibold text-fg"
        >
          <Mail size={17} className="text-brand-luq" /> {ARCHITECT_EMAIL}
        </a>
      </div>
    </form>
  );
}

const INPUT =
  "w-full rounded-xl border border-hairline/15 bg-panel/40 px-4 py-3 text-base text-fg placeholder:text-faint focus:border-teal-glow/50 focus:outline-none focus:ring-2 focus:ring-teal-glow/30";

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
