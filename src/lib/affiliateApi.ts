const KEY = "goluq_affiliate";

export function getAffToken(): string {
  return localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || "";
}
export function setAffToken(t: string, remember = true) {
  clearAffToken();
  (remember ? localStorage : sessionStorage).setItem(KEY, t);
}
export function clearAffToken() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
}

export interface Referral {
  id: number;
  name: string;
  industry: string | null;
  status: string;
  converted_at: string | null;
  created_at: string;
}

export interface LedgerRow {
  period_month: string;
  rate: number;
  amount_inr: number;
  status: string;
  created_at: string;
  customer: string | null;
}

export interface AffiliateStats {
  ok: boolean;
  affiliate?: { name: string; code: string; email: string | null; shareUrl: string };
  clicks: number;
  leads: number;
  conversions: number;
  earnings: { pending: number; approved: number; paid: number };
  referrals: Referral[];
  ledger: LedgerRow[];
  rates: { year1: number; lifetime: number; minPayoutInr: number; attributionDays: number };
}

async function post(body: Record<string, unknown>) {
  const r = await fetch("/api/affiliate/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-affiliate-token": getAffToken() },
    body: JSON.stringify(body),
  });
  return r.json();
}

export const affLogin = (phone: string, password: string) =>
  post({ action: "login", phone, password });

export const affForgot = (phone: string) => post({ action: "forgot", phone });

export const affSetPassword = (token: string, password: string) =>
  post({ action: "set-password", token, password });

export async function affLogout() {
  try {
    await post({ action: "logout" });
  } catch {
    /* clearing locally is what matters */
  }
  clearAffToken();
}

/**
 * Loads the partner's own figures. Falls back to the legacy `?token=` dashboard
 * link so partners who registered before accounts existed keep working.
 */
export async function affStats(legacyToken?: string): Promise<AffiliateStats | null> {
  try {
    const qs = legacyToken ? `?token=${encodeURIComponent(legacyToken)}` : "";
    const r = await fetch(`/api/affiliate/stats${qs}`, {
      headers: { "x-affiliate-token": getAffToken() },
    });
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}
