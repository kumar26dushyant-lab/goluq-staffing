import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, ArrowRight, RotateCcw, Phone, MessageCircle, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getScenario } from "../content/scenarios";
import { getDialogue, type Turn } from "../content/dialogues";
import { StageAssistant } from "../components/StageAssistant";
import { RoiScorecard } from "../components/RoiScorecard";
import { Button } from "../components/ui/Button";
import type { RoleId, IndustryId } from "../state/useAppState";

type Phase = "run" | "recap";

/** A voice worker is demonstrated as a phone call; everyone else as a chat. */
function channelFor(role: RoleId) {
  if (role === "voice") return { icon: Phone, key: "call" as const };
  if (role === "workforce") return { icon: Users, key: "team" as const };
  return { icon: MessageCircle, key: "chat" as const };
}

/**
 * STEP 4 — the demonstration.
 *
 * This used to play a task log ("Flagging 38 reports…") for every role, which is
 * meaningless for a Voice Calling Employee: nobody hires a phone worker to watch
 * a checklist scroll past. The honest demonstration of a conversational worker is
 * the CONVERSATION — so the run phase now plays the actual call or chat, turn by
 * turn, at a speed a person can read.
 *
 *   1) RUN   — the conversation plays out, with a pause before each reply.
 *   2) RECAP — what concretely came out of it, the ROI, and the CTA.
 */
export function Simulation({
  role,
  industry,
  onComplete,
}: {
  role: RoleId;
  industry: IndustryId;
  onComplete: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("hi") ? "hi" : "en";
  const reduced = useReducedMotion();
  const scenario = getScenario(role, industry);
  const dialogue = getDialogue(role, industry);
  const channel = channelFor(role);
  const ChannelIcon = channel.icon;

  const [phase, setPhase] = useState<Phase>("run");
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const logRef = useRef<HTMLOListElement>(null);
  const startedAt = useRef(0);
  const [runKey, setRunKey] = useState(0); // bump to replay

  // Play the conversation. Timing is deliberately readable rather than fast —
  // the point is that the reply is *good*, which nobody can judge at 200ms.
  useEffect(() => {
    setShown(0);
    setTyping(false);
    setPhase("run");
    startedAt.current = performance.now();
    const total = dialogue.turns.length;
    let i = 0;
    let timer: number;

    const next = () => {
      if (i >= total) {
        setElapsed((performance.now() - startedAt.current) / 1000);
        timer = window.setTimeout(() => setPhase("recap"), 900);
        return;
      }
      const turn = dialogue.turns[i];
      // A short "typing"/"answering" beat before the worker speaks reads as a
      // real exchange; the caller's lines appear immediately.
      const think = reduced ? 0 : turn.who === "agent" ? 620 : 220;
      if (think) setTyping(turn.who === "agent");
      timer = window.setTimeout(() => {
        setTyping(false);
        i += 1;
        setShown(i);
        timer = window.setTimeout(next, reduced ? 60 : 900);
      }, think);
    };
    timer = window.setTimeout(next, reduced ? 40 : 500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, industry, runKey]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [shown, typing]);

  const turns = dialogue.turns.slice(0, shown);

  // ── RECAP ────────────────────────────────────────────────────────────────
  if (phase === "recap") {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 pb-28 pt-6 sm:px-8">
        <StageAssistant line={t("assist.recap")} also={[dialogue.result[lang]]} className="mb-7" />

        <motion.div
          initial={reduced ? false : { scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 16 }}
          className="glass-bright flex flex-col items-center gap-2 rounded-3xl px-6 py-8 text-center"
        >
          <CheckCircle2
            size={56}
            className="text-success"
            style={{ filter: "drop-shadow(0 0 18px rgb(var(--c-success) / 0.6))" }}
          />
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-brand-luq">
            {t("recap.doneIn")} <span className="text-fg">{elapsed.toFixed(1)}</span>{" "}
            {t("recap.seconds")}
          </p>
          <h2 className="text-balance font-display text-2xl font-bold leading-tight sm:text-4xl">
            <span className="text-gradient-accent">{t("recap.heading")}</span>
          </h2>
          {/* Honesty label: a demonstration of intended behaviour, not a live
              system on the visitor's data. See content/catalogue.ts. */}
          <p className="mt-2 rounded-full bg-warn/10 px-3.5 py-1.5 text-xs font-semibold text-muted ring-1 ring-warn/25">
            {t("recap.demoNote")}
          </p>
        </motion.div>

        {/* What actually came out of the conversation */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.4, duration: 0.5 }}
          className="border-gradient glow-teal mt-6 rounded-2xl bg-panel/40 p-6"
        >
          <p className="text-balance text-lg font-semibold leading-relaxed text-fg sm:text-xl">
            {dialogue.result[lang]}
          </p>
        </motion.div>

        <div className="mt-8">
          <RoiScorecard role={role} industry={industry} />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="xl" full onClick={onComplete}>
            {t("recap.continue")} <ArrowRight size={22} />
          </Button>
          <Button variant="secondary" size="lg" onClick={() => setRunKey((k) => k + 1)}>
            <RotateCcw size={18} /> {t("recap.replay")}
          </Button>
        </div>
      </div>
    );
  }

  // ── RUN ──────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 pt-6 sm:px-8">
      <StageAssistant line={t("assist.simRun")} className="mb-6" />

      <motion.div
        initial={reduced ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 rounded-2xl border border-danger/40 px-5 py-4"
        style={{ background: "rgb(var(--c-danger) / 0.12)" }}
        role="status"
      >
        <span
          className={`mt-1.5 h-3 w-3 shrink-0 rounded-full bg-danger ${reduced ? "" : "animate-pulse"}`}
        />
        <p className="text-base font-semibold leading-snug text-fg sm:text-lg">
          {scenario.bottleneck[lang]}
        </p>
      </motion.div>

      {/* The conversation */}
      <div className="relative mt-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-muted">
            <ChannelIcon size={14} className="text-brand-luq" />
            {dialogue.scene[lang]}
          </span>
          <span className="font-mono uppercase tracking-[0.2em] text-brand-luq">● live</span>
        </div>

        <ol
          ref={logRef}
          className="glass h-[52vh] max-h-[460px] space-y-3 overflow-y-auto rounded-2xl p-4"
          aria-live="off"
        >
          {turns.map((turn, i) => (
            <Bubble key={i} turn={turn} lang={lang} reduced={!!reduced} />
          ))}

          {typing && (
            <li className="flex justify-end">
              <span className="inline-flex items-center gap-1 rounded-2xl bg-teal-glow/15 px-4 py-3">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="h-1.5 w-1.5 rounded-full bg-brand-luq"
                    style={{ animation: `pulse 1s ${d * 0.15}s infinite` }}
                  />
                ))}
              </span>
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}

/** One line of the conversation. Caller on the left, digital worker on the right. */
function Bubble({ turn, lang, reduced }: { turn: Turn; lang: "en" | "hi"; reduced: boolean }) {
  const mine = turn.who === "agent";
  return (
    <motion.li
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={`flex ${mine ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[85%] ${mine ? "text-right" : "text-left"}`}>
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">
          {turn.by ? turn.by[lang] : mine ? "GoLuQ" : lang === "hi" ? "ग्राहक" : "Customer"}
        </span>
        <div
          className={`inline-block rounded-2xl px-4 py-2.5 text-left text-base leading-relaxed ${
            mine
              ? "bg-teal-glow/18 text-fg ring-1 ring-teal-glow/25"
              : "border border-hairline/15 bg-panel/60 text-fg"
          }`}
        >
          {turn[lang]}
        </div>
      </div>
    </motion.li>
  );
}
