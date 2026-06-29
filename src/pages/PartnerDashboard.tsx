import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Copy, Check, MessageCircle, MousePointerClick, Users, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TopBar } from "../components/TopBar";
import { fetchStats, type AffiliateStats } from "../lib/affiliate";
import { formatINR } from "../lib/format";

/** Route "/partner/dashboard?token=…" — token-gated stats (BUILD_SPEC §10A). */
export function PartnerDashboard() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!token) {
      setLoading(false);
      return;
    }
    fetchStats(token)
      .then((s) => alive && setStats(s))
      .catch(() => alive && setStats({ ok: false }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token]);

  const invalid = !loading && (!token || !stats?.ok || !stats.affiliate);

  return (
    <div className="relative min-h-dvh">
      <TopBar showBack onBack={() => (window.location.href = "/")} showPartnerCta={false} />

      <main className="mx-auto w-full max-w-3xl px-5 pb-28 pt-2 sm:px-8">
        {loading && <p className="mt-16 text-center text-muted">{t("partner.dash.loading")}</p>}

        {invalid && (
          <div className="glass mt-12 rounded-2xl p-8 text-center">
            <p className="text-muted">{t("partner.dash.invalid")}</p>
          </div>
        )}

        {!loading && stats?.ok && stats.affiliate && (
          <>
            <h1 className="mt-4 font-display text-2xl font-bold text-fg sm:text-3xl">
              {t("partner.dash.greeting")}, {stats.affiliate.name} 👋
            </h1>

            {/* Share link */}
            <div className="glass mt-5 rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-panel/40 px-3 py-2 font-mono text-xs text-fg">
                  {stats.affiliate.shareUrl}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(stats.affiliate!.shareUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-teal-glow/30 px-3 py-2 text-sm font-semibold text-brand-luq"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(stats.affiliate.shareUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-glow/15 px-3 py-2 text-sm font-semibold text-brand-luq"
                >
                  <MessageCircle size={14} />
                </a>
              </div>
            </div>

            {/* Big numbers */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              <StatCard icon={<MousePointerClick size={18} />} label={t("partner.dash.clicks")} value={stats.clicks ?? 0} />
              <StatCard icon={<Users size={18} />} label={t("partner.dash.leads")} value={stats.leads ?? 0} />
              <StatCard icon={<TrendingUp size={18} />} label={t("partner.dash.conversions")} value={stats.conversions ?? 0} />
            </div>

            {/* Earnings */}
            <div className="glass-bright mt-5 rounded-2xl p-5">
              <p className="mb-3 font-display font-semibold text-fg">{t("partner.dash.earnings")}</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <Earn label={t("partner.dash.pending")} v={stats.earnings?.pending ?? 0} />
                <Earn label={t("partner.dash.approved")} v={stats.earnings?.approved ?? 0} />
                <Earn label={t("partner.dash.paid")} v={stats.earnings?.paid ?? 0} />
              </div>
            </div>

            {/* Recent */}
            <div className="mt-5">
              <p className="mb-2 font-display font-semibold text-fg">{t("partner.dash.recent")}</p>
              {stats.recent && stats.recent.length > 0 ? (
                <ul className="space-y-2">
                  {stats.recent.map((r, i) => (
                    <li key={i} className="glass flex items-center justify-between rounded-xl px-4 py-3 text-sm">
                      <span className="text-muted">{r.period_month} · {r.status}</span>
                      <span className="font-display font-semibold text-fg">{formatINR(r.amount_inr)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="glass rounded-xl px-4 py-4 text-sm text-muted">{t("partner.dash.none")}</p>
              )}
            </div>

            {/* Payout note */}
            <details className="glass mt-5 rounded-2xl p-4">
              <summary className="cursor-pointer font-display font-semibold text-fg">{t("partner.dash.payoutTitle")}</summary>
              <p className="mt-2 text-sm text-muted">{t("partner.dash.payoutBody")}</p>
            </details>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="glass rounded-2xl p-4 text-center">
      <span className="mx-auto mb-1 grid h-9 w-9 place-items-center rounded-lg bg-teal-glow/10 text-brand-luq">{icon}</span>
      <p className="font-display text-2xl font-bold text-fg">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function Earn({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <p className="font-display text-lg font-bold text-fg">{formatINR(v)}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
