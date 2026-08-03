import { useId, useState } from "react";
import { motion } from "framer-motion";
import { TrendingDown, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ECONOMICS, money, rentTotal, type Region } from "../../content/buildPricing";

/**
 * The rent-vs-own model. This is the page's primary trust device: every
 * assumption is a visible, editable control, and the verdict is allowed to come
 * out AGAINST us at small seat counts (see `honestFloorSeats`). A calculator
 * that can only ever agree with the seller convinces nobody.
 */
export function RentVsOwn({ region, ns }: { region: Region; ns: string }) {
  const { t } = useTranslation();
  const e = ECONOMICS[region];
  const id = useId();

  const [seats, setSeats] = useState(e.defaultSeats);
  const [perSeat, setPerSeat] = useState(e.defaultPerSeat);
  const [years, setYears] = useState(e.defaultYears);

  const rent = rentTotal(seats, perSeat, years);
  const buildMid = (e.bandLow + e.bandHigh) / 2;
  const ownWins = seats >= e.honestFloorSeats && rent > buildMid;
  const delta = Math.abs(rent - buildMid);

  return (
    <section aria-labelledby={`${id}-title`}>
      <p className="font-mono text-sm uppercase tracking-[0.28em] text-brand-luq">
        {t(`${ns}.calc.kicker`)}
      </p>
      <h2 id={`${id}-title`} className="mt-2 text-balance font-display text-2xl font-bold sm:text-4xl">
        <span className="text-gradient-accent">{t(`${ns}.calc.title`)}</span>
      </h2>
      <p className="mt-2 max-w-2xl text-base text-muted sm:text-lg">{t(`${ns}.calc.lede`)}</p>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_1fr] lg:items-stretch">
        {/* Controls */}
        <div className="glass flex flex-col gap-6 rounded-2xl p-6">
          <Slider
            id={`${id}-seats`}
            label={t(`${ns}.calc.seats`)}
            value={seats}
            min={1}
            max={e.maxSeats}
            step={1}
            display={String(seats)}
            onChange={setSeats}
          />
          <Slider
            id={`${id}-perseat`}
            label={t(`${ns}.calc.perSeat`)}
            value={perSeat}
            min={0}
            max={e.maxPerSeat}
            step={region === "in" ? 100 : 5}
            display={money(perSeat, e)}
            onChange={setPerSeat}
          />
          <Slider
            id={`${id}-years`}
            label={t(`${ns}.calc.years`)}
            value={years}
            min={1}
            max={10}
            step={1}
            display={String(years)}
            onChange={setYears}
          />
        </div>

        {/* Result */}
        <div className="glass glow-teal flex flex-col justify-between rounded-2xl p-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-faint">
                {t(`${ns}.calc.rentTotal`)}
              </p>
              <motion.p
                key={rent}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                className="mt-1 font-display text-2xl font-bold tabular-nums text-danger [overflow-wrap:anywhere] sm:text-4xl"
              >
                {money(rent, e)}
              </motion.p>
              <p className="mt-1 text-sm text-muted">{t(`${ns}.calc.rentSub`)}</p>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-faint">
                {t(`${ns}.calc.ownTotal`)}
              </p>
              <p className="text-gradient-accent mt-1 font-display text-2xl font-bold tabular-nums [overflow-wrap:anywhere] sm:text-4xl">
                {money(e.bandLow, e)} – {money(e.bandHigh, e)}
              </p>
              <p className="mt-1 text-sm text-muted">{t(`${ns}.calc.ownSub`)}</p>
              <p className="mt-1 text-sm text-faint">
                {t(`${ns}.calc.hosting`)} · {money(e.hostingLow, e)}–{money(e.hostingHigh, e)}/mo
              </p>
            </div>
          </div>

          <div
            className={`mt-6 rounded-xl border p-4 text-base font-semibold ${
              ownWins
                ? "border-success/40 bg-success/10 text-fg"
                : "border-warn/40 bg-warn/10 text-fg"
            }`}
          >
            <span className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
              <TrendingDown size={15} />
              {ownWins ? "Verdict" : "Honest verdict"}
            </span>
            {ownWins
              ? t(`${ns}.calc.verdictWin`, { y: years, d: money(delta, e) })
              : t(`${ns}.calc.verdictLose`)}
          </div>
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-faint">
        <Info size={15} className="mt-0.5 shrink-0" />
        {t(`${ns}.calc.note`)}
      </p>
    </section>
  );
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-base font-semibold text-fg">
          {label}
        </label>
        <span className="font-mono text-lg font-bold text-brand-luq">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(ev) => onChange(Number(ev.target.value))}
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-hairline/15 accent-[rgb(var(--c-teal-glow))]"
      />
    </div>
  );
}
