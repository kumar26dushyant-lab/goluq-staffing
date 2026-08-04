import i18n from "../i18n";

export type ContentOverrides = Record<string, { en?: string; hi?: string }>;

/** "about.founder1" + value → { about: { founder1: value } } */
function nest(key: string, value: string): Record<string, unknown> {
  const parts = key.split(".");
  const root: Record<string, unknown> = {};
  let cur = root;
  parts.forEach((p, i) => {
    if (i === parts.length - 1) cur[p] = value;
    else {
      cur[p] = {};
      cur = cur[p] as Record<string, unknown>;
    }
  });
  return root;
}

/**
 * Overlays owner-edited copy on top of the shipped translation files.
 *
 * i18next merges deeply here (the last two `true`s), so an override replaces
 * exactly one string and leaves everything around it alone. That is what lets
 * the JSON files stay the defaults: clearing an override in the cockpit simply
 * stops it being applied on the next load.
 *
 * Called once, right after site config arrives.
 */
export function applyContentOverrides(content: ContentOverrides | undefined): void {
  if (!content) return;
  for (const [key, val] of Object.entries(content)) {
    if (val?.en) i18n.addResourceBundle("en", "translation", nest(key, val.en), true, true);
    if (val?.hi) i18n.addResourceBundle("hi", "translation", nest(key, val.hi), true, true);
  }
  // Nudge every mounted <Trans>/useTranslation to re-read.
  i18n.emit("languageChanged", i18n.language);
}
