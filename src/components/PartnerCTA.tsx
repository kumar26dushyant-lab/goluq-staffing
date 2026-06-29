import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

/** Homepage → affiliate bridge (BUILD_SPEC bot cross-mention). */
export function PartnerCTA({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`glass flex flex-col items-start gap-3 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <p className="flex items-start gap-2.5 text-sm text-muted">
        <TrendingUp size={18} className="mt-0.5 shrink-0 text-brand-luq" />
        {t("partner.crossMention")}
      </p>
      <Link
        to="/partner"
        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-teal-glow/15 px-4 py-2.5 text-sm font-semibold text-brand-luq ring-1 ring-teal-glow/30"
      >
        {t("partner.becomePartner")} <ArrowRight size={15} />
      </Link>
    </motion.div>
  );
}
