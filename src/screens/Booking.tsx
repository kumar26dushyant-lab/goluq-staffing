import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  User,
  Phone,
  Mail,
  GraduationCap,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { RoiScorecard } from "../components/RoiScorecard";
import { CrossSellGrid, type CrossSellId } from "../components/CrossSellGrid";
import { TrustBadges } from "../components/TrustBadges";
import { StageAssistant } from "../components/StageAssistant";
import { Button } from "../components/ui/Button";
import { submitLead, whatsappHref, fetchPublicConfig } from "../lib/lead";
import { inputClass } from "../lib/ui";
import type { RoleId, IndustryId } from "../state/useAppState";

type Status = "idle" | "submitting" | "success" | "error";

const INPUT = inputClass;

/** STEP 5 — Booking & upsell. ROI + lead form + cross-sell + trust + CTA. */
export function Booking({
  role,
  industry,
  onReset,
}: {
  role: RoleId;
  industry: IndustryId;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [crossSell, setCrossSell] = useState<CrossSellId[]>([]);
  const [wantsTraining, setWantsTraining] = useState(true);
  const [otpOpen, setOtpOpen] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string }>({});
  const [status, setStatus] = useState<Status>("idle");
  const [waNumber, setWaNumber] = useState("");

  useEffect(() => { fetchPublicConfig().then((c) => setWaNumber(c.whatsapp)); }, []);

  const toggleCross = (id: CrossSellId) =>
    setCrossSell((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const validate = () => {
    const e: typeof errors = {};
    if (name.trim().length < 2) e.name = t("booking.errName");
    if (!/^[6-9]\d{9}$/.test(phone)) e.phone = t("booking.errPhone");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = t("booking.errEmail");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setStatus("submitting");
    try {
      await submitLead({
        name: name.trim(),
        phone,
        email: email.trim() || undefined,
        message: message.trim() || undefined,
        role,
        industry,
        crossSell,
        wantsTraining,
      });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  // ── Success / error terminal states ──────────────────────────────────────
  if (status === "success") {
    return (
      <Centered>
        <motion.div
          initial={reduced ? false : { scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 16 }}
          className="glass-bright max-w-md rounded-3xl px-8 py-12 text-center"
        >
          <CheckCircle2 size={56} className="mx-auto text-success" style={{ filter: "drop-shadow(0 0 18px rgb(var(--c-success) / 0.6))" }} />
          <h2 className="mt-4 font-display text-3xl font-bold text-fg">{t("booking.successTitle")}</h2>
          <p className="mt-2 text-lg text-muted">{t("booking.successBody")}</p>
          <Button variant="ghost" size="lg" onClick={onReset} className="mt-7">
            {t("booking.startOver")}
          </Button>
        </motion.div>
      </Centered>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-28 pt-4 sm:px-8">
      <StageAssistant line={t("assist.booking")} className="mb-7" />

      {/* ROI scorecard */}
      <RoiScorecard role={role} industry={industry} />

      {/* Lead form card */}
      <div className="glass mt-8 rounded-3xl p-6 sm:p-8">
        <p className="font-mono text-sm uppercase tracking-[0.28em] text-brand-luq">
          {t("booking.formKicker")}
        </p>
        <h2 className="mt-1.5 font-display text-3xl font-bold text-fg sm:text-4xl">{t("booking.formTitle")}</h2>

        <div className="mt-6 space-y-4">
          {/* Name */}
          <Field label={t("booking.name")} required error={errors.name} icon={<User size={16} />}>
            <input
              className={INPUT}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("booking.namePh")}
              autoComplete="name"
            />
          </Field>

          {/* Phone + OTP seam */}
          <Field label={t("booking.phone")} required error={errors.phone} icon={<Phone size={16} />}>
            <div className="flex gap-2">
              <span className="grid shrink-0 place-items-center rounded-xl border border-hairline/15 bg-panel/40 px-3 font-mono text-sm text-muted">
                +91
              </span>
              <input
                className={INPUT}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder={t("booking.phonePh")}
                inputMode="numeric"
                autoComplete="tel"
              />
              <button
                type="button"
                onClick={() => setOtpOpen((v) => !v)}
                className="shrink-0 rounded-xl border border-teal-glow/30 px-3.5 text-sm font-semibold text-brand-luq"
              >
                {t("booking.verify")}
              </button>
            </div>
            {/* OTP styled seam — visual only, does NOT gate submission (TODO: MSG91) */}
            {otpOpen && (
              <div className="mt-2 rounded-xl border border-hairline/12 bg-panel/30 p-3">
                <div className="flex justify-center gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <input
                      key={i}
                      aria-label={`OTP digit ${i + 1}`}
                      maxLength={1}
                      disabled
                      className="h-11 w-10 rounded-lg border border-hairline/20 bg-panel/40 text-center font-mono text-lg text-faint"
                    />
                  ))}
                </div>
                <p className="mt-2 text-center text-xs text-faint">{t("booking.otpNote")}</p>
              </div>
            )}
          </Field>

          {/* Email */}
          <Field label={t("booking.email")} error={errors.email} icon={<Mail size={16} />}>
            <input
              className={INPUT}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("booking.emailPh")}
              autoComplete="email"
            />
          </Field>

          {/* Message */}
          <textarea
            className={`${INPUT} min-h-[88px] resize-y`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("booking.message")}
          />

          {/* Training opt-in (default checked) */}
          <button
            type="button"
            role="checkbox"
            aria-checked={wantsTraining}
            onClick={() => setWantsTraining((v) => !v)}
            className="flex w-full items-center gap-3 rounded-xl border border-teal-glow/25 bg-teal-glow/[0.06] p-3.5 text-left"
          >
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${wantsTraining ? "border-teal-glow bg-teal-glow text-ink" : "border-hairline/30"}`}>
              {wantsTraining && <CheckCircle2 size={13} strokeWidth={3} />}
            </span>
            <span className="flex items-center gap-2 text-base font-semibold text-fg">
              <GraduationCap size={18} className="text-brand-luq" />
              {t("booking.training")}
            </span>
          </button>
        </div>
      </div>

      {/* Cross-sell */}
      <div className="mt-8">
        <h3 className="mb-4 text-balance font-display text-xl font-bold text-fg sm:text-2xl">
          {t("booking.crossTitle")}
        </h3>
        <CrossSellGrid selected={crossSell} onToggle={toggleCross} />
      </div>

      {/* Training reassurance card */}
      <div className="glass-bright mt-8 flex items-start gap-3.5 rounded-2xl p-6">
        <GraduationCap size={26} className="mt-0.5 shrink-0 text-brand-luq" />
        <div>
          <p className="font-display text-xl font-bold text-fg">{t("booking.reassureTitle")}</p>
          <p className="mt-1.5 text-base text-muted">{t("booking.reassureBody")}</p>
        </div>
      </div>

      {/* Trust + CTA */}
      <TrustBadges className="mt-8" />

      {status === "error" && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-danger/40 p-4 text-center" style={{ background: "rgb(var(--c-danger) / 0.1)" }}>
          <p className="flex items-center gap-2 font-semibold text-fg">
            <AlertCircle size={18} className="text-danger" /> {t("booking.errorTitle")}
          </p>
          <p className="text-sm text-muted">{t("booking.errorBody")}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={handleSubmit} className="rounded-full bg-teal-glow/15 px-4 py-2 text-sm font-semibold text-brand-luq ring-1 ring-teal-glow/30">
              {t("booking.retry")}
            </button>
            {waNumber && (
              <a href={whatsappHref(waNumber, { name, phone, role, industry })} target="_blank" rel="noreferrer" className="rounded-full border border-hairline/20 px-4 py-2 text-sm font-semibold text-fg">
                {t("booking.whatsapp")}
              </a>
            )}
          </div>
        </div>
      )}

      <Button
        size="xl"
        full
        onClick={handleSubmit}
        disabled={status === "submitting"}
        className="mt-7"
      >
        {status === "submitting" ? (
          <>
            <Loader2 size={22} className="animate-spin" /> {t("booking.submitting")}
          </>
        ) : (
          <>
            {t("booking.cta")} <ArrowRight size={22} />
          </>
        )}
      </Button>

      <p className="mt-4 flex items-center justify-center gap-2 text-sm text-faint">
        <ShieldCheck size={14} className="text-brand-luq" />
        {t("trust.encrypted")}
      </p>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-6">
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  error,
  icon,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-base font-semibold text-fg">
        {icon && <span className="text-brand-luq">{icon}</span>}
        {label}
        {required && <span className="text-danger">*</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-sm text-danger">{error}</span>}
    </label>
  );
}
