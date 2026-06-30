import { motion } from "framer-motion";
import { Lock, ShieldCheck, KeyRound, UserCheck, Cloud, Fingerprint, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

const ICONS: LucideIcon[] = [Lock, ShieldCheck, KeyRound, UserCheck, Cloud, Fingerprint];

/**
 * Homepage cybersecurity trust section. All claims are DEFENSIBLE — they reflect
 * what's actually true of the build (TLS, hardened headers/CSP in worker.ts,
 * server-side secrets, Cloudflare edge, token-based access / no passwords).
 */
export function SecuritySection({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const points = t("security.points", { returnObjects: true }) as { t: string; d: string }[];

  return (
    <section className={className}>
      <p className="font-mono text-sm uppercase tracking-[0.28em] text-brand-luq">
        {t("security.kicker")}
      </p>
      <h2 className="mt-2 text-balance font-display text-2xl font-bold sm:text-4xl">
        <span className="text-gradient-accent">{t("security.title")}</span>
      </h2>
      <p className="mt-2 max-w-2xl text-base text-muted sm:text-lg">{t("security.subtitle")}</p>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {points.map((p, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
              className="glass flex items-start gap-3.5 rounded-2xl p-5"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-glow/12 text-brand-luq ring-1 ring-teal-glow/25">
                <Icon size={20} />
              </span>
              <div>
                <p className="font-display text-base font-bold text-fg sm:text-lg">{p.t}</p>
                <p className="mt-0.5 text-sm text-muted">{p.d}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
