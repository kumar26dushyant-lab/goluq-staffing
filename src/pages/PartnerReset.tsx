import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import { TopBar } from "../components/TopBar";
import { BrandMark } from "../components/BrandMark";
import { Button } from "../components/ui/Button";
import { inputClass } from "../lib/ui";
import { affSetPassword, setAffToken } from "../lib/affiliateApi";

/**
 * Route "/partner/reset?token=…" — a partner chooses their password.
 *
 * Serves both cases with the same screen: the one-time link handed out at
 * registration, and the reset link emailed later. The token is single-use and
 * expires, and setting a password signs out every other device.
 */
export function PartnerReset() {
  const { t } = useTranslation();
  const token = new URLSearchParams(window.location.search).get("token") || "";

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setErr("");
    if (pw.length < 8) return setErr(t("partner.login.tooShort"));
    if (pw !== pw2) return setErr(t("partner.login.mismatch"));
    setBusy(true);
    const r = await affSetPassword(token, pw);
    setBusy(false);
    if (r?.ok && r.token) {
      setAffToken(r.token);
      setDone(true);
      setTimeout(() => { window.location.href = "/partner/dashboard"; }, 900);
    } else {
      setErr(r?.error || t("partner.login.failed"));
    }
  };

  return (
    <div className="relative min-h-dvh">
      <TopBar showBack={false} onBack={() => {}} showPartnerCta={false} />
      <main className="grid min-h-[70vh] place-items-center px-5">
        <div className="glass w-full max-w-sm rounded-3xl p-8">
          {done ? (
            <div className="text-center">
              <ShieldCheck size={40} className="mx-auto text-success" />
              <h1 className="mt-4 font-display text-xl font-bold text-fg">
                {t("partner.login.passwordSet")}
              </h1>
              <p className="mt-2 text-sm text-muted">{t("partner.login.signingIn")}</p>
            </div>
          ) : (
            <>
              <BrandMark className="text-2xl" />
              <h1 className="mt-4 font-display text-2xl font-bold text-fg">
                {t("partner.login.choosePassword")}
              </h1>
              <p className="mt-1 text-sm text-muted">{t("partner.login.chooseSub")}</p>

              <label className="mt-5 block">
                <span className="mb-1.5 block text-sm font-semibold text-muted">
                  {t("partner.login.newPassword")}
                </span>
                <input type="password" className={inputClass} value={pw} autoComplete="new-password"
                  onChange={(e) => setPw(e.target.value)} autoFocus />
              </label>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-sm font-semibold text-muted">
                  {t("partner.login.confirmPassword")}
                </span>
                <input type="password" className={inputClass} value={pw2} autoComplete="new-password"
                  onChange={(e) => setPw2(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()} />
              </label>

              {err && <p role="alert" className="mt-2 text-sm text-danger">{err}</p>}
              <Button full className="mt-5" onClick={submit} disabled={busy}>
                {busy ? "…" : t("partner.login.setPassword")}
              </Button>
              <p className="mt-4 text-xs leading-relaxed text-faint">
                {t("partner.login.onceOnly")}
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
