import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, TrendingUp, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteConfig } from "../lib/siteConfig";
import { CountryPicker } from "./CountryPicker";

/**
 * Everything the desktop header shows, reachable on a phone.
 *
 * The header hides Services, Custom builds, About and the partner CTA below md
 * because six controls plus a wordmark will not fit on a 360px row. Hiding them
 * was right; leaving no way to reach them was not — on a site where nearly all
 * traffic is mobile, those pages were effectively unreachable from the header.
 *
 * A sheet rather than a dropdown: taps land where a thumb already is, and the
 * links can be big enough to hit without aiming.
 */
export function MobileNav({ showPartnerCta = true }: { showPartnerCta?: boolean }) {
  const { t } = useTranslation();
  const cfg = useSiteConfig();
  const [open, setOpen] = useState(false);

  // Escape closes it, and the page behind must not scroll while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const rate = Math.round((cfg?.affiliate?.year1 ?? 0.2) * 100);

  const links: { to: string; label: string }[] = [
    { to: "/services", label: t("comms.nav") },
    { to: "/build", label: t("buildIn.nav") },
    ...(showPartnerCta ? [{ to: "/about", label: t("about.navTitle") }] : []),
    { to: "/portal", label: t("footer.portal") },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("nav.open")}
        aria-expanded={open}
        className="glass glass-interactive grid h-11 w-11 place-items-center rounded-full text-muted md:hidden"
      >
        <Menu size={19} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] cursor-default bg-abyss/70 backdrop-blur-sm md:hidden"
            />
            <motion.nav
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="glass fixed inset-x-0 bottom-0 z-[71] rounded-t-3xl p-4 md:hidden"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
              aria-label={t("nav.title")}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-display text-base font-bold text-fg">{t("nav.title")}</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("nav.close")}
                  className="grid h-10 w-10 place-items-center rounded-full text-muted"
                >
                  <X size={19} />
                </button>
              </div>

              <ul className="space-y-1.5">
                {links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      onClick={() => setOpen(false)}
                      className="glass glass-interactive flex items-center justify-between rounded-2xl px-4 py-3.5 text-base font-semibold text-fg"
                    >
                      {l.label}
                      <ArrowRight size={17} className="shrink-0 text-brand-luq" />
                    </Link>
                  </li>
                ))}
                {showPartnerCta && (
                  <li>
                    <Link
                      to="/partner"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-2xl border border-teal-glow/35 bg-teal-glow/[0.10] px-4 py-3.5 text-base font-semibold text-brand-luq"
                    >
                      <span className="flex items-center gap-2">
                        <TrendingUp size={17} />
                        {t("common.partner", { rate })}
                      </span>
                      <ArrowRight size={17} className="shrink-0" />
                    </Link>
                  </li>
                )}
              </ul>

              {/* Currency lives here on a phone; the header has no room for it. */}
              <div className="mt-4 flex items-center justify-between border-t border-hairline/12 pt-4">
                <span className="text-sm text-muted">{t("country.title")}</span>
                <CountryPicker />
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
