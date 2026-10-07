import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";
import { fmtLongDate, fmtTime } from "../../js/i18n/format";
import { extractApiError } from "../../utils/extractApiError";
import { socketService } from "../../services/socket";
import type {
  ConversationFilter,
  ConversationMessage,
  ConversationSummary,
  ConversationsApi,
} from "../../services/conversationsService";

export interface MessagerieTheme {
  accent: string;
  accentDark: string;
  accentSoft: string;
  border: string;
  surface: string;
  subtle: string;
  textMain: string;
  textMuted: string;
}

interface Props {
  api: ConversationsApi;
  theme: MessagerieTheme;
  /** Le trouveur (partenaire) est sollicité par le client ; le client ouvre le fil après paiement. */
  portal: "user" | "partenaire";
}

const TABS: ConversationFilter[] = ["all", "unread", "archived"];
const MAX_LENGTH = 2000;

const shortWhen = (lang: string, iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday ? fmtTime(lang, iso) : fmtLongDate(lang, iso).replace(/^(\w+),\s*/, "$1 ");
};

function appendUnique(list: ConversationMessage[], message: ConversationMessage) {
  if (list.some((item) => item.id === message.id)) return list;
  return [...list, message];
}

function CaseFact({ label, value, theme }: { label: string; value: string; theme: MessagerieTheme }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.textMuted }}>
        {label}
      </p>
      <p className="text-xs mt-0.5 truncate" style={{ color: theme.textMain }}>
        {value}
      </p>
    </div>
  );
}

function caseStatusLabel(conversation: ConversationSummary, t: (k: string) => string) {
  const claim = (conversation.claim_status || "").toUpperCase();
  const declaration = (conversation.declaration_status || "").toUpperCase();
  if (claim === "VALIDATED" || declaration === "RETURNED") return t("messagerie_case_returned");
  if (claim === "PAID" || declaration === "PAID") return t("messagerie_case_paid");
  return t("messagerie_case_matched");
}

