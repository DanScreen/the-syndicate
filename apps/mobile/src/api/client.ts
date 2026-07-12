import { API_URL } from "@/config";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function formatError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const obj = error as Record<string, unknown>;
    if (typeof obj.formErrors === "object" && Array.isArray((obj.formErrors as string[]))) {
      const msgs = (obj.formErrors as string[]).join(", ");
      if (msgs) return msgs;
    }
    if (typeof obj.fieldErrors === "object" && obj.fieldErrors) {
      const parts = Object.entries(obj.fieldErrors as Record<string, string[]>)
        .flatMap(([field, msgs]) => msgs.map((m) => `${field}: ${m}`));
      if (parts.length) return parts.join("; ");
    }
  }
  return "Request failed";
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, headers: initHeaders, ...init } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(initHeaders as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, formatError(data.error ?? data.message ?? "Request failed"));
  }

  return data as T;
}
