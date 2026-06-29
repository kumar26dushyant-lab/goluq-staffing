import type { RoleId, IndustryId } from "../state/useAppState";

export type LogTag =
  | "BOOT"
  | "SCAN"
  | "OUTREACH"
  | "INBOUND"
  | "MATCH"
  | "RECONCILE"
  | "CHECK"
  | "DRAFT"
  | "NOTIFY"
  | "SUCCESS";

export interface ScenarioStep {
  tag: LogTag;
  en: string;
  hi: string;
}

export interface Scenario {
  bottleneck: { en: string; hi: string };
  steps: ScenarioStep[];
  outcome: { en: string; hi: string };
  roi: {
    humanOutput: { en: string; hi: string };
    digitalOutput: { en: string; hi: string };
    costSaved: string;
  };
}

/** Tag → chip color token (used by the simulation log). */
export const TAG_COLOR: Record<LogTag, string> = {
  BOOT: "text-faint",
  SCAN: "text-brand-luq",
  OUTREACH: "text-brand-luq",
  INBOUND: "text-indigo-glow",
  MATCH: "text-brand-luq",
  RECONCILE: "text-indigo-glow",
  CHECK: "text-warn",
  DRAFT: "text-brand-luq",
  NOTIFY: "text-teal-neon",
  SUCCESS: "text-success",
};

// ─────────────────────────────────────────────────────────────────────────────
// QUALITY-BAR SCENARIOS (verbatim from BUILD_SPEC §6, expanded to 24–28 steps).
// The remaining combinations fall back to a role/industry-aware generator below
// until each is hand-authored to this same bar.
// ─────────────────────────────────────────────────────────────────────────────

const support_ca: Scenario = {
  bottleneck: {
    en: "🔴 GST deadline night. 45 clients haven't sent bank statements. Staff is drowning, phones won't stop, typos creeping in.",
    hi: "🔴 GST डेडलाइन की रात। 45 क्लाइंट्स ने बैंक स्टेटमेंट नहीं भेजे। स्टाफ थक चुका है, फ़ोन रुक नहीं रहे, गलतियाँ बढ़ रही हैं।",
  },
  steps: [
    { tag: "BOOT", en: "Digital Tax Associate signing in securely…", hi: "डिजिटल टैक्स असोसिएट सुरक्षित रूप से लॉगिन हो रहा है…" },
    { tag: "SCAN", en: "Reviewing 120 client files for gaps…", hi: "120 क्लाइंट फ़ाइलों में कमियाँ जाँच रहा है…" },
    { tag: "CHECK", en: "Flagging 45 missing bank statements…", hi: "45 गुम बैंक स्टेटमेंट चिह्नित किए…" },
    { tag: "OUTREACH", en: "Sending personalised WhatsApp reminders…", hi: "पर्सनलाइज़्ड WhatsApp रिमाइंडर भेज रहा है…" },
    { tag: "OUTREACH", en: "Nudging 20 non-responders politely…", hi: "20 जवाब न देने वालों को विनम्रता से याद दिला रहा है…" },
    { tag: "INBOUND", en: "Receiving 18 bill photos over chat…", hi: "चैट पर 18 बिल फ़ोटो प्राप्त हुईं…" },
    { tag: "INBOUND", en: "Collecting 12 statements by email…", hi: "ईमेल से 12 स्टेटमेंट इकट्ठे किए…" },
    { tag: "MATCH", en: "Reading line-items, computing CGST/IGST…", hi: "लाइन-आइटम पढ़कर CGST/IGST निकाला…" },
    { tag: "RECONCILE", en: "Matching ledger against bank feed…", hi: "लेजर को बैंक फ़ीड से मिला रहा है…" },
    { tag: "CHECK", en: "Caught 3 duplicate invoices, fixed…", hi: "3 डुप्लिकेट इनवॉइस पकड़े और ठीक किए…" },
    { tag: "CHECK", en: "Spotted 2 wrong GSTINs, corrected…", hi: "2 गलत GSTIN पकड़े और सही किए…" },
    { tag: "RECONCILE", en: "Tallying input credit, client by client…", hi: "क्लाइंट-दर-क्लाइंट इनपुट क्रेडिट मिला रहा है…" },
    { tag: "DRAFT", en: "Populating clean GSTR-1 drafts…", hi: "साफ़-सुथरे GSTR-1 ड्राफ़्ट तैयार किए…" },
    { tag: "DRAFT", en: "Preparing GSTR-3B summaries…", hi: "GSTR-3B सारांश तैयार किए…" },
    { tag: "OUTREACH", en: "Chasing 8 final pending replies…", hi: "8 बचे हुए जवाबों का फ़ॉलो-अप कर रहा है…" },
    { tag: "INBOUND", en: "8 statements arrive overnight…", hi: "रातभर में 8 और स्टेटमेंट आ गए…" },
    { tag: "MATCH", en: "Categorising 600 transactions…", hi: "600 ट्रांज़ैक्शन वर्गीकृत किए…" },
    { tag: "CHECK", en: "Zero mismatches after recheck…", hi: "दोबारा जाँच में शून्य मिसमैच…" },
    { tag: "NOTIFY", en: "Pinging owner: 30 returns ready to review…", hi: "ओनर को सूचना: 30 रिटर्न रिव्यू के लिए तैयार…" },
    { tag: "DRAFT", en: "Queuing challans for approval…", hi: "चालान अप्रूवल के लिए कतार में लगाए…" },
    { tag: "CHECK", en: "Late-fee exposure verified: ₹0…", hi: "लेट-फ़ीस जोखिम जाँचा: ₹0…" },
    { tag: "NOTIFY", en: "Sending clients their filing summary…", hi: "क्लाइंट्स को उनका फाइलिंग सारांश भेजा…" },
    { tag: "RECONCILE", en: "Closing remaining 15 compliance loops…", hi: "बचे हुए 15 कम्प्लायंस लूप पूरे कर रहा है…" },
    { tag: "SUCCESS", en: "45 compliance loops closed · 0 errors · ₹0 penalty.", hi: "45 कम्प्लायंस लूप पूरे · 0 गलती · ₹0 पेनल्टी।" },
  ],
  outcome: { en: "Filed on time. Zero penalties. Staff went home.", hi: "समय पर फ़ाइल। शून्य पेनल्टी। स्टाफ घर चला गया।" },
  roi: {
    humanOutput: { en: "~40 returns/day, errors creep in", hi: "~40 रिटर्न/दिन, गलतियाँ संभव" },
    digitalOutput: { en: "Unlimited, 24×7, zero errors", hi: "असीमित, 24×7, शून्य गलती" },
    costSaved: "70–80%",
  },
};

