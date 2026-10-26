import type { ApiResponse, ErrorResponse } from "@portofolio/shared";

const API_BASE = "/api";
const TOKEN_KEY = "admin_auth_token";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export function setBearerToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getBearerToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const token = getBearerToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body,
    credentials: "include",
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = payload as ErrorResponse | null;
    throw new ApiError(error?.message ?? response.statusText, response.status, error?.errors);
  }

  return payload as T;
}

/** GET a documented `{ success, data }` envelope and return `data`. */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiRequest<ApiResponse<T>>(path, { method: "GET" });
  return res.data;
}

/** POST/PUT/PATCH/DELETE a documented `{ success, data }` envelope and return `data`. */
export async function apiSend<T>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await apiRequest<ApiResponse<T>>(path, { method, body });
  return res.data;
}

/** Upload a file (multipart/form-data) and return the documented `data`. */
export async function apiUpload<T>(path: string, file: File, field = "file"): Promise<T> {
  const formData = new FormData();
  formData.append(field, file);
  const res = await apiRequest<ApiResponse<T>>(path, { method: "POST", body: formData });
  return res.data;
}
