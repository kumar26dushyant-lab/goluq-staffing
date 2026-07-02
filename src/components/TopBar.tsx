import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, TrendingUp, Volume2, VolumeX } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandMark } from "./BrandMark";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";
import { useVoice } from "../lib/voice";

function VoiceToggle() {
  const { supported, muted, toggleMute } = useVoice();
  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={toggleMute}
      aria-label={muted ? "Unmute guide" : "Mute guide"}
      className="glass glass-interactive grid h-11 w-11 place-items-center rounded-full"
    >
      {muted ? <VolumeX size={18} className="text-muted" /> : <Volume2 size={18} className="text-brand-luq" />}
    </button>
  );
}

export function TopBar({
  showBack,
  onBack,
  showPartnerCta = true,
}: {
  showBack: boolean;
  onBack: () => void;
  showPartnerCta?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <header
      className="sticky top-0 z-30 mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-8 sm:py-4"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <AnimatePresence mode="wait">
          {showBack && (
            <motion.button
              key="back"
              type="button"
              onClick={onBack}
              initial={{ opacity: 0, x: -8, width: 0 }}
              animate={{ opacity: 1, x: 0, width: "auto" }}
              exit={{ opacity: 0, x: -8, width: 0 }}
              className="glass glass-interactive grid h-10 w-10 place-items-center rounded-full"
              aria-label={t("common.back")}
            >
              <ArrowLeft size={18} className="text-brand-luq" />
            </motion.button>
          )}
        </AnimatePresence>
        <Link to="/" aria-label="GoLuQ home">
          <BrandMark className="text-xl sm:text-2xl" />
        </Link>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
        {showPartnerCta && (
          <Link
            to="/about"
            className="hidden rounded-full px-3 py-2 text-sm font-semibold text-muted hover:text-fg md:block"
          >
            {t("about.navTitle")}
          </Link>
        )}
        {showPartnerCta && (
          <Link
            to="/partner"
            className="glass glass-interactive hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-muted hover:text-fg sm:flex"
          >
            <TrendingUp size={15} className="text-brand-luq" />
            {t("common.partner")}
          </Link>
        )}
        <VoiceToggle />
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
