// Creates the GoLuQ product catalog in Meta Commerce Manager, fills it from the
// live pricing table, attaches it to the WhatsApp Business Account and makes
// it visible on the business profile. Runs ON THE VM (token in the DB):
//   node commerce.mjs            → create/fill/attach
//   node commerce.mjs --refresh  → re-sync prices and copy into the existing catalog
import Database from "/opt/goluq/node_modules/better-sqlite3/lib/index.js";

const db = new Database("/opt/goluq/data/goluq.db");
const get = (k) => db.prepare("select value from settings where key=?").pluck().get(k);
const set = (k, v) => db.prepare("insert into settings (key,value) values (?,?) on conflict(key) do update set value=excluded.value").run(k, v);
const TOKEN = get("wa_access_token"), WABA = get("wa_waba_id"), PN = get("wa_phone_number_id");
const BUSINESS = "970474245742283";
const G = "https://graph.facebook.com/v21.0";

async function graph(path, method = "GET", body) {
  const r = await fetch(`${G}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(`${method} ${path}: ${JSON.stringify(j.error || j).slice(0, 300)}`);
  return j;
}

// Live prices — the same endpoint the site and the guide use.
const cfg = await (await fetch("http://127.0.0.1:8090/api/config", { headers: { "x-country": "IN" } })).json();
const price = (id) => {
  const row = cfg.pricing.find((p) => p.id === id);
  return row ? Math.round(row.offer ?? row.from) : null;
};

// Copy kept to what the site already says. Prices come from the table above.
const ITEMS = [
  ["whatsappOffice", "The WhatsApp Office", "Your whole customer communication on WhatsApp, run by your staff from Telegram. Answers customers 24×7 in their language, one inbox per client, reminders and status updates on time. Live in 21 days. You own it at handover.", "/whatsapp-office"],
  ["officeManaged", "WhatsApp Office — managed (per month)", "Monthly running of your WhatsApp Office after handover: templates, follow-ups, a monthly report of what it handled, and a person to call. Priced per month.", "/whatsapp-office"],
  ["whatsappStore", "The WhatsApp Store", "Your catalogue broadcast to every buyer group, orders taken inside WhatsApp, a Telegram channel alongside. Opt-outs and sending limits handled. Live in 21 days. You own it at handover.", "/whatsapp-store"],
  ["storeManaged", "WhatsApp Store — managed (per month)", "Monthly running of your WhatsApp Store after handover: catalogue updates, broadcasts, order flow and a monthly report. Priced per month.", "/whatsapp-store"],
  ["tollfree", "Toll-Free Number (1800)", "A 1800 number your customers call free, wired into your business: routing to the right person, IVR menus, a call back when nobody picks up, every call logged. Live in 3–7 working days. Setup price; usage billed by the operator.", "/services"],
  ["virtualNumber", "Virtual Business Number", "A business number that is not your personal phone. Rings whichever staff phone is on duty; change who answers without changing the number customers know. Setup price.", "/services"],
  ["waApi", "WhatsApp Business API setup", "Official WhatsApp Business Platform on your own number: verification, approved message templates, and the logic that decides what to send and when. Answers customers 24×7 and hands over to you. Setup price; Meta conversation charges apply.", "/services"],
  ["voiceCampaign", "Voice Campaigns (Press-1)", "A recorded call in your voice, in your customers' language. They press 1, your team gets a lead. Every response counted. DND rules respected. Setup price; per-call charges apply.", "/services"],
  ["txnSms", "Transactional SMS", "OTPs, receipts and confirmations from your own software on an approved sender ID, with delivery reports. Registration handled for you. Setup price; per-SMS charges apply.", "/services"],
  ["promoSms", "Promotional SMS", "Offers and reminders to your own opted-in list on a registered sender ID, scheduled, with STOP honoured. Setup price; per-SMS charges apply.", "/services"],
  ["missedCall", "Missed-Call Leads", "One number for posters and hoardings. A missed call becomes a lead with an automatic call back or WhatsApp reply, in the same inbox as everything else. Setup price.", "/services"],
  ["automation", "Workflow Automation", "The work your team does by hand every week — data entry, reports, reconciliation, moving files — done automatically with the tools you already use. Typically 4–8 days. Starting price for a standard build.", "/build"],
  ["whatsapp", "WhatsApp Automations", "Order confirmations that raise the invoice, bookings that block the calendar, reminders that go out on their own — on your verified number. Starting price for a standard build.", "/build"],
  ["digitalEmployee", "Digital Employee", "A receptionist, sales or support employee trained on your business: answers instantly, books, reminds, and hands to a person when it should. Demo before you decide. Starting price.", "/build"],
  ["website", "Custom Website", "Phone-first, English and Hindi, with a guide that answers visitors and enquiries that land on your WhatsApp. You own the code and the domain. Starting price for a standard build.", "/build"],
  ["app", "Mobile & Desktop Apps", "An app for your team or your customers — Android, iPhone and desktop from one build, working offline in the field and syncing to your office. Scoped and quoted before we start. Starting price.", "/build"],
  ["offline", "Zero-Internet Local Software", "Billing, stock and accounts that run on your own machines with the internet off. Your data stays in the shop; backups you control. Installed on site. Starting price.", "/build"],
  ["platform", "Multi-Branch Platform", "Every office on one system: leads, sales, operations, finance and HR connected, one login per role, the owner sees everything. Built in stages, yours with the source code. Starting price.", "/build"],
];

let catalog = get("wa_catalog_id") || "";
if (!catalog) {
  const existing = await graph(`${BUSINESS}/owned_product_catalogs?fields=id,name`);
  const found = (existing.data || []).find((c) => c.name === "GoLuQ");
  if (found) catalog = found.id;
}
if (!catalog) {
  const made = await graph(`${BUSINESS}/owned_product_catalogs`, "POST", { name: "GoLuQ", vertical: "commerce" });
  catalog = made.id;
  console.log("created catalog", catalog);
}
set("wa_catalog_id", catalog);
console.log("catalog", catalog);

// Items: retailer_id is our pricing id, so re-runs update rather than duplicate.
const current = await graph(`${catalog}/products?fields=id,retailer_id&limit=200`);
const byRetailer = new Map((current.data || []).map((p) => [p.retailer_id, p.id]));
let ok = 0;
for (const [id, name, description, path] of ITEMS) {
  const inr = price(id);
  if (!inr) { console.log("skip (no price)", id); continue; }
  const data = {
    name, description,
    price: inr * 100, currency: "INR",
    availability: "in stock", condition: "new", brand: "GoLuQ",
    image_url: `https://goluq.com/catalog/${id === "officeManaged" ? "whatsappOffice" : id === "storeManaged" ? "whatsappStore" : id}.jpg`,
    url: `https://goluq.com${path}`,
  };
  try {
    if (byRetailer.has(id)) await graph(`${byRetailer.get(id)}`, "POST", data);
    else await graph(`${catalog}/products`, "POST", { retailer_id: id, ...data });
    ok++;
  } catch (e) {
    console.log("item failed", id, String(e).slice(0, 200));
  }
}
console.log("items synced", ok, "of", ITEMS.length);

// Attach to the WhatsApp Business Account and switch the catalog on.
const attached = await graph(`${WABA}/product_catalogs?fields=id,name`);
if (!(attached.data || []).some((c) => c.id === catalog)) {
  await graph(`${WABA}/product_catalogs`, "POST", { catalog_id: catalog });
  console.log("attached to WABA");
} else console.log("already attached");
try {
  await graph(`${PN}/whatsapp_commerce_settings?is_catalog_visible=true&is_cart_enabled=true`, "POST");
  console.log("catalog visible on profile, cart enabled");
} catch (e) {
  console.log("commerce settings:", String(e).slice(0, 200));
}
const verify = await graph(`${catalog}/products?fields=retailer_id,name,price,review_status&limit=200`);
for (const p of verify.data || []) console.log(" ", p.retailer_id, "|", p.price, "|", p.review_status || "");
