const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
const configuredSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

function isLocalhostHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

interface ServiceBase {
  api: string;
  socket: string;
  useSocketPath: boolean;
}

/** Resolve API/socket base URLs for localhost vs LAN (no manual env on judge tablets). */
function getServiceBase(): ServiceBase {
  const localFallback = "http://localhost:4000";

  if (typeof window === "undefined") {
    const fallback =
      configuredApiUrl &&
      (configuredApiUrl.includes("localhost") || configuredApiUrl.includes("127.0.0.1"))
        ? configuredApiUrl
        : localFallback;
    return {
      api: stripTrailingSlash(fallback),
      socket: stripTrailingSlash(configuredSocketUrl ?? fallback),
      useSocketPath: false,
    };
  }

  const { origin, hostname } = window.location;

  // Tablets / projector on a LAN hostname: always same-origin. Next proxies /api.
  // Never pin a Wi-Fi IP here — it goes stale and login shows "Failed to fetch".
  if (!isLocalhostHostname(hostname)) {
    return { api: origin, socket: origin, useSocketPath: true };
  }

  return {
    api: stripTrailingSlash(localFallback),
    socket: stripTrailingSlash(localFallback),
    useSocketPath: false,
  };
}

export function getApiUrl(path: string): string {
  const { api } = getServiceBase();
  return `${api}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getSocketUrl(): string {
  return getSocketOptions().url;
}

export function getSocketOptions(): { url: string; path?: string } {
  const { socket, useSocketPath } = getServiceBase();
  return useSocketPath ? { url: socket, path: "/socket.io" } : { url: socket };
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
