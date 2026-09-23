// Renders every film thumbnail with its title in the film's language.
//   node posters.mjs [filter]      → out/posters/<name>-poster.jpg
// Titles come from the YouTube library (one title per file and language),
// with the site's own copy as fallback for the two cuts that library lacks.
import { readFileSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const SCRATCH = "C:/Users/imdus/AppData/Local/Temp/claude/c--Goluq-com/a53c5fda-db5e-4ee8-b738-77f85d5cb617/scratchpad";
const lib = JSON.parse(readFileSync(resolve(SCRATCH, "yt/yt-library.json"), "utf8"));
const hiSite = JSON.parse(readFileSync("C:/Goluq.com/src/i18n/hi.json", "utf8"));
const enSite = JSON.parse(readFileSync("C:/Goluq.com/src/i18n/en.json", "utf8"));
const filter = process.argv[2] || "";

const STEMS = ["house", "aioshort", "five", "pharm", "aiostory", "boss", "where", "signed", "roles", "ceo-coach", "ceo-dist", "ceo-ca", "ceo-adv", "ceo-cap", "security-in"];
const NO_PORTRAIT = new Set(["security-in"]);
const KICKER = {
  hi: { story: "मालिक की कहानी · उदाहरण", theme: "एक मिनट से कम", partner: "पार्टनर की कहानी", security: "आपका डेटा कैसे सुरक्षित है" },
  en: { story: "Owner story · worked example", theme: "Under a minute", partner: "Partner story", security: "How your data is kept safe" },
};
const kind = (s) => (s.startsWith("ceo-") || s === "pharm" || s === "aiostory" ? (s === "ceo-adv" || s === "ceo-cap" ? "partner" : "story") : s === "five" || s === "boss" ? "partner" : ["where", "signed", "roles", "security-in"].includes(s) ? "security" : "theme");

function title(stem, lang) {
  const L = lang === "enin" ? "en" : lang;
  const hit = lib.find((x) => x.file === `${stem}-${L}.mp4`);
  if (hit) return hit.title.replace(/\s*#Shorts\s*$/i, "");
  const site = L === "hi" ? hiSite : enSite;
  if (site.story?.spot?.[stem]) return site.story.spot[stem];
  throw new Error(`no title for ${stem}-${lang}`);
}

mkdirSync("out/posters", { recursive: true });
mkdirSync("out/props", { recursive: true });
let n = 0;
for (const stem of STEMS) {
  for (const lang of ["hi", "en", "enin"]) {
    for (const portrait of [false, true]) {
      if (portrait && NO_PORTRAIT.has(stem)) continue;
      const name = `${stem}-${lang}${portrait ? "-916" : ""}-poster`;
      if (filter && !name.includes(filter)) continue;
      const out = resolve("out/posters", `${name}.jpg`);
      if (existsSync(out)) continue;
      const L = lang === "enin" ? "en" : lang;
      const props = { image: `https://goluq.com/media/${name}.jpg`, title: title(stem, lang), lang, kicker: KICKER[L][kind(stem)] };
      const pf = resolve("out/props", `${name}.json`);
      writeFileSync(pf, JSON.stringify(props));
      // A pre-built bundle (npx remotion bundle src/index.ts --out-dir out/bundle) makes each still a few seconds instead of twenty.
      const entry = existsSync("out/bundle/index.html") ? "out/bundle" : "src/index.ts";
      execFileSync("npx", ["remotion", "still", entry, portrait ? "Poster916" : "Poster169", out, `--props=${pf}`, "--image-format=jpeg", "--jpeg-quality=88", "--log=error"], { stdio: "inherit", shell: true });
      n++;
      console.log("poster", name);
    }
  }
}
console.log("rendered", n);
