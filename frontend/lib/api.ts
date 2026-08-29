const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function getApiUrl(path: string): string {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getSocketUrl(): string {
  return process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
}

/** Resolve relative upload paths (e.g. /uploads/...) against the API origin. */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  return getApiUrl(url);
}

export async function uploadCandidatePhoto(
  candidateId: number,
  file: File,
  token: string | null
): Promise<unknown> {
  const formData = new FormData();
  formData.append("photo", file);

  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(getApiUrl(`/api/admin/candidates/${candidateId}/photo`), {
    method: "POST",
    headers,
    body: formData,
    credentials: "include",
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Photo upload failed");
  }
  return data;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(getApiUrl(path), {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.headers.get("content-type")?.includes("spreadsheetml")) {
    return response as unknown as T;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }

  return data as T;
}

export async function downloadExport(token: string | null): Promise<void> {
  const response = await fetch(getApiUrl("/api/tabulation/export"), {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: "Export failed" }));
    throw new Error(data.error ?? "Export failed");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition");
  const filenameMatch = disposition?.match(/filename="(.+)"/);
  const filename = filenameMatch?.[1] ?? "Katimugan-Results.xlsx";

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
