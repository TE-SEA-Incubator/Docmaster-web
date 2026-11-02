import apiClient from "./api";
import type { ApiResponse } from "../types/api";

export type TestimonialContext = "MATCH" | "RECOVERY";

export interface PublicTestimonial {
  id: string;
  author_label: string;
  context: TestimonialContext;
  rating: number;
  comment: string;
  created_at: string;
}

export interface MyTestimonial {
  id: string;
  user_id: string;
  declaration_id: string;
  context: TestimonialContext;
  rating: number;
  comment: string;
  status: "PUBLISHED" | "HIDDEN";
  created_at: string;
}

export interface TestimonialEligibility {
  eligible: boolean;
  context: TestimonialContext | null;
  reason: string | null;
  declaration_status: string | null;
  testimonial: MyTestimonial | null;
}

export const testimonialsService = {
  async listPublic(limit = 12) {
    const res = await apiClient.get<ApiResponse<PublicTestimonial[]>>("testimonials", {
      params: { limit },
    });
    return res.data;
  },

  async getEligibility(declarationId: string) {
    const res = await apiClient.get<ApiResponse<TestimonialEligibility>>(
      `testimonials/eligibility/${declarationId}`,
    );
    return res.data;
  },

  async create(data: { declaration_id: string; rating: number; comment: string }) {
    const res = await apiClient.post<ApiResponse<MyTestimonial>>("testimonials", data);
    return res.data;
  },
};