const voice_clinic: Scenario = {
  bottleneck: {
    en: "🔴 Monday OPD rush. 60 missed calls, no-shows pile up, reception can't dial back fast enough.",
    hi: "🔴 सोमवार OPD की भीड़। 60 मिस्ड कॉल, मरीज़ नहीं आ रहे, रिसेप्शन वापस कॉल ही नहीं कर पा रहा।",
  },
  steps: [
    { tag: "BOOT", en: "Digital Voice Caller coming online…", hi: "डिजिटल वॉइस कॉलर ऑनलाइन हो रहा है…" },
    { tag: "SCAN", en: "Pulling 60 missed-call numbers…", hi: "60 मिस्ड-कॉल नंबर निकाल रहा है…" },
    { tag: "OUTREACH", en: "Calling back in patient's language…", hi: "मरीज़ की भाषा में वापस कॉल कर रहा है…" },
    { tag: "MATCH", en: "Offering next open OPD slots…", hi: "अगले खाली OPD स्लॉट बता रहा है…" },
    { tag: "NOTIFY", en: "Sending WhatsApp slot confirmations…", hi: "WhatsApp पर स्लॉट कन्फ़र्मेशन भेज रहा है…" },
    { tag: "OUTREACH", en: "Calling 15 more in the queue…", hi: "कतार में 15 और को कॉल कर रहा है…" },
    { tag: "INBOUND", en: "Patient asks to reschedule Friday…", hi: "मरीज़ शुक्रवार को रीशेड्यूल माँग रहा है…" },
    { tag: "MATCH", en: "Moving them to Dr. Sharma, 5 PM…", hi: "उन्हें डॉ. शर्मा, शाम 5 बजे शिफ़्ट किया…" },
    { tag: "CHECK", en: "Re-trying 9 unanswered numbers later…", hi: "9 अनुत्तरित नंबरों को बाद में फिर ट्राई कर रहा है…" },
    { tag: "OUTREACH", en: "Reminding tomorrow's 22 appointments…", hi: "कल के 22 अपॉइंटमेंट याद दिला रहा है…" },
    { tag: "INBOUND", en: "3 patients confirm, 1 cancels…", hi: "3 ने पुष्टि की, 1 ने रद्द किया…" },
    { tag: "MATCH", en: "Filling the cancelled slot instantly…", hi: "रद्द हुए स्लॉट को तुरंत भर रहा है…" },
    { tag: "NOTIFY", en: "Routing 6 calls doctor-wise…", hi: "6 कॉल डॉक्टर-वाइज़ रूट कीं…" },
    { tag: "OUTREACH", en: "Following up 8 lab-report patients…", hi: "8 लैब-रिपोर्ट मरीज़ों का फ़ॉलो-अप…" },
    { tag: "CHECK", en: "Flagging 2 urgent cases for staff…", hi: "2 अर्जेंट केस स्टाफ़ के लिए चिह्नित किए…" },
    { tag: "NOTIFY", en: "Texting prep instructions to 5…", hi: "5 को तैयारी के निर्देश भेजे…" },
    { tag: "OUTREACH", en: "Reaching the last 9 missed calls…", hi: "आख़िरी 9 मिस्ड कॉल तक पहुँच रहा है…" },
    { tag: "MATCH", en: "Balancing load across 3 doctors…", hi: "3 डॉक्टरों में लोड संतुलित किया…" },
    { tag: "CHECK", en: "No double-booking, schedule clean…", hi: "कोई डबल-बुकिंग नहीं, शेड्यूल साफ़…" },
    { tag: "NOTIFY", en: "Daily call summary sent to owner…", hi: "ओनर को दैनिक कॉल सारांश भेजा…" },
    { tag: "SUCCESS", en: "38 appointments rebooked · 0 calls dropped.", hi: "38 अपॉइंटमेंट दोबारा बुक · 0 कॉल छूटी।" },
  ],
  outcome: { en: "Empty slots filled. Footfall recovered.", hi: "खाली स्लॉट भरे। मरीज़ों की संख्या वापस आई।" },
  roi: {
    humanOutput: { en: "~30 callbacks/day", hi: "~30 कॉलबैक/दिन" },
    digitalOutput: { en: "Every call returned, 24×7", hi: "हर कॉल का जवाब, 24×7" },
    costSaved: "60–75%",
  },
};

