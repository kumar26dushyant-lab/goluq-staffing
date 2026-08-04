import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Phone, PhoneOff, Play, Pause, Volume2, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { playTurn, clipUrl, type PlayHandle } from "../lib/callAudio";
import type { Dialogue } from "../content/dialogues";

type CallState = "idle" | "ringing" | "connected" | "ended";

/**
 * The mock call — the demonstration a VOICE product actually needs.
 *
 * A transcript proves nothing about a phone worker; you have to hear it. This
 * plays the conversation as audio with a live caption under a real call UI:
 * ringing, connect, waveform, running timer, hang-up.
 *
 * Audio comes from pre-generated clips where they exist and the device voice
 * where they don't (see lib/callAudio.ts), so it works on every phone today and
 * gets better the moment the clips are generated.
 *
 * It never auto-plays: browsers block audio without a gesture, and a site that
 * suddenly talks at someone on a train is worse than one that asks.
 */
export function CallStage({
  dialogue,
  role,
  industry,
  lang,
  onFinished,
}: {
  dialogue: Dialogue;
  role: string;
  industry: string;
  lang: "en" | "hi";
  onFinished: (seconds: number) => void;
}) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();

  const [state, setState] = useState<CallState>("idle");
  const [turn, setTurn] = useState(-1);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);

  const handle = useRef<PlayHandle | null>(null);
  const cancelled = useRef(false);

  // Call timer
  useEffect(() => {
    if (state !== "connected") return;
    const iv = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(iv);
  }, [state]);

  useEffect(() => {
    return () => {
      cancelled.current = true;
      handle.current?.stop();
    };
  }, []);

  const run = async () => {
    cancelled.current = false;
    setState("ringing");
    setSeconds(0);
    setTurn(-1);
    await wait(reduced ? 200 : 1600); // let it ring
    if (cancelled.current) return;
    setState("connected");

    for (let i = 0; i < dialogue.turns.length; i++) {
      if (cancelled.current) return;
      setTurn(i);
      const tn = dialogue.turns[i];
      await playTurn(tn[lang], tn.who, lang, clipUrl(lang, role, industry, i), (h) => {
        handle.current = h;
      });
      if (cancelled.current) return;
      await wait(reduced ? 60 : 320); // natural gap between speakers
    }
    if (cancelled.current) return;
    setState("ended");
    onFinished(seconds);
  };

  const hangUp = () => {
    cancelled.current = true;
    handle.current?.stop();
    setState("ended");
    onFinished(seconds);
  };

  const current = turn >= 0 ? dialogue.turns[turn] : null;
  const agentSpeaking = current?.who === "agent";

  return (
    <div className="glass overflow-hidden rounded-3xl">
      {/* Call header */}
      <div className="flex items-center gap-3 border-b border-hairline/10 px-5 py-4">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
            state === "connected" ? "bg-success/20 text-success" : "bg-teal-glow/15 text-brand-luq"
          }`}
        >
          <Phone size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold text-fg">
            {dialogue.scene[lang]}
          </p>
          <p className="text-xs text-muted">
            {state === "ringing" && t("call.ringing")}
            {state === "connected" && `${t("call.connected")} · ${fmt(seconds)}`}
            {state === "ended" && t("call.ended")}
            {state === "idle" && t("call.tapToPlay")}
          </p>
        </div>
        {state === "connected" && (
          <button
            type="button"
            onClick={hangUp}
            aria-label={t("call.hangUp")}
            className="grid h-10 w-10 place-items-center rounded-full bg-danger/20 text-danger"
          >
            <PhoneOff size={18} />
          </button>
        )}
      </div>

      {/* Stage */}
      <div className="relative px-5 py-8 text-center">
        {/* Who is speaking */}
        <div className="flex items-center justify-center gap-8">
          <Speaker
            label={lang === "hi" ? "ग्राहक" : "Customer"}
            active={state === "connected" && !agentSpeaking && !paused}
            reduced={!!reduced}
          />
          <Speaker
            label="GoLuQ"
            brand
            active={state === "connected" && !!agentSpeaking && !paused}
            reduced={!!reduced}
          />
        </div>

        {/* Live caption */}
        <div className="mx-auto mt-7 min-h-[5.5rem] max-w-lg">
          <AnimatePresence mode="wait">
            {current ? (
              <motion.div
                key={turn}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 1 } : { opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-faint">
                  {current.by ? current.by[lang] : agentSpeaking ? "GoLuQ" : lang === "hi" ? "ग्राहक" : "Customer"}
                </p>
                <p
                  className={`text-balance text-lg leading-relaxed sm:text-xl ${
                    agentSpeaking ? "font-semibold text-fg" : "text-muted"
                  }`}
                >
                  {current[lang]}
                </p>
              </motion.div>
            ) : (
              <p className="text-base text-muted">{t("call.intro")}</p>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {state === "idle" || state === "ended" ? (
            <button
              type="button"
              onClick={run}
              className="inline-flex items-center gap-2.5 rounded-full px-7 py-4 font-display text-lg font-bold text-ink"
              style={{
                background:
                  "linear-gradient(135deg, rgb(var(--c-teal-glow)), rgb(var(--c-teal-neon)))",
                boxShadow: "0 8px 28px rgb(var(--c-teal-glow) / 0.45)",
              }}
            >
              <Play size={20} /> {state === "ended" ? t("call.replay") : t("call.listen")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setPaused((p) => !p);
                handle.current?.stop();
              }}
              className="glass glass-interactive inline-flex items-center gap-2 rounded-full px-5 py-3 text-base font-semibold text-fg"
            >
              <Pause size={17} /> {t("call.skip")}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowTranscript((s) => !s)}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-brand-luq"
          >
            <FileText size={15} /> {t("call.transcript")}
          </button>
        </div>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-faint">
          <Volume2 size={13} /> {t("call.soundOn")}
        </p>
      </div>

      {/* Transcript — also the accessible fallback if audio is unavailable */}
      {showTranscript && (
        <ol className="max-h-64 space-y-2 overflow-y-auto border-t border-hairline/10 p-4">
          {dialogue.turns.map((tn, i) => (
            <li key={i} className={`flex ${tn.who === "agent" ? "justify-end" : "justify-start"}`}>
              <span
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                  tn.who === "agent"
                    ? "bg-teal-glow/15 text-fg"
                    : "border border-hairline/15 bg-panel/50 text-muted"
                } ${i === turn ? "ring-1 ring-brand-luq" : ""}`}
              >
                {tn[lang]}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Avatar + waveform that animates only while that side is talking. */
function Speaker({
  label,
  active,
  brand,
  reduced,
}: {
  label: string;
  active: boolean;
  brand?: boolean;
  reduced: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative grid h-16 w-16 place-items-center rounded-full transition-all ${
          active
            ? brand
              ? "bg-teal-glow/25 ring-2 ring-teal-glow"
              : "bg-panel ring-2 ring-hairline/40"
            : "bg-panel/50 ring-1 ring-hairline/15 opacity-60"
        }`}
      >
        {active && !reduced && (
          <span className="absolute inset-0 animate-pulse-ring rounded-full border border-teal-glow/50" />
        )}
        <span className="flex items-end gap-[3px]" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((b) => (
            <span
              key={b}
              className={`w-[3px] rounded-full ${brand ? "bg-brand-luq" : "bg-muted"}`}
              style={{
                height: active ? undefined : 5,
                animation: active && !reduced ? `wave 0.9s ${b * 0.1}s ease-in-out infinite` : undefined,
                ...(active && reduced ? { height: 10 } : {}),
              }}
            />
          ))}
        </span>
      </div>
      <span className={`text-xs font-semibold ${active ? "text-fg" : "text-faint"}`}>{label}</span>
    </div>
  );
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
