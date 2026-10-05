import type { AxiosInstance } from "axios";
import apiClient from "./api";
import { partnerGeneralApi } from "./partenairesService";

export type ConversationFilter = "all" | "unread" | "archived";
export type ConversationStatus = "OPEN" | "CLOSED" | "ARCHIVED";
export type ConversationActorType = "USER" | "PARTENAIRE" | "AUTORITE";

export interface ConversationSummary {
  id: string;
  claim_id: string | null;
  lost_declaration_id: string;
  found_declaration_id: string | null;
  status: ConversationStatus;
  opened_at: string;
  closed_at: string | null;
  identifiant_doc_dm: string | null;
  doc_type_nom: string | null;
  owner_name: string | null;
  ville: string | null;
  quartier: string | null;
  declaration_status: string | null;
  claim_status: string | null;
  counterpart_type: ConversationActorType | null;
  counterpart_id: string | null;
  counterpart_role: "OWNER" | "FINDER" | null;
  counterpart_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_sender_type: ConversationActorType | null;
  unread_count: number;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  sender_type: ConversationActorType;
  sender_id: string;
  body: string;
  kind: "TEXT" | "SYSTEM";
  created_at: string;
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  message?: string;
}

function createConversationsApi(client: AxiosInstance, prefix: string) {
  const at = (path = "") => `${prefix}${path}`;
  const unwrapList = <T,>(payload: Envelope<T[]>): T[] => payload?.data ?? [];

  return {
    list(filter: ConversationFilter = "all"): Promise<ConversationSummary[]> {
      return client
        .get<Envelope<ConversationSummary[]>>(at(), { params: { filter } })
        .then((res) => unwrapList(res.data));
    },

    messages(conversationId: string, before?: string | null): Promise<ConversationMessage[]> {
      return client
        .get<Envelope<ConversationMessage[]>>(at(`/${conversationId}/messages`), {
          params: before ? { before } : undefined,
        })
        .then((res) => unwrapList(res.data));
    },

    send(conversationId: string, body: string): Promise<ConversationMessage> {
      return client
        .post<Envelope<ConversationMessage>>(at(`/${conversationId}/messages`), { body })
        .then((res) => res.data.data as ConversationMessage);
    },

    markRead(conversationId: string) {
      return client.patch<Envelope<null>>(at(`/${conversationId}/read`));
    },

    close(conversationId: string) {
      return client.post<Envelope<ConversationSummary>>(at(`/${conversationId}/close`));
    },

    archive(conversationId: string, archived: boolean) {
      return client.post<Envelope<ConversationSummary>>(at(`/${conversationId}/archive`), { archived });
    },
  };
}

export type ConversationsApi = ReturnType<typeof createConversationsApi>;

export const conversationsService = createConversationsApi(apiClient, "conversations");

export const partenaireConversationsService = createConversationsApi(
  partnerGeneralApi,
  "partenaires/conversations"
);
