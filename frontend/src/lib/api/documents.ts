import { createClient } from "@/src/lib/supabase/client";

export type DocumentStatus = "processing" | "ready" | "failed";

export interface DocumentOut {
  id: string;
  tenant_id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number | null;
  file_url: string;
  status: DocumentStatus;
  document_type: string | null;
  chunk_count: number | null;
  version: number;
  checksum: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BusinessInfo {
  operating_hours: string | null;
  location: string | null;
  delivery_options: string | null;
}

export class AuthExpiredError extends Error {}

async function authHeader() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new AuthExpiredError("You must be logged in to manage documents.");
  return { Authorization: `Bearer ${session.access_token}` };
}

async function parseError(res: Response, fallback: string) {
  const body = await res.json().catch(() => null);
  return body?.detail?.[0]?.msg ?? body?.detail ?? fallback;
}

async function handle<T>(res: Response, fallback: string): Promise<T> {
  if (res.status === 401) throw new AuthExpiredError("Your session has expired. Please sign in again.");
  if (!res.ok) throw new Error(await parseError(res, fallback));
  return res.status === 204 ? (undefined as T) : res.json();
}

export async function listDocuments(): Promise<DocumentOut[]> {
  const headers = await authHeader();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents`, { headers });
  return handle(res, "Failed to load documents.");
}

export async function uploadDocument(file: File, documentType?: string): Promise<DocumentOut> {
  const headers = await authHeader();
  const form = new FormData();
  form.append("file", file);
  if (documentType) form.append("document_type", documentType);

  // No Content-Type header here — the browser sets multipart/form-data with
  // the correct boundary itself; setting it manually breaks the upload.
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents`, {
    method: "POST",
    headers,
    body: form,
  });
  return handle(res, "Failed to upload document.");
}

export async function replaceDocument(documentId: string, file: File): Promise<DocumentOut> {
  const headers = await authHeader();
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/${documentId}/replace`, {
    method: "PUT",
    headers,
    body: form,
  });
  return handle(res, "Failed to replace document.");
}

export async function deleteDocument(documentId: string): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/${documentId}`, {
    method: "DELETE",
    headers,
  });
  return handle(res, "Failed to delete document.");
}

export async function fetchBusinessInfo(): Promise<BusinessInfo> {
  const headers = await authHeader();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/business-info`, { headers });
  return handle(res, "Failed to load business info.");
}

export async function updateBusinessInfo(patch: Partial<BusinessInfo>): Promise<BusinessInfo> {
  const headers = await authHeader();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/business-info`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(patch),
  });
  return handle(res, "Failed to save business info.");
}
