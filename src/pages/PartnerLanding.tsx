import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Copy, Check, MessageCircle, ArrowRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TopBar } from "../components/TopBar";
import { StageAssistant } from "../components/StageAssistant";
import { Button } from "../components/ui/Button";
import { EarningsCalculator } from "../components/partner/EarningsCalculator";
import { QuestionChips } from "../components/partner/QuestionChips";
import { AffiliateRegisterForm } from "../components/partner/AffiliateRegisterForm";
import type { AffiliateRegisterResult } from "../lib/affiliate";

type PartnerStep = "intro" | "calculator" | "questions" | "register" | "done";

/** Route "/partner" — the PartnerBot sales flow (BUILD_SPEC §10A). */
export function PartnerLanding() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [step, setStep] = useState<PartnerStep>("intro");
  const [result, setResult] = useState<AffiliateRegisterResult | null>(null);

  const fade = reduced
    ? {}
    : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 } };

  return (
    <div className="relative min-h-dvh">
      <TopBar showBack onBack={() => history.length > 1 ? history.back() : (window.location.href = "/")} showPartnerCta={false} />

      <main className="mx-auto w-full max-w-3xl px-5 pb-28 pt-2 sm:px-8">
        {/* Bot guide (always present, auto-speaks) */}
        <StageAssistant line={t("partner.intro")} />

        <AnimatePresence mode="wait">
          {/* INTRO → reveal calculator */}
          {step === "intro" && (
            <motion.div key="intro" {...fade} className="mt-6 flex justify-center">
              <Button size="xl" onClick={() => setStep("calculator")}>
                {t("partner.showMe")} <ArrowRight size={20} />
              </Button>
            </motion.div>
          )}

          {/* CALCULATOR + questions */}
          {(step === "calculator" || step === "questions") && (
            <motion.div key="calc" {...fade} className="mt-6 space-y-6">
              <EarningsCalculator />
              <QuestionChips onRegister={() => setStep("register")} />
              <div className="flex justify-center">
                <Button size="xl" onClick={() => setStep("register")}>
                  {t("partner.guideRegister")} <ArrowRight size={20} />
                </Button>
              </div>
            </motion.div>
          )}

          {/* REGISTER */}
          {step === "register" && (
            <motion.div key="register" {...fade} className="mt-6">
              <AffiliateRegisterForm
                onDone={(r) => {
                  setResult(r);
                  setStep("done");
                }}
              />
            </motion.div>
          )}

          {/* DONE */}
          {step === "done" && result?.ok && (
            <motion.div key="done" {...fade} className="mt-6">
              <DonePanel result={result} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function DonePanel({ result }: { result: AffiliateRegisterResult }) {
  const { t } = useTranslation();
  return (
    <div className="glass-bright rounded-3xl p-6 sm:p-8">
      <h2 className="font-display text-2xl font-bold text-fg">{t("partner.done.title")}</h2>

      <CopyRow label={t("partner.done.shareLabel")} value={result.shareUrl ?? ""} />
      <CopyRow label={t("partner.done.dashLabel")} value={result.dashboardUrl ?? ""} warn />

      <a
        href={`https://wa.me/?text=${encodeURIComponent((result.shareUrl ?? "") + " — " + t("partner.crossMention"))}`}
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-teal-glow/15 px-4 py-2.5 text-sm font-semibold text-brand-luq ring-1 ring-teal-glow/30"
      >
        <MessageCircle size={15} /> {t("partner.done.whatsapp")}
      </a>

      <div className="mt-6 border-t border-hairline/10 pt-5">
        <p className="font-display font-semibold text-fg">{t("partner.done.tipsTitle")}</p>
        <ul className="mt-2 space-y-1.5 text-sm text-muted">
          <li>• {t("partner.done.tip1")}</li>
          <li>• {t("partner.done.tip2")}</li>
          <li>• {t("partner.done.tip3")}</li>
        </ul>
      </div>

      <Link to="/" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-luq">
        <Home size={15} /> {t("partner.backHome")}
      </Link>
    </div>
  );
}

function CopyRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <div className="mt-5">
      <p className="mb-1.5 text-sm font-medium text-muted">{label}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-xl border border-hairline/15 bg-panel/40 px-3 py-2.5 font-mono text-xs text-fg">
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-teal-glow/30 px-3 py-2.5 text-sm font-semibold text-brand-luq"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? t("partner.done.copied") : t("partner.done.copy")}
        </button>
      </div>
      {warn && <p className="mt-1.5 text-xs text-warn">⚠ {t("partner.done.warning")}</p>}
    </div>
  );
}
