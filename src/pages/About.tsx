import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Linkedin,
  Mail,
  BadgeCheck,
  Code2,
  Workflow,
  Layers,
  Target,
  Users,
  Mic,
  Settings2,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { TopBar } from "../components/TopBar";
import { Button } from "../components/ui/Button";
import { BrandText } from "../components/BrandText";
import { BrandMark } from "../components/BrandMark";

// TODO(confirm): real LinkedIn profile URL.
export const LINKEDIN_URL = "https://www.linkedin.com/in/dushyant-sharma-89659b23/";

const CAP_ICONS: LucideIcon[] = [Code2, Workflow, Layers, Target, Users, Mic, Settings2];

/** Route "/about" — full founder + company story (BUILD from user-supplied copy). */
export function About() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const stats = t("about.stats", { returnObjects: true }) as string[];
  const creds = t("about.creds", { returnObjects: true }) as { org: string; detail: string }[];
  const caps = t("about.caps", { returnObjects: true }) as string[];
  const name = t("about.name");
  const email = t("about.emailValue");

  return (
    <div className="relative min-h-dvh">
      <TopBar showBack onBack={() => navigate("/")} />

      <main className="mx-auto w-full max-w-4xl px-5 pb-28 pt-4 sm:px-8">
        {/* Hero */}
        <section className="py-8 text-center sm:py-14">
          <p className="font-mono text-sm uppercase tracking-[0.3em] text-brand-luq">
            {t("about.navTitle")}
          </p>
          <h1 className="mt-4 text-balance font-display text-4xl font-bold leading-[1.1] text-fg sm:text-6xl">
            {t("about.hero1")}
            <br />
            <span className="text-gradient-accent">{t("about.hero2")}</span>
          </h1>
          <p className="mt-5 text-lg italic text-muted sm:text-xl">{t("about.heroSub")}</p>
        </section>

        {/* Stat strip — wrapping glow pills (no scrollbar) */}
        <div className="flex flex-wrap justify-center gap-3">
          {stats.map((s, i) => {
            const [head, ...rest] = s.split(" ");
            return (
              <div key={i} className="glass glow-teal flex items-baseline gap-2 rounded-2xl px-5 py-3">
                <span className="text-gradient-accent font-display text-xl font-bold">{head}</span>
                <span className="text-sm font-semibold text-fg">{rest.join(" ")}</span>
              </div>
            );
          })}
        </div>

        {/* Founder */}
        <Section title={t("about.founderTitle")}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <img
              src="/founder.png"
              alt={name}
              className="h-28 w-28 shrink-0 rounded-2xl object-cover ring-2 ring-teal-glow/40"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-2xl font-bold text-fg">{name}</h3>
                <BadgeCheck size={20} className="text-brand-luq" />
              </div>
              <p className="text-base font-semibold text-brand-luq">{t("about.role")}</p>
            </div>
          </div>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-muted sm:text-lg">
            <p><BrandText text={t("about.founder1")} /></p>
            <p><BrandText text={t("about.founder2")} /></p>
            <p><BrandText text={t("about.founder3")} /></p>
          </div>
          <div className="border-gradient glow-violet mt-6 rounded-2xl bg-panel/40 p-6">
            <p className="font-display text-lg font-semibold text-fg sm:text-xl"><BrandText text={t("about.founderPunch")} /></p>
          </div>
        </Section>

        {/* Credentials */}
        <Section title={t("about.credTitle")} sub={t("about.credSub")}>
          <div className="grid gap-4 sm:grid-cols-2">
            {creds.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass flex gap-3 rounded-2xl p-5"
              >
                <BadgeCheck size={22} className="mt-0.5 shrink-0 text-brand-luq" />
                <div>
                  <p className="font-display font-bold text-fg">{c.org}</p>
                  <p className="mt-1 text-sm text-muted">{c.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* Capabilities */}
        <Section title={t("about.capTitle")} sub={t("about.capSub")}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {caps.map((cap, i) => {
              const Icon = CAP_ICONS[i % CAP_ICONS.length];
              return (
                <div key={i} className="glass glass-interactive flex items-center gap-3 rounded-2xl p-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-glow/12 text-brand-luq ring-1 ring-teal-glow/25">
                    <Icon size={20} />
                  </span>
                  <span className="text-base font-semibold text-fg">{cap}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-center font-display text-lg font-semibold text-fg sm:text-xl">
            <BrandText text={t("about.capPunch")} />
          </p>
        </Section>

        {/* Differentiator */}
        <Section title={t("about.diffTitle")}>
          <p className="font-display text-2xl font-bold text-fg sm:text-3xl">{t("about.diff1")}</p>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{t("about.diff2")}</p>
        </Section>

        {/* Closing */}
        <section className="mt-16 rounded-3xl border border-teal-glow/30 p-8 text-center shadow-neon sm:p-12" style={{ background: "rgb(var(--c-abyss) / 0.7)" }}>
          <BrandMark className="mx-auto mb-4 block text-3xl" />
          <Globe size={36} className="mx-auto text-brand-luq" />
          <h2 className="mt-4 text-balance font-display text-2xl font-bold leading-tight text-fg sm:text-4xl">
            <BrandText text={t("about.closeTitle")} />
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted sm:text-lg"><BrandText text={t("about.closeBody")} /></p>
          <p className="mt-4 font-display text-lg font-bold text-fg sm:text-xl"><BrandText text={t("about.closePunch")} /></p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href={`mailto:${email}`}>
              <Button size="lg">
                <Mail size={18} /> {t("about.getInTouch")}
              </Button>
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-base font-bold text-white"
              style={{ background: "#0A66C2" }}
            >
              <Linkedin size={18} /> {t("about.linkedin")}
            </a>
          </div>
          <p className="mt-4 text-sm text-faint">{email}</p>
        </section>
      </main>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  const hasBrand = /goluq/i.test(title);
  return (
    <section className="mt-16">
      <h2 className="text-balance font-display text-2xl font-bold sm:text-4xl">
        {hasBrand ? (
          <BrandText text={title} className="text-fg" />
        ) : (
          <span className="text-gradient-accent">{title}</span>
        )}
      </h2>
      {sub && <p className="mt-2 max-w-2xl text-base text-muted sm:text-lg"><BrandText text={sub} /></p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}
