/**
 * The copy the owner can edit from the cockpit.
 *
 * This is a CURATED list on purpose. Exposing every translation key would turn
 * the cockpit into a raw string editor where a mistyped key silently breaks a
 * page — and where the bot's honesty guardrails and the legal compliance notes
 * could be edited away. Those stay in code.
 *
 * Each entry is a dotted i18n path. Values saved against these keys are overlaid
 * on top of the shipped translations at runtime (see src/lib/content.ts), so the
 * JSON files remain the defaults and clearing an override restores them.
 *
 * To make something else editable: add it here. No backend change needed.
 */
export interface EditableField {
  key: string;
  label: string;
  hint?: string;
  multiline?: boolean;
}

export interface EditableGroup {
  id: string;
  title: string;
  blurb: string;
  fields: EditableField[];
}

export const EDITABLE_COPY: EditableGroup[] = [
  {
    id: "hero",
    title: "Homepage hero",
    blurb: "The first three lines a visitor reads. Highest-traffic copy on the site.",
    fields: [
      { key: "greeting.headline", label: "Headline", multiline: true },
      {
        key: "greeting.headlineAccent",
        label: "Headline (highlighted part)",
        hint: "Shown in the brand gradient, immediately after the headline.",
      },
      { key: "catalogue.hook", label: "Value hook", hint: "Sits under the headline, before the price.", multiline: true },
      { key: "greeting.intro", label: "Guide's opening line", multiline: true },
    ],
  },
  {
    id: "catalogue",
    title: "“Everything we build” section",
    blurb: "The heading above the service tabs. Prices and offers are edited in Pricing & offers.",
    fields: [
      { key: "catalogue.title", label: "Section heading", multiline: true },
      { key: "catalogue.subtitle", label: "Section sub-heading", multiline: true },
      { key: "catalogue.anythingTitle", label: "“Not on this list?” heading" },
      { key: "catalogue.anythingBody", label: "“Not on this list?” text", multiline: true },
    ],
  },
  {
    id: "about",
    title: "About / founder",
    blurb: "The trust page. Wording here is personal — say it exactly how you want it said.",
    fields: [
      { key: "about.bioShort", label: "Homepage teaser", multiline: true },
      { key: "about.hero1", label: "About page headline (line 1)" },
      { key: "about.hero2", label: "About page headline (line 2, highlighted)" },
      { key: "about.heroSub", label: "About page sub-headline" },
      { key: "about.founder1", label: "Founder paragraph 1", multiline: true },
      { key: "about.founder2", label: "Founder paragraph 2", multiline: true },
      { key: "about.founder3", label: "Founder paragraph 3", multiline: true },
      { key: "about.founderPunch", label: "Founder pull-quote", multiline: true },
      { key: "about.diff1", label: "“Why we're different” headline" },
      { key: "about.diff2", label: "“Why we're different” text", multiline: true },
      { key: "about.closePunch", label: "Closing line", multiline: true },
    ],
  },
  {
    id: "build",
    title: "Custom builds page",
    blurb: "Headline and sub-headline of the /build page.",
    fields: [
      { key: "buildIn.hero.h1", label: "Headline", multiline: true },
      { key: "buildIn.hero.h1accent", label: "Headline (highlighted part)" },
      { key: "buildIn.hero.sub", label: "Sub-headline", multiline: true },
    ],
  },
];

export const EDITABLE_KEYS: string[] = EDITABLE_COPY.flatMap((g) => g.fields.map((f) => f.key));
