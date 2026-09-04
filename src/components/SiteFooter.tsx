import { useTranslation } from "react-i18next";
import { CountryPicker } from "./CountryPicker";

/**
 * Footer with the legal links.
 *
 * These are plain server-rendered HTML pages, not SPA routes, so they are
 * deliberately real anchors rather than react-router <Link>s — a full page load
 * is what actually reaches /privacy and /terms.
 *
 * They are linked from the site because reviewers (Meta's among them) check that
 * a policy is reachable from the product, not merely that a URL exists.
 */
export function SiteFooter({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer
      className={`mt-20 border-t border-hairline/12 pt-8 text-sm text-muted ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p>© {year} GoLuQ</p>
        {/* Header-hidden on phones, so this is where a mobile visitor changes
            the country their prices are shown in. */}
        <span className="sm:hidden">
          <CountryPicker />
        </span>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <a href="/privacy" className="hover:text-fg">
            {t("footer.privacy")}
          </a>
          <a href="/terms" className="hover:text-fg">
            {t("footer.terms")}
          </a>
          <a href="/portal" className="hover:text-fg">
            {t("footer.portal")}
          </a>
        </nav>
      </div>
    </footer>
  );
}
