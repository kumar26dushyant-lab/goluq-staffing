const KEY = "goluq_admin";

export function getToken(): string {
  return localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || "";
}
export function setToken(t: string, remember: boolean) {
  clearToken();
  (remember ? localStorage : sessionStorage).setItem(KEY, t);
}
export function clearToken() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
}

/**
 * All admin calls carry the login session token. ADMIN_SECRET still works
 * server-side as a break-glass credential, but the UI never asks for it.
 */
async function req(path: string, opts: RequestInit = {}) {
  return fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": getToken(),
      ...(opts.headers || {}),
    },
  });
}

export async function adminGet<T = any>(path: string): Promise<T> {
  const r = await req(path);
  if (r.status === 401) throw new Error("unauthorized");
  return r.json();
}
export async function adminPost<T = any>(path: string, body: unknown): Promise<T> {
  const r = await req(path, { method: "POST", body: JSON.stringify(body) });
  if (r.status === 401) throw new Error("unauthorized");
  return r.json();
}

/** Sign in with the owner's phone number + chosen password. */
export async function login(
  username: string,
  password: string
): Promise<{ ok: boolean; token?: string; error?: string }> {
  const r = await fetch("/api/admin/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", username, password }),
  });
  return r.json();
}

/** Set the password from a one-time setup link; returns a session on success. */
export async function setPasswordWithToken(
  setupToken: string,
  password: string
): Promise<{ ok: boolean; token?: string; error?: string }> {
  const r = await fetch("/api/admin/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "set-password", setupToken, password }),
  });
  return r.json();
}

export async function checkSetupToken(
  token: string
): Promise<{ valid: boolean; username: string }> {
  try {
    const r = await fetch(`/api/admin/auth?setup=${encodeURIComponent(token)}`);
    const d = await r.json();
    return { valid: !!d.valid, username: d.username || "" };
  } catch {
    return { valid: false, username: "" };
  }
}

export async function logout(): Promise<void> {
  try {
    await adminPost("/api/admin/auth", { action: "logout" });
  } catch {
    /* clearing locally is what matters */
  }
  clearToken();
}

/** CSV export needs the token in the URL (it's an <a download>, no headers). */
export function leadsCsvUrl(q = "", status = ""): string {
  const p = new URLSearchParams({ format: "csv", token: getToken() });
  if (q) p.set("q", q);
  if (status) p.set("status", status);
  return `/api/admin/leads?${p.toString()}`;
}