function DossierContext({ conversation, theme, lang, t }: {
  conversation: ConversationSummary;
  theme: MessagerieTheme;
  lang: string;
  t: (k: string) => string;
}) {
  const [open, setOpen] = useState(true);
  const iAmFinder = conversation.counterpart_role === "OWNER";
  const fileHref = iAmFinder
    ? conversation.found_declaration_id
      ? `/rendre?id=${conversation.found_declaration_id}`
      : "/mes-declarations"
    : `/recuperer?id=${conversation.lost_declaration_id}`;
  const place = [conversation.ville, conversation.quartier].filter(Boolean).join(" · ");

  return (
    <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: theme.border, background: theme.surface }}>
      <button
        onClick={() => setOpen((current) => !current)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <i className="fa-regular fa-folder-open text-xs flex-shrink-0" style={{ color: theme.accent }} />
          <span className="text-xs font-semibold truncate" style={{ color: theme.textMain }}>
            {conversation.doc_type_nom || t("messagerie_document")}
          </span>
          {conversation.identifiant_doc_dm && (
            <span className="text-[11px] font-mono truncate hidden sm:inline" style={{ color: theme.textMuted }}>
              {conversation.identifiant_doc_dm}
            </span>
          )}
        </span>
        <i
          className={`fa-solid ${open ? "fa-chevron-up" : "fa-chevron-down"} text-[10px] flex-shrink-0`}
          style={{ color: theme.textMuted }}
        />
      </button>

      {open && (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-3">
            <CaseFact label={t("messagerie_case_label")} value={caseStatusLabel(conversation, t)} theme={theme} />
            <CaseFact label={t("messagerie_context_owner")} value={conversation.owner_name || "—"} theme={theme} />
            <CaseFact label={t("messagerie_context_place")} value={place || "—"} theme={theme} />
            <CaseFact label={t("messagerie_context_opened")} value={fmtLongDate(lang, conversation.opened_at)} theme={theme} />
          </div>
          <div className="flex items-center justify-between gap-3 mt-3">
            <p className="text-[11px] leading-snug min-w-0" style={{ color: theme.textMuted }}>
              <i className="fa-solid fa-triangle-exclamation mr-1.5" />
              {iAmFinder ? t("messagerie_context_finder_note") : t("messagerie_code_warning")}
            </p>
            <Link
              to={fileHref}
              className="text-[11px] font-medium px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0"
              style={{ border: `1px solid ${theme.border}`, color: theme.textMain }}
            >
              {t("messagerie_context_file")}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function MessageriePanel({ api, theme, portal }: Props) {
  const { t, lang } = useI18n();
  const [searchParams] = useSearchParams();
  const docParam = searchParams.get("doc");
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const selected = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const loadConversations = useCallback(async (active: ConversationFilter) => {
    try {
      const rows = await api.list(active);
      setConversations(rows);
      setError(null);
      return rows;
    } catch (err) {
      setError(extractApiError(err));
      return [];
    } finally {
      setLoadingList(false);
    }
  }, [api]);

  useEffect(() => {
    setLoadingList(true);
    loadConversations(filter);
  }, [filter, loadConversations]);

  const openThread = useCallback(
    async (conversation: ConversationSummary) => {
      if (selectedIdRef.current && selectedIdRef.current !== conversation.id) {
        socketService.leaveConversation(selectedIdRef.current);
      }
      setSelectedId(conversation.id);
      setLoadingThread(true);
      socketService.joinConversation(conversation.id);
      try {
        // GET messages marque le fil comme lu côté serveur.
        const rows = await api.messages(conversation.id);
        setMessages(rows);
        window.dispatchEvent(new CustomEvent("docmaster:conversation-read"));
      } catch (err) {
        setError(extractApiError(err));
      } finally {
        setLoadingThread(false);
      }
    },
    [api]
  );

  useEffect(() => {
    if (selectedId || conversations.length === 0) return;
    // Deep link `/messagerie?doc=<declarationId>` posé par le paiement de récupération.
    const linked = docParam ? conversations.find((c) => c.lost_declaration_id === docParam) : null;
    const preferred = linked ?? (document.documentElement.clientWidth >= 768 ? conversations[0] : null);
    if (preferred) openThread(preferred);
  }, [conversations, selectedId, openThread, docParam]);

  useEffect(() => {
    const onMessage = (event: Event) => {
      const message = (event as CustomEvent<ConversationMessage>).detail;
      if (!message?.conversation_id) return;
      if (message.conversation_id === selectedIdRef.current) {
        setMessages((current) => appendUnique(current, message));
        // Le fil est à l'écran : sans marquage, le compteur de la sidebar
        // grimperait pendant que l'utilisateur lit.
        api.markRead(message.conversation_id).catch(() => undefined);
        window.dispatchEvent(new CustomEvent("docmaster:conversation-read"));
      }
      loadConversations(filter);
    };
    const onOpened = () => loadConversations(filter);

    socketService.init();
    window.addEventListener("docmaster:conversation-message", onMessage);
    window.addEventListener("docmaster:conversation-opened", onOpened);
    return () => {
      window.removeEventListener("docmaster:conversation-message", onMessage);
      window.removeEventListener("docmaster:conversation-opened", onOpened);
    };
  }, [filter, loadConversations, api]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter((item) =>
      [item.counterpart_name, item.doc_type_nom, item.identifiant_doc_dm, item.last_message]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [conversations, search]);

  const send = async () => {
    const body = draft.trim();
    if (!selected || !body || sending) return;
    setSending(true);
    try {
      const message = await api.send(selected.id, body);
      setMessages((current) => appendUnique(current, message));
      setDraft("");
      setConversations((current) =>
        current.map((item) =>
          item.id === message.conversation_id
            ? { ...item, last_message: message.body, last_message_at: message.created_at }
            : item
        )
      );
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSending(false);
    }
  };

  const toggleArchived = async () => {
    if (!selected) return;
    try {
      await api.archive(selected.id, selected.status !== "ARCHIVED");
      setSelectedId(null);
      setMessages([]);
      loadConversations(filter);
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  const closeThread = async () => {
    if (!selected) return;
    try {
      await api.close(selected.id);
      loadConversations(filter);
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  const isMine = (message: ConversationMessage) =>
    !(selected?.counterpart_type === message.sender_type && selected?.counterpart_id === message.sender_id);

  const dayGroups = useMemo(() => {
    const groups: { day: string; items: ConversationMessage[] }[] = [];
    messages.forEach((message) => {
      const day = fmtLongDate(lang, message.created_at);
      const last = groups[groups.length - 1];
      if (last?.day === day) last.items.push(message);
      else groups.push({ day, items: [message] });
    });
    return groups;
  }, [messages, lang]);

  const emptyKey = portal === "partenaire" ? "messagerie_empty_partner" : "messagerie_empty_user";
  const isClosed = !!selected && selected.status !== "OPEN";

  return (
    <div className="flex flex-1 overflow-hidden" style={{ background: theme.surface }}>
      {/* Colonne liste */}
      <aside
        className={`flex-col flex-shrink-0 border-r ${selectedId ? "hidden md:flex" : "flex w-full"} md:w-96`}
        style={{ borderColor: theme.border, background: theme.surface }}
      >
        <div className="p-4 border-b" style={{ borderColor: theme.border }}>
          <h2 className="text-sm font-semibold" style={{ color: theme.textMain }}>
            {t("messagerie_threads_title")}
          </h2>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("messagerie_search_placeholder")}
            className="mt-3 w-full rounded-full px-3 py-2 text-xs outline-none"
            style={{ border: `1px solid ${theme.border}`, color: theme.textMain, background: theme.surface }}
          />
        </div>

        <div className="px-4 py-3 border-b flex gap-2" style={{ borderColor: theme.border }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className="px-3 py-1 text-xs font-medium rounded-full transition-colors"
              style={
                filter === tab
                  ? { background: theme.accent, color: "#FFFFFF" }
                  : { background: theme.surface, color: theme.textMuted, border: `1px solid ${theme.border}` }
              }
            >
              {t(`messagerie_tab_${tab}`)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {visible.map((item) => {
            const isActive = item.id === selectedId;
            return (
              <button
                key={item.id}
                onClick={() => openThread(item)}
                className="w-full text-left px-4 py-3 border-b transition-colors"
                style={{
                  borderColor: theme.border,
                  background: isActive ? theme.accentSoft : theme.surface,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate" style={{ color: theme.textMain }}>
                    {item.counterpart_name || t("messagerie_unknown_counterpart")}
                  </span>
                  <span className="text-[11px] flex-shrink-0" style={{ color: theme.textMuted }}>
                    {shortWhen(lang, item.last_message_at ?? item.opened_at)}
                  </span>
                </div>
                <div className="text-[11px] mt-0.5 truncate" style={{ color: theme.textMuted }}>
                  {[item.doc_type_nom, item.ville].filter(Boolean).join(" · ") ||
                    item.identifiant_doc_dm ||
                    t("messagerie_document")}
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-xs truncate" style={{ color: theme.textMuted }}>
                    {item.last_message || t("messagerie_no_message_yet")}
                  </span>
                  {item.unread_count > 0 && (
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: theme.accent, color: "#FFFFFF" }}
                    >
                      {item.unread_count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {!loadingList && visible.length === 0 && (
            <div className="p-6 text-center">
              <i className="fa-regular fa-message text-2xl" style={{ color: theme.accent }} />
              <h3 className="text-sm font-semibold mt-3" style={{ color: theme.textMain }}>
                {t("messagerie_empty_title")}
              </h3>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: theme.textMuted }}>
                {t(emptyKey)}
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Colonne fil */}
      <section className={`flex-1 flex-col min-w-0 ${selectedId ? "flex" : "hidden md:flex"}`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <i className="fa-regular fa-comments text-4xl" style={{ color: theme.accent }} />
            <h2 className="text-base font-semibold" style={{ color: theme.textMain }}>
              {t("messagerie_welcome_title")}
            </h2>
            <p className="text-sm max-w-sm" style={{ color: theme.textMuted }}>
              {t(emptyKey)}
            </p>
          </div>
        ) : (
          <>
            <header
              className="px-4 py-3 border-b flex items-start justify-between gap-3 flex-shrink-0"
              style={{ borderColor: theme.border, background: theme.surface }}
            >
              <div className="min-w-0">
                <button
                  onClick={() => setSelectedId(null)}
                  className="md:hidden text-xs mb-1 flex items-center gap-1"
                  style={{ color: theme.textMuted }}
                >
                  <i className="fa-solid fa-arrow-left" /> {t("messagerie_back")}
                </button>
                <h3 className="text-sm font-semibold truncate" style={{ color: theme.textMain }}>
                  {selected.counterpart_name || t("messagerie_unknown_counterpart")}
                </h3>
                <p className="text-[11px] truncate" style={{ color: theme.textMuted }}>
                  {[selected.doc_type_nom, selected.owner_name, selected.ville].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={toggleArchived}
                  title={selected.status === "ARCHIVED" ? t("messagerie_unarchive") : t("messagerie_archive")}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ border: `1px solid ${theme.border}`, color: theme.textMuted }}
                >
                  <i className="fa-solid fa-box-archive text-xs" />
                </button>
                {selected.status === "OPEN" && (
                  <button
                    onClick={closeThread}
                    title={t("messagerie_close")}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ border: `1px solid ${theme.border}`, color: theme.textMuted }}
                  >
                    <i className="fa-solid fa-check text-xs" />
                  </button>
                )}
              </div>
            </header>

            <DossierContext conversation={selected} theme={theme} lang={lang} t={t} />

            {isClosed && (
              <div className="px-4 py-2 text-xs text-center" style={{ background: theme.subtle, color: theme.textMuted }}>
                {t("messagerie_closed_notice")}
              </div>
            )}

            <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-4" style={{ background: theme.subtle }}>
              {loadingThread ? (
                <div className="text-xs text-center py-8" style={{ color: theme.textMuted }}>
                  {t("messagerie_loading")}
                </div>
              ) : (
                dayGroups.map((group) => (
                  <div key={group.day}>
                    <div className="text-center my-3">
                      <span className="text-[11px] px-3 py-1 rounded-full" style={{ color: theme.textMuted, background: theme.surface }}>
                        {group.day}
                      </span>
                    </div>
                    {group.items.map((message) =>
                      message.kind === "SYSTEM" ? (
                        <div key={message.id} className="text-center my-3">
                          <span className="text-[11px]" style={{ color: theme.textMuted }}>
                            {message.body}
                          </span>
                        </div>
                      ) : (
                        <div key={message.id} className={`flex mb-2 ${isMine(message) ? "justify-end" : "justify-start"}`}>
                          <div
                            className="max-w-[80%] rounded-2xl px-3 py-2"
                            style={
                              isMine(message)
                                ? { background: theme.accent, color: "#FFFFFF" }
                                : { background: theme.surface, border: `1px solid ${theme.border}`, color: theme.textMain }
                            }
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                            <span
                              className="block text-[10px] mt-1 text-right"
                              style={{ color: isMine(message) ? "rgba(255,255,255,0.75)" : theme.textMuted }}
                            >
                              {fmtTime(lang, message.created_at)}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ))
              )}
              {!loadingThread && messages.length === 0 && (
                <p className="text-xs text-center py-8" style={{ color: theme.textMuted }}>
                  {t("messagerie_no_message_yet")}
                </p>
              )}
            </div>

            <div className="p-3 border-t flex-shrink-0" style={{ borderColor: theme.border, background: theme.surface }}>
              {error && <p className="text-[11px] mb-2" style={{ color: theme.accentDark }}>{error}</p>}
              <div className="flex items-end gap-2">
                <textarea
                  rows={1}
                  value={draft}
                  disabled={isClosed}
                  maxLength={MAX_LENGTH}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      send();
                    }
                  }}
                  placeholder={t("messagerie_composer_placeholder")}
                  className="flex-1 resize-none rounded-xl px-3 py-2 text-sm outline-none max-h-40"
                  style={{ border: `1px solid ${theme.border}`, color: theme.textMain, background: theme.surface }}
                />
                <button
                  onClick={send}
                  disabled={isClosed || sending || !draft.trim()}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-opacity disabled:opacity-40"
                  style={{ background: theme.accent, color: "#FFFFFF" }}
                >
                  {t("messagerie_send")}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
