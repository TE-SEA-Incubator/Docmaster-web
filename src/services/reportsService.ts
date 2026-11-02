import apiClient from "./api";
import type { ApiResponse } from "../types/api";

export type ReportTargetType = "DECLARATION" | "MATCH" | "CONVERSATION" | "USER" | "SUPPORT";
export type ReportReasonCategory = "WRONG_DOCUMENT" | "NO_HANDOVER" | "FRAUD" | "ABUSIVE" | "OTHER";
export type ReportStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
export type ReportActionType =
  | "REPLY"
  | "NUDGE_FINDER"
  | "REGENERATE_CODE"
  | "CLOSE_AND_REFUND"
  | "BLOCK_USER"
  | "UNBLOCK_USER";

export type ReportActionSubject = "TARGET" | "REPORTER";

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string | null;
  reason_category: ReportReasonCategory;
  description: string;
  status: ReportStatus;
  admin_note?: string | null;
  admin_reply?: string | null;
  resolution_action?: ReportActionType | null;
  resolution_payload?: Record<string, any> | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  reporter_nom?: string | null;
  reporter_prenom?: string | null;
  reporter_email?: string | null;
  reporter_telephone?: string | null;
  reporter_role?: string | null;
  reporter_is_verified?: boolean | null;
  reporter_blocked_at?: string | null;
  reporter_blocked_reason?: string | null;
  target_reference?: string | null;
  target_owner?: string | null;
  target_declaration_type?: string | null;
  target_declaration_status?: string | null;
  match_id?: string | null;
  context_match_id?: string | null;
  lost_declaration_id?: string | null;
  found_declaration_id?: string | null;
  case_owner_id?: string | null;
  case_finder_id?: string | null;
  target_user_id?: string | null;
  target_user_nom?: string | null;
  target_user_prenom?: string | null;
  target_user_email?: string | null;
  target_user_telephone?: string | null;
  target_user_blocked_at?: string | null;
  target_user_blocked_reason?: string | null;
  target_user_role?: string | null;
  target_user_is_verified?: boolean | null;
  claim_id?: string | null;
  claim_status?: string | null;
  claim_amount?: number | null;
  claim_currency?: string | null;
  claim_code_expires_at?: string | null;
  claim_finder_id?: string | null;
  claim_owner_id?: string | null;
  claim_payment_method?: string | null;
}

export interface CreateReportPayload {
  target_type: ReportTargetType;
  target_id?: string | null;
  reason_category: ReportReasonCategory;
  description: string;
}

interface ReportListResponse extends ApiResponse<Report[]> {
  count?: number;
  open?: number;
}

export const reportsService = {
  async create(payload: CreateReportPayload) {
    const res = await apiClient.post<ApiResponse<Report>>("reports", payload);
    return res.data;
  },

  async getMine() {
    const res = await apiClient.get<ReportListResponse>("reports/me");
    return res.data;
  },

  async listAdmin(status?: ReportStatus | "") {
    const res = await apiClient.get<ReportListResponse>("reports/admin", {
      params: status ? { status } : undefined,
    });
    return res.data;
  },

  async review(id: string, payload: { status: ReportStatus; admin_note?: string }) {
    const res = await apiClient.patch<ApiResponse<Report>>(`reports/admin/${id}`, payload);
    return res.data;
  },

  async applyAction(
    id: string,
    payload: {
      action: ReportActionType;
      subject?: ReportActionSubject;
      message?: string;
      reason?: string;
      hours?: number;
    },
  ) {
    const res = await apiClient.post<ApiResponse<Report>>(`reports/admin/${id}/actions`, payload);
    return res.data;
  },
};
