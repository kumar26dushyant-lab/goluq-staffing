import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Sparkles, Phone, Check, UserRound } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { askAssistant, pageFromPath, type ChatMsg } from "../lib/assistant";
import { recordTurn, requestHuman, syncChat } from "../lib/liveChat";
import { submitLead } from "../lib/lead";
import { useVoice } from "../lib/voice";
import { WaveformOrb } from "./WaveformOrb";
import { WhatsAppCta } from "./WhatsAppCta";

/** How long a visitor sits before the guide walks over and says hello. */
const TEASER_DELAY_MS = 20_000;
const TEASER_KEY = "goluq_chat_teased";

const CHAT_INPUT =
  "mt-3 w-full rounded-xl border border-hairline/20 bg-panel/60 px-3 py-2.5 text-base text-fg placeholder:text-faint outline-none focus:border-teal-glow/50";

/**
 * The site guide — a floating, Gemini-backed representative (server proxy; the
 * key never touches the browser). Three behaviours make it a salesperson rather
 * than a help widget:
 *
 *  1. It APPROACHES. After ~20s it offers an opening line, the way a showroom
 *     rep walks over rather than waiting at the desk. Once per session only.
 *  2. It knows WHERE the visitor is standing — home / build / partner — and the
 *     server prompt pitches the appropriate next step for that page.
 *  3. It CLOSES. Once a real conversation has started it offers to take a name
 *     and number, and posts it straight into the lead engine with the transcript
 *     attached, so the follow-up knows what was already discussed.
 */
