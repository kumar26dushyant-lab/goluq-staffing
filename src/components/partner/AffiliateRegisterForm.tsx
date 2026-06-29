import { useState } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { registerAffiliate, type AffiliateRegisterResult } from "../../lib/affiliate";
import { inputClass } from "../../lib/ui";
import { Button } from "../ui/Button";

const INPUT = inputClass;

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const UPI_RE = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;
const PHONE_RE = /^[6-9]\d{9}$/;

/** Bot-guided registration. PAN auto-uppercases; PAN + UPI required for payouts. */
export function AffiliateRegisterForm({
  onDone,
}: {
  onDone: (r: AffiliateRegisterResult) => void;
}) {
  const { t } = useTranslation();
  const [f, setF] = useState({ name: "", phone: "", email: "", pan: "", upiId: "", youtubeUrl: "", city: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = t("partner.reg.errName");
    if (!PHONE_RE.test(f.phone)) e.phone = t("partner.reg.errPhone");
    if (!PAN_RE.test(f.pan)) e.pan = t("partner.reg.errPan");
    if (!UPI_RE.test(f.upiId)) e.upiId = t("partner.reg.errUpi");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      const r = await registerAffiliate({
        name: f.name.trim(),
        phone: f.phone,
        email: f.email.trim() || undefined,
        pan: f.pan,
        upiId: f.upiId,
        youtubeUrl: f.youtubeUrl.trim() || undefined,
        city: f.city.trim() || undefined,
      });
      if (r.ok) onDone(r);
      else setErrors({ form: r.error || t("partner.reg.error") });
    } catch {
      setErrors({ form: t("partner.reg.error") });
    } finally {
      setBusy(false);
    }
  };

  const Field = (
    key: keyof typeof f,
    label: string,
    opts: { req?: boolean; ph?: string; transform?: (v: string) => string } = {}
  ) => (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted">
        {label}
        {opts.req && <span className="text-danger"> *</span>}
      </span>
      <input
        className={INPUT}
        value={f[key]}
        placeholder={opts.ph}
        onChange={(e) => set(key)(opts.transform ? opts.transform(e.target.value) : e.target.value)}
      />
      {errors[key] && <span className="mt-1 block text-xs text-danger">{errors[key]}</span>}
    </label>
  );

  return (
    <div className="glass rounded-2xl p-5 sm:p-6">
      <h3 className="font-display text-lg font-bold text-fg">{t("partner.reg.title")}</h3>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {Field("name", t("partner.reg.name"), { req: true })}
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-muted">
            {t("partner.reg.phone")}
            <span className="text-danger"> *</span>
          </span>
          <div className="flex gap-2">
            <span className="grid shrink-0 place-items-center rounded-xl border border-hairline/15 bg-panel/40 px-3 font-mono text-sm text-muted">+91</span>
            <input
              className={INPUT}
              value={f.phone}
              inputMode="numeric"
              onChange={(e) => set("phone")(e.target.value.replace(/\D/g, "").slice(0, 10))}
            />
          </div>
          {errors.phone && <span className="mt-1 block text-xs text-danger">{errors.phone}</span>}
        </label>
        {Field("pan", t("partner.reg.pan"), { req: true, ph: "ABCDE1234F", transform: (v) => v.toUpperCase().slice(0, 10) })}
        {Field("upiId", t("partner.reg.upi"), { req: true, ph: "name@bank" })}
        {Field("email", t("partner.reg.email"), { ph: "you@email.com" })}
        {Field("city", t("partner.reg.city"))}
        <div className="sm:col-span-2">{Field("youtubeUrl", t("partner.reg.youtube"), { ph: "https://youtube.com/@you" })}</div>
      </div>

      {errors.form && <p className="mt-3 text-base text-danger">{errors.form}</p>}

      <Button size="xl" full onClick={submit} disabled={busy} className="mt-6">
        {busy ? (
          <>
            <Loader2 size={20} className="animate-spin" /> {t("partner.reg.submitting")}
          </>
        ) : (
          <>
            {t("partner.reg.submit")} <ArrowRight size={20} />
          </>
        )}
      </Button>
    </div>
  );
}
