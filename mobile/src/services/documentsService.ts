import { apiClient } from "@/api/client";
import { endpoints } from "@/api/endpoints";
import type { ApiResponse, CreateDocumentInput, Document } from "@/types/api";

function unwrap<T>(payload: ApiResponse<T> | T): T {
  if (payload && typeof payload === "object" && "data" in (payload as object)) {
    return (payload as ApiResponse<T>).data as T;
  }
  return payload as T;
}

export const documentsService = {
  async getAll(): Promise<Document[]> {
    const { data } = await apiClient.get<ApiResponse<Document[]> | Document[]>(
      endpoints.documents.list,
    );
    return unwrap(data) ?? [];
  },

  async create(input: CreateDocumentInput): Promise<Document> {
    const { data } = await apiClient.post<ApiResponse<Document> | Document>(
      endpoints.documents.create,
      input,
    );
    return unwrap(data);
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(endpoints.documents.byId(id));
  },
};
