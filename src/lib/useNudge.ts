import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useVoice } from "./voice";

/**
 * Showroom-salesperson nudges: if the visitor sits idle ~8s on a step, gently
 * prompt them (spoken + shown). Cooldown ≥20s, max 2 per step, any interaction
 * cancels, always dismissable. Reads nudge.<stepKey> lines from i18n.
 */
export function useNudge(stepKey: string) {
  const { t, i18n } = useTranslation();
  const { say } = useVoice();
  const [nudge, setNudge] = useState<string | null>(null);
  const count = useRef(0);
  const last = useRef(0);
  const idx = useRef(0);
  const dismissed = useRef(false);

  const lang = i18n.language;

  useEffect(() => {
    const lines = t(`nudge.${stepKey}`, { returnObjects: true }) as string[];
    if (!Array.isArray(lines) || lines.length === 0) return;

    count.current = 0;
    idx.current = 0;
    dismissed.current = false;
    setNudge(null);

    const IDLE = 8000, COOLDOWN = 20000, MAX = 2;
    let timer: number;

    const fire = () => {
      if (dismissed.current || count.current >= MAX) return;
      if (Date.now() - last.current < COOLDOWN) {
        timer = window.setTimeout(fire, 2000);
        return;
      }
      const line = lines[idx.current % lines.length];
      idx.current += 1;
      count.current += 1;
      last.current = Date.now();
      setNudge(line);
      say(line);
      timer = window.setTimeout(fire, IDLE);
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(fire, IDLE);
    };
    const onActivity = () => {
      if (nudge) setNudge(null);
      schedule();
    };

    const evts = ["pointerdown", "keydown", "scroll", "touchstart", "pointermove"];
    evts.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    schedule();
    return () => {
      window.clearTimeout(timer);
      evts.forEach((e) => window.removeEventListener(e, onActivity));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, lang]);

  const dismiss = () => {
    dismissed.current = true;
    setNudge(null);
  };

  return { nudge, dismiss };
}