const reception_travel: Scenario = {
  bottleneck: {
    en: "🔴 2:14 AM. A customer messages on WhatsApp for an airport cab at 6 AM. The owner is asleep. Normally — booking lost by morning.",
    hi: "🔴 रात 2:14 बजे। एक ग्राहक WhatsApp पर सुबह 6 बजे एयरपोर्ट कैब के लिए मैसेज करता है। मालिक सो रहा है। आम तौर पर — सुबह तक बुकिंग हाथ से निकल जाती।",
  },
  steps: [
    { tag: "BOOT", en: "Digital Booking Agent awake at 2 AM…", hi: "डिजिटल बुकिंग एजेंट रात 2 बजे भी जाग रहा है…" },
    { tag: "INBOUND", en: "Reading the customer's WhatsApp message…", hi: "ग्राहक का WhatsApp मैसेज पढ़ रहा है…" },
    { tag: "OUTREACH", en: "Replying instantly, politely, in Hindi…", hi: "तुरंत, विनम्रता से, हिंदी में जवाब दे रहा है…" },
    { tag: "MATCH", en: "Asking pickup, drop, time, passengers…", hi: "पिकअप, ड्रॉप, समय, यात्री पूछ रहा है…" },
    { tag: "INBOUND", en: "Customer: Vijay Nagar → Airport, 6 AM…", hi: "ग्राहक: विजय नगर → एयरपोर्ट, सुबह 6 बजे…" },
    { tag: "CHECK", en: "Checking the 6 AM slot is free…", hi: "सुबह 6 बजे का स्लॉट खाली है, जाँच रहा है…" },
    { tag: "MATCH", en: "Picking the nearest available driver…", hi: "सबसे पास के खाली ड्राइवर को चुना…" },
    { tag: "DRAFT", en: "Holding a tentative booking, sharing fare…", hi: "अस्थायी बुकिंग रोककर किराया बता रहा है…" },
    { tag: "INBOUND", en: "Customer asks for a Sedan…", hi: "ग्राहक सेडान माँग रहा है…" },
    { tag: "MATCH", en: "Quoting Sedan fare, confirming route…", hi: "सेडान किराया बताकर रूट पक्का किया…" },
    { tag: "CHECK", en: "Noting flight time, adding buffer…", hi: "फ़्लाइट समय नोट कर बफ़र जोड़ा…" },
    { tag: "NOTIFY", en: "Telling customer: our team will confirm soon…", hi: "ग्राहक को बता रहा है: हमारी टीम जल्द पुष्टि करेगी…" },
    { tag: "DRAFT", en: "Logging the lead with full details…", hi: "पूरी जानकारी के साथ लीड दर्ज की…" },
    { tag: "DRAFT", en: "Saving pickup pin and contact…", hi: "पिकअप पिन और संपर्क सेव किया…" },
    { tag: "OUTREACH", en: "Sharing a 'driver will call' note…", hi: "'ड्राइवर कॉल करेगा' नोट भेजा…" },
    { tag: "CHECK", en: "Double-checking address spelling…", hi: "पता दोबारा जाँचा…" },
    { tag: "NOTIFY", en: "Queuing morning brief for owner at 7 AM…", hi: "मालिक के लिए सुबह 7 बजे का ब्रीफ तैयार…" },
    { tag: "NOTIFY", en: "Setting a reminder to call & confirm…", hi: "कॉल कर पुष्टि करने का रिमाइंडर लगाया…" },
    { tag: "INBOUND", en: "Another 3 AM enquiry handled the same way…", hi: "रात 3 बजे की एक और पूछताछ ऐसे ही निपटाई…" },
    { tag: "CHECK", en: "Both leads safe, nothing slipped…", hi: "दोनों लीड सुरक्षित, कुछ नहीं छूटा…" },
    { tag: "SUCCESS", en: "Booking saved overnight · owner reminded to call · 0 leads lost.", hi: "रातभर में बुकिंग सेव · मालिक को कॉल का रिमाइंडर · 0 लीड खोई।" },
  ],
  outcome: {
    en: "The 2 AM customer is booked. Owner just calls to confirm. Zero missed bookings.",
    hi: "रात 2 बजे वाला ग्राहक बुक हो गया। मालिक सिर्फ पुष्टि के लिए कॉल करता है। एक भी बुकिंग नहीं छूटी।",
  },
  roi: {
    humanOutput: { en: "Sleeps at night → misses after-hours bookings", hi: "रात को सोता है → देर रात की बुकिंग छूट जाती है" },
    digitalOutput: { en: "Answers every message, any hour, 24×7", hi: "हर मैसेज का जवाब, किसी भी समय, 24×7" },
    costSaved: "One saved booking/week pays for itself",
  },
};

