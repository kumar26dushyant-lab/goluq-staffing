import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { askAssistant, type ChatMsg } from "../lib/assistant";
import { useVoice } from "../lib/voice";
import { WaveformOrb } from "./WaveformOrb";

/**
 * Floating conversational assistant (Gemini-powered via the server proxy). Lets a
 * visitor TYPE questions and get smart, on-brand answers — and it speaks them too.
 * Available on every page. Curated flows still own the core claims; this handles
 * free-text. Key never touches the browser (see /api/assistant).
 */
export function AssistantChat() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("hi") ? "hi" : "en";
  const { say } = useVoice();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const suggest = t("chat.suggest", { returnObjects: true }) as string[];

  // Seed greeting on first open (and re-seed on language change while empty)
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: t("chat.greeting") }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setInput("");
    const next: ChatMsg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setLoading(true);
    const reply = await askAssistant(next, lang);
    setLoading(false);
    if (reply) {
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      say(reply); // speak it (respects mute/unlock)
    }
  };

  return (
    <>
      {/* Launcher */}
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
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
                <p className="text-xs text-muted">{t("chat.subtitle")}</p>
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
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 border-t border-hairline/10 p-3">
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
