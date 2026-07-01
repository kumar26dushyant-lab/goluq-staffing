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

async function req(path: string, opts: RequestInit = {}) {
  return fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", "x-admin-secret": getToken(), ...(opts.headers || {}) },
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

/** CSV export needs the secret in the URL (it's an <a download>, no headers). */
export function leadsCsvUrl(q = "", status = ""): string {
  const p = new URLSearchParams({ format: "csv", secret: getToken() });
  if (q) p.set("q", q);
  if (status) p.set("status", status);
  return `/api/admin/leads?${p.toString()}`;
}