export const scenarios: Partial<Record<RoleId, Partial<Record<IndustryId, Scenario>>>> = {
  support: { ca: support_ca },
  voice: { clinic: voice_clinic },
  reception: { travel: reception_travel },
};

// ─────────────────────────────────────────────────────────────────────────────
// Fallback generator — role/industry-aware, jargon-free. Keeps every combination
// functional and specific until each is hand-authored to the quality bar above.
// TODO(content): replace these with 22 bespoke scenarios (5×5 incl. travel set).
// ─────────────────────────────────────────────────────────────────────────────

const INDUSTRY_CTX: Record<IndustryId, { en: string; hi: string; unit: { en: string; hi: string } }> = {
  clinic: { en: "clinic", hi: "क्लिनिक", unit: { en: "patients", hi: "मरीज़" } },
  diagnostic: { en: "lab", hi: "लैब", unit: { en: "reports", hi: "रिपोर्ट" } },
  coaching: { en: "institute", hi: "संस्थान", unit: { en: "students", hi: "छात्र" } },
  ca: { en: "firm", hi: "फर्म", unit: { en: "clients", hi: "क्लाइंट" } },
  travel: { en: "travel desk", hi: "ट्रैवल डेस्क", unit: { en: "bookings", hi: "बुकिंग" } },
};

const ROLE_VERB: Record<RoleId, { en: string; hi: string }> = {
  voice: { en: "Digital Voice Employee", hi: "डिजिटल वॉइस कर्मचारी" },
  support: { en: "Digital Support Employee", hi: "डिजिटल सपोर्ट कर्मचारी" },
  sales: { en: "Digital Sales Employee", hi: "डिजिटल सेल्स कर्मचारी" },
  reception: { en: "Digital Receptionist", hi: "डिजिटल रिसेप्शनिस्ट" },
  workforce: { en: "Digital Workforce team", hi: "डिजिटल वर्कफोर्स टीम" },
};

