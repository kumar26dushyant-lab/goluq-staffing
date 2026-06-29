import { Linkedin, Mail, BadgeCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

// TODO(confirm): set the real LinkedIn profile URL.
const LINKEDIN_URL = "https://www.linkedin.com/in/dushyant-kumar";

/**
 * Trust through a real human — founder profile with LinkedIn + a direct email
 * (dushyant@goluq.com; inbox provisioned at deploy). Emphasis card with a
 * gradient border + colored glow.
 */
export function AboutSection({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const name = t("about.name");
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  const email = t("about.emailValue");

  return (
    <section className={className}>
      <p className="font-mono text-sm uppercase tracking-[0.28em] text-brand-luq">
        {t("about.kicker")}
      </p>
      <h2 className="mt-2 text-balance font-display text-2xl font-bold sm:text-4xl">
        <span className="text-gradient-accent">{t("about.title")}</span>
      </h2>

      <div className="border-gradient glow-violet mt-7 flex flex-col gap-6 rounded-3xl bg-panel/40 p-6 sm:flex-row sm:items-center sm:p-8">
        {/* Avatar */}
        <div className="shrink-0">
          <div
            className="grid h-24 w-24 place-items-center rounded-2xl font-display text-3xl font-bold text-base"
            style={{ background: "linear-gradient(135deg, rgb(var(--c-teal-glow)), #8b7cf6)" }}
          >
            {initials}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-2xl font-bold text-fg">{name}</h3>
            <BadgeCheck size={20} className="text-brand-luq" />
          </div>
          <p className="mt-0.5 text-base font-semibold text-brand-luq">{t("about.role")}</p>
          <p className="mt-3 text-base leading-relaxed text-muted sm:text-lg">{t("about.bio")}</p>

          <div className="mt-5 flex flex-wrap gap-3">
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
          <p className="mt-3 text-sm text-faint">{t("about.note")}</p>
        </div>
      </div>
    </section>
  );
}
