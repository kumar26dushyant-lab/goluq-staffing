import forPages from "../src/data/forPages.json";

/**
 * What a crawler that does not run JavaScript gets for each public route.
 *
 * The site is a single-page app: every URL used to answer with the same
 * shell, one title, no canonical, an empty #root. Google renders that;
 * the fetchers behind ChatGPT, Perplexity and Claude, and most link
 * previews, do not. So the server now writes the title, description,
 * canonical and Open Graph lines per route, and seeds the page's own
 * heading and first paragraph inside #root. React replaces that seed the
 * moment it mounts, so visitors never see two versions.
 *
 * English only, on purpose: Hindi is a client-side toggle. No prices here
 * (they are live), no claims that are not on the page itself.
 */
export type PageMeta = { title: string; description: string; h1: string; intro: string };

const SITE = "https://goluq.com";
const FIXED: Record<string, PageMeta> = {
  "/": {
    title: "GoLuQ.com · Software your business owns, built in weeks",
    description: "GoLuQ builds WhatsApp office and store systems, custom business software and owner dashboards for small and mid-sized businesses. Fixed price in writing, delivered in weeks, run for you. You own the code, the data and the number.",
    h1: "Own the software your business runs on",
    intro: "A small team in Indore, led by Dushyant Sharma, that builds WhatsApp systems, billing, reminders and the owner's screen for one business at a time. Fixed price in writing, weeks not months, and everything is yours.",
  },
  "/solutions": {
    title: "Solutions by role, business type, industry and city · GoLuQ.com",
    description: "What GoLuQ builds for owners, managers and staff: WhatsApp office and store, billing, reminders, dashboards and custom software, by industry and by city.",
    h1: "Solutions",
    intro: "Pick your role, your kind of business, your industry or your city, and see what is already built and what it costs today.",
  },
  "/whatsapp-office": {
    title: "The WhatsApp Office · every customer conversation on one number · GoLuQ.com",
    description: "Every customer conversation on one business WhatsApp number. Staff run it from their phones. Enquiries, documents, follow-ups and appointments handle themselves until a person is needed. Live in 21 days, and you own it.",
    h1: "Your whole office, running on WhatsApp",
    intro: "One business number, every chat on it, staff on their own phones, follow-ups and appointments that handle themselves. Live in 21 days.",
  },
  "/whatsapp-store": {
    title: "The WhatsApp Store · your catalogue inside WhatsApp · GoLuQ.com",
    description: "A catalogue inside WhatsApp and Telegram. One upload reaches every customer; orders arrive as data, not as screenshots. Built and run by GoLuQ, owned by you.",
    h1: "Your catalogue, inside WhatsApp",
    intro: "One upload reaches every customer, orders come back as data, and the number stays yours.",
  },
  "/services": {
    title: "Services · what GoLuQ builds and runs · GoLuQ.com",
    description: "Custom software, WhatsApp systems, voice and toll-free lines, dashboards and managed plans for growing businesses, at a fixed price agreed in writing.",
    h1: "Services",
    intro: "Software built for one business, at a fixed written price, then run for you month to month.",
  },
  "/build": {
    title: "Build with GoLuQ · rent less, own more · GoLuQ.com",
    description: "How GoLuQ builds: the written plan first, then a fixed price, then weeks of work, then handover. Three short films on renting software versus owning it.",
    h1: "Rent a flat, or build your house?",
    intro: "Rented software is a rented flat. GoLuQ builds your own copy, shaped to how you work, and you keep the code and the data.",
  },
  "/about": {
    title: "About GoLuQ and founder Dushyant Sharma · GoLuQ.com",
    description: "GoLuQ.com Digital Consultancy, Indore. Founder Dushyant Sharma: twenty-plus years in US healthcare operations, banking in Dubai, Genpact, DXC, Hexaware and EdCast, now building software small businesses own.",
    h1: "About GoLuQ",
    intro: "A small team led by Dushyant Sharma, whose career ran operations at Spryance India, RAKBANK Dubai, Genpact, DXC Technology, Hexaware and EdCast before GoLuQ.",
  },
  "/security": {
    title: "How GoLuQ keeps your data safe · GoLuQ.com",
    description: "Where your data lives, who can see it, how it is encrypted and backed up nightly, and how you take everything with you if you leave.",
    h1: "How we secure your data",
    intro: "Your data on servers in India, encrypted in transit and at rest, backed up every night, exportable on request, and only the people you name can see it.",
  },
  "/ceo": {
    title: "Become the CEO of your business · owner stories · GoLuQ.com",
    description: "Eight ninety-second stories: a coaching institute, an FMCG distributor, a CA firm, a pharmacy chain and partners, each with worked numbers on money, efficiency and cost before and after GoLuQ.",
    h1: "Become the CEO of your business",
    intro: "Owner stories in ninety seconds each: what the day looks like today, what changes with GoLuQ, and what it costs. The figures are worked examples.",
  },
  "/partner": {
    title: "Become a GoLuQ Partner · earn on every order · GoLuQ.com",
    description: "Free to join, no tech skills, no stock. Introduce business owners; GoLuQ builds, runs and pays a share of every order, plus a monthly share on managed customers. Exact terms on a 30-minute call.",
    h1: "Become your own boss",
    intro: "Open your GoLuQ partner office with zero investment. You introduce; we build, run and pay you a share of every order and a monthly share on managed customers.",
  },
  "/start": {
    title: "Tell us your need · a written plan and a fixed price · GoLuQ.com",
    description: "Describe your business and what slows it down, in your own words, in Hindi or English. GoLuQ replies with a written plan and a fixed price before any work starts.",
    h1: "Tell us your need",
    intro: "Write what your business does and what slows it down. You get a written plan and a fixed price; nothing starts until you say yes.",
  },
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function pageMeta(path: string): PageMeta | null {
  const clean = path.length > 1 ? path.replace(/\/+$/, "") : path;
  if (FIXED[clean]) return FIXED[clean];
  const m = clean.match(/^\/for\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/);
  if (!m) return null;
  const ind = forPages.industries.find((x) => x.slug === m[1]);
  if (!ind) return null;
  const city = m[2] ? forPages.cities.find((x) => x.slug === m[2]) : undefined;
  if (m[2] && !city) return null;
  const where = city ? ` in ${city.en}` : "";
  return {
    title: `${ind.en.title}${where} · GoLuQ.com`,
    description: `WhatsApp systems, billing, reminders and the owner's screen for ${ind.en.name}${where}. Fixed price in writing, weeks not months, you own the code. Written plan today.`,
    h1: `${ind.en.title}${where}`,
    intro: `Built for ${ind.en.name}${where}: replies, bookings and reminders on WhatsApp, billing, and one screen for the owner. What happens today: ${ind.en.pains.join("; ")}.`,
  };
}

/** The shell with this route's words written in. Unknown routes get the shell as is. */
export function renderShell(shell: string, path: string): string {
  const meta = pageMeta(path);
  if (!meta) return shell;
  const url = `${SITE}${path === "/" ? "/" : path.replace(/\/+$/, "")}`;
  const title = esc(meta.title);
  const desc = esc(meta.description);
  let html = shell
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${desc}$2`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${desc}$2`)
    .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${desc}$2`)
    .replace("</head>", `<link rel="canonical" href="${url}" /><meta property="og:url" content="${url}" /></head>`);
  html = html.replace('<div id="root"></div>', `<div id="root"><main><h1>${esc(meta.h1)}</h1><p>${esc(meta.intro)}</p><p><a href="/start">Tell us your need</a> · <a href="/ceo">Owner stories</a> · <a href="/partner">Become a partner</a></p></main></div>`);
  return html;
}