export function AssistantChat() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("hi") ? "hi" : "en";
  const { say } = useVoice();
  const { pathname } = useLocation();
  const page = pageFromPath(pathname);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const suggest = t("chat.suggest", { returnObjects: true }) as string[];

  // Live handoff to a real person
  const [handoff, setHandoff] = useState(false);
  const [agentJoined, setAgentJoined] = useState(false);
  const lastAgentId = useRef(0);

  // Lead capture
  const [capturing, setCapturing] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadState, setLeadState] = useState<"idle" | "sending" | "done" | "error">("idle");

  const turns = messages.filter((m) => m.role === "user").length;

  // Approach the visitor once per session, if they haven't opened the chat.
  useEffect(() => {
    if (sessionStorage.getItem(TEASER_KEY)) return;
    const id = window.setTimeout(() => {
      setOpen((isOpen) => {
        if (!isOpen) setTeaser(true);
        return isOpen;
      });
    }, TEASER_DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  const dismissTeaser = () => {
    setTeaser(false);
    sessionStorage.setItem(TEASER_KEY, "1");
  };

  // Seed greeting on first open (and re-seed on language change while empty)
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: t("chat.greeting") }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, capturing]);

  // Once a human is involved, poll for their replies. Polling (rather than a
  // socket) keeps this working behind the existing CSP and needs no new infra;
  // 4s is fast enough to feel live in a sales conversation.
  useEffect(() => {
    if (!open || (!handoff && !agentJoined)) return;
    const tick = async () => {
      const r = await syncChat(lastAgentId.current, page, lang);
      if (r.agentJoined) setAgentJoined(true);
      if (r.messages.length) {
        lastAgentId.current = r.messages[r.messages.length - 1].id;
        setMessages((m) => [
          ...m,
          ...r.messages.map((x: { content: string }) => ({ role: "assistant" as const, content: x.content })),
        ]);
      }
    };
    const iv = window.setInterval(tick, 4000);
    tick();
    return () => window.clearInterval(iv);
  }, [open, handoff, agentJoined, page, lang]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setInput("");
    const next: ChatMsg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    void recordTurn("visitor", q, page, lang);

    // With a human on the line the guide stops answering — two voices replying
    // to the same person reads as chaos.
    if (agentJoined) return;

    setLoading(true);
    const reply = await askAssistant(next, lang, page);
    setLoading(false);
    if (reply) {
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      void recordTurn("guide", reply, page, lang);
      say(reply); // speak it (respects mute/unlock)
    }
  };

  const askForHuman = async () => {
    setHandoff(true);
    setMessages((m) => [...m, { role: "assistant", content: t("chat.handoffSent") }]);
    await requestHuman(page, lang, lastAgentId.current);
  };

  const sendLead = async () => {
    if (!/^[6-9]\d{9}$/.test(leadPhone.replace(/\D/g, "")) || leadName.trim().length < 2) {
      return setLeadState("error");
    }
    setLeadState("sending");
    try {
      // Attach the conversation so whoever follows up already knows the context.
      const transcript = messages
        .slice(-8)
        .map((m) => `${m.role === "user" ? "Them" : "Guide"}: ${m.content}`)
        .join("\n");
      await submitLead({
        name: leadName.trim(),
        phone: leadPhone.replace(/\D/g, ""),
        message: `[CHAT LEAD · ${page.toUpperCase()}]\n${transcript}`,
        crossSell: ["chat-lead"],
        wantsTraining: false,
      });
      setLeadState("done");
      setCapturing(false);
      setMessages((m) => [...m, { role: "assistant", content: t("chat.leadSent") }]);
    } catch {
      setLeadState("error");
    }
  };

  const openChat = () => {
    dismissTeaser();
    setOpen(true);
  };

  return (
    <>
      {/* The approach — a single line, dismissable, once per session. */}
      <AnimatePresence>
        {teaser && !open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed z-50 max-w-[15rem] rounded-2xl border border-teal-glow/35 p-3.5 shadow-glass"
            style={{
              background: "rgb(var(--c-abyss) / 0.97)",
              backdropFilter: "blur(16px)",
              bottom: "calc(max(1.25rem, env(safe-area-inset-bottom)) + 4.5rem)",
              right: "max(1.25rem, env(safe-area-inset-right))",
            }}
          >
            <button type="button" onClick={openChat} className="block text-left">
              <p className="text-sm leading-snug text-fg">{t("chat.teaser")}</p>
            </button>
            <button
              type="button"
              onClick={dismissTeaser}
              aria-label={t("chat.teaserDismiss")}
              className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-hairline/20 bg-panel text-muted"
            >
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher */}
      <motion.button
        type="button"
        onClick={() => {
          dismissTeaser();
          setOpen((o) => !o);
        }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        aria-label={t("chat.open")}
        className="fixed z-50 grid h-14 w-14 place-items-center rounded-full text-ink shadow-neon"
        style={{
          background: "linear-gradient(135deg, rgb(var(--c-teal-glow)), #8b7cf6)",
          bottom: "max(1.25rem, env(safe-area-inset-bottom))",
          right: "max(1.25rem, env(safe-area-inset-right))",
        }}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
        {!open && (
          <span className="absolute inset-0 animate-pulse-ring rounded-full border border-teal-glow/50" />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-24 right-3 left-3 z-50 flex max-h-[70vh] flex-col overflow-hidden rounded-3xl border border-teal-glow/30 shadow-glass sm:left-auto sm:w-[400px]"
            style={{ background: "rgb(var(--c-abyss) / 0.96)", backdropFilter: "blur(20px)" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-hairline/10 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-teal-glow/15 ring-1 ring-teal-glow/30">
                <WaveformOrb speaking={loading} bars={7} className="h-5" />
              </div>
              <div>
                <p className="font-display text-base font-bold text-fg">{t("chat.title")}</p>
                <p className="text-xs text-muted">
                  {agentJoined ? t("chat.agentLabel") : t("chat.subtitle")}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[0.95rem] leading-relaxed ${
                      m.role === "user"
                        ? "bg-teal-glow/20 text-fg"
                        : "border border-hairline/12 bg-panel/50 text-fg"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-hairline/12 bg-panel/50 px-4 py-2.5 text-sm text-muted">
                    {t("chat.thinking")}
                  </div>
                </div>
              )}

              {/* Suggestion chips (only before the user has asked) */}
              {messages.filter((m) => m.role === "user").length === 0 && !loading && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {suggest.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-teal-glow/10 px-3 py-1.5 text-sm font-medium text-brand-luq ring-1 ring-teal-glow/25"
                    >
                      <Sparkles size={12} /> {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Actions — offered only once a real conversation exists, so they
                  read as a natural next step rather than a pop-up demand. */}
              {turns >= 2 && !loading && !capturing && (
                <div className="flex flex-wrap gap-2">
                  {leadState !== "done" && (
                    <button
                      type="button"
                      onClick={() => setCapturing(true)}
                      className="inline-flex items-center gap-2 rounded-full bg-teal-glow/12 px-4 py-2 text-sm font-semibold text-brand-luq ring-1 ring-teal-glow/30"
                    >
                      <Phone size={14} /> {t("chat.leaveNumber")}
                    </button>
                  )}
                  {!handoff && !agentJoined && (
                    <button
                      type="button"
                      onClick={askForHuman}
                      className="inline-flex items-center gap-2 rounded-full bg-panel/60 px-4 py-2 text-sm font-semibold text-fg ring-1 ring-hairline/20"
                    >
                      <UserRound size={14} /> {t("chat.talkHuman")}
                    </button>
                  )}
                </div>
              )}

              {capturing && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-teal-glow/30 bg-teal-glow/[0.06] p-4"
                >
                  <p className="font-display text-base font-bold text-fg">{t("chat.leadTitle")}</p>
                  <p className="mt-1 text-sm text-muted">{t("chat.leadBody")}</p>
                  <input
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder={t("booking.namePh")}
                    autoComplete="name"
                    className={CHAT_INPUT}
                  />
                  <input
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    placeholder={t("booking.phonePh")}
                    inputMode="tel"
                    autoComplete="tel"
                    className={`${CHAT_INPUT} mt-2`}
                  />
                  {leadState === "error" && (
                    <p role="alert" className="mt-2 text-sm font-semibold text-danger">
                      {t("chat.leadError")}
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={sendLead}
                      disabled={leadState === "sending"}
                      className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-ink disabled:opacity-60"
                      style={{
                        background:
                          "linear-gradient(135deg, rgb(var(--c-teal-glow)), rgb(var(--c-teal-neon)))",
                      }}
                    >
                      <Check size={14} />
                      {leadState === "sending" ? t("booking.submitting") : t("chat.leadCta")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCapturing(false);
                        setLeadState("idle");
                      }}
                      className="rounded-full px-4 py-2 text-sm font-semibold text-muted"
                    >
                      {t("chat.cancel")}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Reaching a human is never more than one tap away, whatever the
                guide is saying. */}
            <div className="border-t border-hairline/10 px-3 pt-3">
              <WhatsAppCta variant="bar" context="chat" />
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder={t("chat.placeholder")}
                className="flex-1 rounded-full border border-hairline/20 bg-panel/50 px-4 py-2.5 text-base text-fg placeholder:text-faint outline-none focus:border-teal-glow/50"
              />
              <button
                type="button"
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                aria-label={t("chat.send")}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, rgb(var(--c-teal-glow)), rgb(var(--c-teal-neon)))" }}
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
