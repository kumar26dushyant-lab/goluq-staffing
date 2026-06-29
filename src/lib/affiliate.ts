export interface AffiliateRegisterInput {
  name: string;
  phone: string;
  email?: string;
  pan: string;
  upiId: string;
  youtubeUrl?: string;
  city?: string;
}

export interface AffiliateRegisterResult {
  ok: boolean;
  code?: string;
  token?: string;
  shareUrl?: string;
  dashboardUrl?: string;
  error?: string;
}

export interface AffiliateStats {
  ok: boolean;
  affiliate?: { name: string; code: string; shareUrl: string };
  clicks?: number;
  leads?: number;
  conversions?: number;
  earnings?: { pending: number; approved: number; paid: number };
  recent?: Array<{ period_month: string; amount_inr: number; status: string; created_at: string }>;
  error?: string;
}

export async function registerAffiliate(
  input: AffiliateRegisterInput
): Promise<AffiliateRegisterResult> {
  const res = await fetch("/api/affiliate/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function fetchStats(token: string): Promise<AffiliateStats> {
  const res = await fetch(`/api/affiliate/stats?token=${encodeURIComponent(token)}`);
  return res.json();
}
