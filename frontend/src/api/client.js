const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5001/api"
).replace(/\/+$/, "");

const TOKEN_STORAGE_KEY = "dispatch_token";
const LEGACY_TOKEN_STORAGE_KEY = "outbox_token";

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export function getStoredToken() {
  try {
    return (
      localStorage.getItem(TOKEN_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_TOKEN_STORAGE_KEY)
    );
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota / private mode issues
  }
}

export function clearStoredToken() {
  setStoredToken(null);
}

/**
 * Performs an HTTP request against the Outbox backend API with automatic
 * Bearer token attachment and normalized error handling.
 */
export async function apiRequest(path, options = {}) {
  const { method = "GET", body, headers = {}, skipAuthRedirect = false } = options;
  const token = getStoredToken();

  const requestHeaders = {
    ...headers,
  };

  if (body !== undefined && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (token && !requestHeaders.Authorization) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      `Unable to reach the Dispatch server at ${API_BASE_URL}. Make sure the backend is running.`
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && !skipAuthRedirect && typeof unauthorizedHandler === "function") {
      unauthorizedHandler();
    }

    const error = new Error(data.error || data.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const authApi = {
  login: (credentials) =>
    apiRequest("/auth/login", {
      method: "POST",
      body: credentials,
      skipAuthRedirect: true,
    }),

  register: (payload) =>
    apiRequest("/auth/register", {
      method: "POST",
      body: payload,
      skipAuthRedirect: true,
    }),

  googleLogin: (payload) =>
    apiRequest("/auth/google", {
      method: "POST",
      body: payload,
      skipAuthRedirect: true,
    }),

  me: () => apiRequest("/auth/me"),
};

export const emailsApi = {
  list: () => apiRequest("/emails"),

  schedule: (payload) =>
    apiRequest("/emails/schedule", {
      method: "POST",
      body: payload,
    }),

  cancel: (id) =>
    apiRequest(`/emails/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  sendNow: (id) =>
    apiRequest(`/emails/${encodeURIComponent(id)}/send-now`, {
      method: "POST",
    }),

  reschedule: (id, scheduledAt) =>
    apiRequest(`/emails/${encodeURIComponent(id)}/reschedule`, {
      method: "PATCH",
      body: { scheduledAt },
    }),

  retry: (id) =>
    apiRequest(`/emails/${encodeURIComponent(id)}/retry`, {
      method: "POST",
    }),
};

export { API_BASE_URL };
