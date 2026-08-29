const fs = require("fs");
const f = "src/lib/siteConfig.ts";
let s = fs.readFileSync(f, "utf8");

s = s.replace(
  `  offerLabel: string | null;
  offerInr: number | null;
}`,
  `  offerLabel: string | null;
  offerInr: number | null;
  /**
   * What to SHOW this visitor, already converted by the server. `fromInr` stays
   * the rupee figure the owner typed; these are the same price in the money the
   * visitor thinks in. Always display these, never the *Inr fields.
   */
  from: number;
  offer: number | null;
}

export interface MarketInfo {
  country: string;
  currency: string;
  locale: string;
  isIndia: boolean;
}

const INR_MARKET: MarketInfo = { country: "IN", currency: "INR", locale: "en-IN", isIndia: true };`
);

s = s.replace(
  `  /** Two-letter country of the visitor, from the edge. "" when unknown. */
  country: string;
}`,
  `  /** Two-letter country of the visitor, from the edge. "" when unknown. */
  country: string;
  /** Currency this visitor is priced in. */
  market: MarketInfo;
}`
);

s = s.replace(
  `    offerLabel: null,
    offerInr: null,
  }));`,
  `    offerLabel: null,
    offerInr: null,
    from: o.fromInr,
    offer: null,
  }));`
);

s = s.replace(
  `        pricing,
        affiliate: d?.affiliate,
        country: String(d?.country || ""),
      };`,
  `        pricing,
        affiliate: d?.affiliate,
        country: String(d?.country || ""),
        market: (d?.market as MarketInfo) || INR_MARKET,
      };`
);

s = s.replace(
  `      cache = { whatsapp: "", chatEnabled: true, announcement: "", pricing: fromLocal(), country: "" };`,
  `      cache = {
        whatsapp: "", chatEnabled: true, announcement: "",
        pricing: fromLocal(), country: "", market: INR_MARKET,
      };`
);

s += `
/**
 * Format a price for THIS visitor.
 *
 * Takes an amount the server has already converted (a \`from\`/\`offer\` field),
 * and only decides how to print it. It deliberately cannot convert — doing the
 * arithmetic in the browser as well as on the server is how a page ends up
 * disagreeing with the guide that quoted it.
 */
export function useMoney(): (amount: number) => string {
  const cfg = useSiteConfig();
  const m = cfg?.market ?? INR_MARKET;
  return (amount: number) => {
    try {
      return new Intl.NumberFormat(m.locale, {
        style: "currency",
        currency: m.currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return \`\${m.currency} \${Math.round(amount)}\`;
    }
  };
}
`;
fs.writeFileSync(f, s);
console.log("siteConfig extended");
