import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../context/I18nContext";

interface Message {
  from: "bot" | "user";
  text: string;
}

const MAX_HISTORY = 12;

export default function ChatWidget() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const WELCOME_MESSAGES = [
    t("chatbot_welcome_1") || "Bonjour ! Bienvenue sur Docmaster, le service 100% camerounais de gestion de documents.",
    t("chatbot_welcome_2") || "Je suis votre assistant Docmaster. Comment puis-je vous aider aujourd'hui ?",
  ];

  const QUICK_REPLIES = [
    t("chatbot_quick_lost") || "Déclarer un document perdu",
    t("chatbot_quick_find") || "Retrouver un document",
    t("chatbot_quick_transfer") || "Transfert d'appareil",
    t("chatbot_quick_security") || "Sécurité de mon compte",
  ];

  useEffect(() => {
    if (open && messages.length === 0) {
      setTyping(true);
      const t1 = setTimeout(() => {
        setMessages([{ from: "bot", text: WELCOME_MESSAGES[0] }]);
        setTyping(false);
        const t2 = setTimeout(() => {
          setMessages((m) => [...m, { from: "bot", text: WELCOME_MESSAGES[1] }]);
        }, 500);
        return () => clearTimeout(t2);
      }, 600);
      return () => clearTimeout(t1);
    }
  }, [open, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || fabRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const send = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || sending) return;
    const history: Message[] = [...messages, { from: "user", text: value }];
    setMessages(history);
    setInput("");
    setTyping(true);
    setSending(true);
    try {
      const payload = history.slice(-MAX_HISTORY).map((m) => ({
        role: m.from === "user" ? "user" : "assistant",
        content: m.text,
      }));
      const base = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payload,
          language: language,
          user: user
            ? {
                prenom: user.prenom,
                nom: user.nom,
                points: user.points,
                subscription: user.subscription?.plan_name || null,
              }
            : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Erreur serveur");
      }
      setMessages((m) => [...m, { from: "bot", text: data.message }]);
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        { from: "bot", text: t("chatbot_error") || "Je suis désolé, je rencontre une difficulté technique. Merci de réessayer dans un instant ou de contacter notre équipe support." },
      ]);
    } finally {
      setTyping(false);
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-[60px] sm:bottom-6 right-4 sm:right-6 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-50"
        aria-label={open ? t("chatbot_close") || "Fermer le chat" : t("chatbot_open") || "Ouvrir le chat"}
        aria-expanded={open}
        ref={fabRef}
        style={{ boxShadow: "0 8px 24px rgba(30, 58, 47, 0.25)" }}
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-textMain" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <img src="/src/assets/images/chat-icon.svg" className="w-7 h-auto" alt="" />
        )}
      </button>

      <div
        ref={panelRef}
        inert={!open}
        aria-hidden={!open}
        className="fixed z-50 flex flex-col bg-surface rounded-2xl shadow-2xl overflow-hidden left-3 right-3 sm:left-auto sm:right-6 sm:w-[360px] bottom-[124px] sm:bottom-24 h-[calc(100dvh-180px)] sm:h-[480px] sm:max-h-[calc(100dvh-140px)]"
        style={{
          boxShadow: "0 20px 60px rgba(30, 58, 47, 0.25)",
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0) scale(1)" : "translateY(24px) scale(0.95)",
          transition: "opacity 220ms ease-out, transform 220ms ease-out",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <div className="bg-green-dark px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0">
            <img src="/src/assets/images/chat-icon.svg" className="w-6 h-auto" alt="Docmaster" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bricolage font-semibold text-sm">{t("chatbot_title") || "Assistant Docmaster"}</p>
            <p className="text-white/60 text-[11px] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-light inline-block" style={{ background: "#A8CBAF" }} />
              {t("chatbot_status") || "En ligne — réponse immédiate"}
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-white/70 hover:text-white transition-colors"
            aria-label={t("chatbot_close") || "Fermer"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 bg-bgMain px-3 py-3 space-y-2.5 overflow-y-auto overscroll-contain">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                  m.from === "user"
                    ? "bg-primary text-white rounded-2xl rounded-br-md"
                    : "bg-surface text-textMain rounded-2xl rounded-bl-md border border-borderMain"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="bg-surface border border-borderMain rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-bounce"
                    style={{ animationDelay: `${d * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length > 0 && (
          <div className="bg-surface px-3 pt-2 pb-1.5 flex flex-wrap gap-1.5 border-t border-borderMain">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="text-[11.5px] px-2.5 py-1 rounded-full bg-primary-light text-primary-dark border border-primary/25 hover:bg-primary hover:text-white transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="bg-surface px-3 py-2.5 flex items-center gap-2 border-t border-borderMain pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={t("chatbot_placeholder") || "Écrivez votre message…"}
            className="flex-1 bg-bgMain border border-borderMain rounded-full px-4 py-2 text-[13px] text-textMain outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim()}
            className="w-9 h-9 shrink-0 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-colors"
            aria-label={t("chatbot_send") || "Envoyer"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
