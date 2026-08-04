/**
 * Generates the mock-call audio clips.
 *
 *   GOOGLE_TTS_KEY=xxxxx node scripts/generate-call-audio.mjs
 *   GOOGLE_TTS_KEY=xxxxx node scripts/generate-call-audio.mjs voice        # one role
 *   GOOGLE_TTS_KEY=xxxxx node scripts/generate-call-audio.mjs voice clinic # one combo
 *
 * The key is a Google Cloud API key with the **Cloud Text-to-Speech API**
 * enabled. That is NOT the same thing as the Gemini key already in .env —
 * enable the API at console.cloud.google.com and create a separate key.
 *
 * Output: public/audio/<lang>/<role>-<industry>/<n>.mp3 — one clip per turn, so
 * captions stay in sync with no timing metadata and a missing clip degrades to
 * the device voice instead of breaking the call (see src/lib/callAudio.ts).
 *
 * Cost: the whole set is roughly 30k characters. Well inside Google's free
 * monthly tier for WaveNet at the time of writing — but check current pricing.
 *
 * Re-run any time the scripts in src/content/dialogues.ts change. Existing files
 * are skipped unless FORCE=1.
 */
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "audio");
const KEY = process.env.GOOGLE_TTS_KEY;
const FORCE = process.env.FORCE === "1";

if (!KEY) {
  console.error(
    "GOOGLE_TTS_KEY is not set.\n" +
      "Create a Google Cloud API key with the Cloud Text-to-Speech API enabled, then:\n" +
      "  GOOGLE_TTS_KEY=xxxxx node scripts/generate-call-audio.mjs"
  );
  process.exit(1);
}

/**
 * Two clearly different Indian voices so a listener can tell who is speaking
 * without looking at the screen. The digital worker is the warmer, steadier one.
 */
const VOICES = {
  en: {
    agent: { languageCode: "en-IN", name: "en-IN-Wavenet-A" }, // female, calm
    caller: { languageCode: "en-IN", name: "en-IN-Wavenet-C" }, // male
  },
  hi: {
    agent: { languageCode: "hi-IN", name: "hi-IN-Wavenet-A" },
    caller: { languageCode: "hi-IN", name: "hi-IN-Wavenet-B" },
  },
};

const ROLES = ["voice", "support", "sales", "reception", "workforce"];
const INDUSTRIES = ["clinic", "diagnostic", "coaching", "ca", "travel"];

// dialogues.ts is TypeScript — bundle it to plain ESM first. Uses esbuild's JS
// API rather than its CLI, because spawning npx is unreliable on Windows.
const TMP = join(ROOT, "node_modules", ".cache", "goluq-dialogues.mjs");
mkdirSync(dirname(TMP), { recursive: true });
const esbuild = await import("esbuild");
await esbuild.build({
  entryPoints: [join(ROOT, "src", "content", "dialogues.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: TMP,
  logLevel: "error",
});
const { getDialogue } = await import(pathToFileURL(TMP).href);

async function synth(text, voice) {
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice,
        // Slightly slower than default: this is a phone call, not an ad read.
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: 0.96,
          pitch: 0,
          // Telephony profile makes it sound like it came down a phone line.
          effectsProfileId: ["telephony-class-application"],
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`TTS ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const { audioContent } = await res.json();
  return Buffer.from(audioContent, "base64");
}

const [onlyRole, onlyIndustry] = process.argv.slice(2);
let made = 0;
let skipped = 0;

for (const role of ROLES) {
  if (onlyRole && role !== onlyRole) continue;
  for (const industry of INDUSTRIES) {
    if (onlyIndustry && industry !== onlyIndustry) continue;
    const dialogue = getDialogue(role, industry);

    for (const lang of ["en", "hi"]) {
      const dir = join(OUT, lang, `${role}-${industry}`);
      mkdirSync(dir, { recursive: true });

      for (let i = 0; i < dialogue.turns.length; i++) {
        const file = join(dir, `${i}.mp3`);
        if (existsSync(file) && !FORCE) {
          skipped++;
          continue;
        }
        const turn = dialogue.turns[i];
        const voice = VOICES[lang][turn.who];
        let mp3;
        try {
          mp3 = await synth(turn[lang], voice);
        } catch (err) {
          console.error(`\nFailed on ${lang}/${role}-${industry}/${i}.mp3`);
          console.error(String(err.message || err));
          console.error(
            "\nCommon causes: the key is not a Cloud Text-to-Speech key, the API is not\n" +
              "enabled on the project, or billing is not set up. Nothing was lost — re-run\n" +
              "and it resumes from where it stopped."
          );
          esbuild.stop?.();
          process.exit(1);
        }
        writeFileSync(file, mp3);
        made++;
        process.stdout.write(`  ${lang}/${role}-${industry}/${i}.mp3\n`);
        await new Promise((r) => setTimeout(r, 120)); // stay under the rate limit
      }
    }
  }
}

console.log(`\nDone. ${made} clip(s) written, ${skipped} already present.`);
console.log("Commit public/audio/ and deploy — the call upgrades automatically.");
esbuild.stop?.();