function generateScenario(role: RoleId, industry: IndustryId): Scenario {
  const ctx = INDUSTRY_CTX[industry];
  const who = ROLE_VERB[role];
  const u = ctx.unit;
  const seq: ScenarioStep[] = [
    { tag: "BOOT", en: `${who.en} coming online for your ${ctx.en}…`, hi: `${who.hi} आपके ${ctx.hi} के लिए ऑनलाइन हो रहा है…` },
    { tag: "SCAN", en: `Scanning today's pending ${u.en}…`, hi: `आज के बचे हुए ${u.hi} स्कैन कर रहा है…` },
    { tag: "CHECK", en: `Flagging 38 ${u.en} that need action…`, hi: `38 ${u.hi} चिह्नित किए जिन पर काम बाकी है…` },
    { tag: "OUTREACH", en: `Reaching out on WhatsApp, one by one…`, hi: `WhatsApp पर एक-एक करके संपर्क कर रहा है…` },
    { tag: "INBOUND", en: `Receiving replies and details…`, hi: `जवाब और जानकारी प्राप्त हो रही है…` },
    { tag: "MATCH", en: `Matching each request to the right slot…`, hi: `हर अनुरोध को सही स्लॉट से मिला रहा है…` },
    { tag: "OUTREACH", en: `Nudging 15 non-responders politely…`, hi: `15 जवाब न देने वालों को विनम्रता से याद दिला रहा है…` },
    { tag: "INBOUND", en: `12 more respond within minutes…`, hi: `मिनटों में 12 और ने जवाब दिया…` },
    { tag: "RECONCILE", en: `Cross-checking records for mistakes…`, hi: `गलतियों के लिए रिकॉर्ड मिला रहा है…` },
    { tag: "CHECK", en: `Caught 3 errors, fixed silently…`, hi: `3 गलतियाँ पकड़ीं, चुपचाप ठीक कीं…` },
    { tag: "DRAFT", en: `Preparing clean summaries to review…`, hi: `रिव्यू के लिए साफ़ सारांश तैयार किए…` },
    { tag: "NOTIFY", en: `Sending confirmations via WhatsApp…`, hi: `WhatsApp पर पुष्टि भेज रहा है…` },
    { tag: "OUTREACH", en: `Following up the last 9 pending…`, hi: `आख़िरी 9 बचे हुओं का फ़ॉलो-अप…` },
    { tag: "MATCH", en: `Re-routing 4 to the right person…`, hi: `4 को सही व्यक्ति के पास भेजा…` },
    { tag: "CHECK", en: `Re-checking — zero mismatches…`, hi: `दोबारा जाँच — शून्य मिसमैच…` },
    { tag: "NOTIFY", en: `Flagging 2 urgent cases for you…`, hi: `2 अर्जेंट केस आपके लिए चिह्नित किए…` },
    { tag: "DRAFT", en: `Logging every interaction neatly…`, hi: `हर बातचीत साफ़-सुथरे दर्ज की…` },
    { tag: "RECONCILE", en: `Closing the day's open loops…`, hi: `दिन के खुले लूप बंद कर रहा है…` },
    { tag: "NOTIFY", en: `Owner brief queued with the numbers…`, hi: `नंबरों के साथ ओनर ब्रीफ तैयार…` },
    { tag: "SUCCESS", en: `All ${u.en} handled · 0 errors · nothing missed.`, hi: `सभी ${u.hi} संभाले · 0 गलती · कुछ नहीं छूटा।` },
  ];
  return {
    bottleneck: {
      en: `🔴 A full day's ${ctx.en} chaos — too many ${u.en}, too few hands, things slipping through.`,
      hi: `🔴 पूरे दिन की ${ctx.hi} की अफरा-तफरी — बहुत सारे ${u.hi}, कम हाथ, चीज़ें छूट रही हैं।`,
    },
    steps: seq,
    outcome: {
      en: `Every ${u.en.replace(/s$/, "")} handled. Nothing slipped. You stayed in control.`,
      hi: `हर ${u.hi} संभला। कुछ नहीं छूटा। नियंत्रण आपके पास रहा।`,
    },
    roi: {
      humanOutput: { en: "Limited hours, mistakes creep in", hi: "सीमित घंटे, गलतियाँ संभव" },
      digitalOutput: { en: "Unlimited, 24×7, zero errors", hi: "असीमित, 24×7, शून्य गलती" },
      costSaved: "60–80%",
    },
  };
}

/** Returns the hand-authored scenario for a combo, or a generated fallback. */
export function getScenario(role: RoleId, industry: IndustryId): Scenario {
  return scenarios[role]?.[industry] ?? generateScenario(role, industry);
}
