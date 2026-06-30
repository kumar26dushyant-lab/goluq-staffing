import { Linkedin, Mail, BadgeCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LINKEDIN_URL } from "../pages/About";

/**
 * Homepage founder teaser — condensed trust block linking to the full /about
 * page. Real human, LinkedIn, and a direct email (dushyant@goluq.com).
 */
export function AboutSection({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const name = t("about.name");
  const email = t("about.emailValue");

  return (
    <section className={className}>
      <p className="font-mono text-sm uppercase tracking-[0.28em] text-brand-luq">{t("about.kicker")}</p>

      <div className="border-gradient glow-violet mt-4 flex flex-col gap-6 rounded-3xl bg-panel/40 p-6 sm:flex-row sm:items-center sm:p-8">
        <img
          src="/founder.png"
          alt={name}
          className="h-28 w-28 shrink-0 rounded-2xl object-cover ring-2 ring-teal-glow/40"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-2xl font-bold text-fg">{name}</h3>
            <BadgeCheck size={20} className="text-brand-luq" />
          </div>
          <p className="mt-0.5 text-base font-semibold text-brand-luq">{t("about.role")}</p>
          <p className="mt-3 text-base leading-relaxed text-muted sm:text-lg">{t("about.bioShort")}</p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              to="/about"
              className="inline-flex items-center gap-2 rounded-full bg-teal-glow/15 px-5 py-2.5 text-base font-semibold text-brand-luq ring-1 ring-teal-glow/30"
            >
              {t("about.readMore")} <ArrowRight size={16} />
            </Link>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-base font-semibold text-white"
              style={{ background: "#0A66C2" }}
            >
              <Linkedin size={18} /> {t("about.linkedin")}
            </a>
            <a
              href={`mailto:${email}`}
              className="glass glass-interactive inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-base font-semibold text-fg"
            >
              <Mail size={18} className="text-brand-luq" /> {email}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
