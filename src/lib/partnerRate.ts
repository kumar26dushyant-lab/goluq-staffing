import { useSiteConfig } from "../lib/siteConfig";
import { RATE } from "../content/affiliateConfig";

/** The live partner rate as a whole percentage — the same number everywhere it is quoted. */
export function usePartnerRate(): number {
  const cfg = useSiteConfig();
  return Math.round((cfg?.affiliate?.rate ?? RATE) * 100);
}
