import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { captureRefFromUrl } from "./lib/refAttribution";
import { trackPageview } from "./lib/track";
import { fetchSiteConfig } from "./lib/siteConfig";
// Every page other than the story is its own chunk: the cockpit alone was
// half of a 1 MB bundle that every visitor to the homepage downloaded.
const StaffingApp = lazy(() => import("./pages/StaffingApp").then((m) => ({ default: m.StaffingApp })));
const PartnerLanding = lazy(() => import("./pages/PartnerLanding").then((m) => ({ default: m.PartnerLanding })));
const PartnerDashboard = lazy(() => import("./pages/PartnerDashboard").then((m) => ({ default: m.PartnerDashboard })));
const PartnerReset = lazy(() => import("./pages/PartnerReset").then((m) => ({ default: m.PartnerReset })));
const About = lazy(() => import("./pages/About").then((m) => ({ default: m.About })));
const Admin = lazy(() => import("./pages/Admin").then((m) => ({ default: m.Admin })));
const AdminSetup = lazy(() => import("./pages/Admin").then((m) => ({ default: m.AdminSetup })));
import { AssistantChat } from "./components/AssistantChat";
import { WhatsAppCta } from "./components/WhatsAppCta";
import { SiteFooter } from "./components/SiteFooter";

// The custom-build practice is a separate, lower-traffic funnel — keep it out of
// the initial bundle so "/" stays inside the BUILD_SPEC ~200KB gzip budget.
const Thanks = lazy(() => import("./pages/Thanks"));
const Start = lazy(() => import("./pages/Start"));
const Solutions = lazy(() => import("./pages/Solutions"));
const Security = lazy(() => import("./pages/Security"));
const CeoStory = lazy(() => import("./pages/CeoStory"));
const ForPage = lazy(() => import("./pages/ForPage"));
const StoryHome = lazy(() => import("./pages/StoryHome").then((m) => ({ default: m.StoryHome })));
const Services = lazy(() =>
  import("./pages/Services").then((m) => ({ default: m.Services }))
);

const ProductPage = lazy(() =>
  import("./pages/ProductPage").then((m) => ({ default: m.ProductPage }))
);

const Portal = lazy(() =>
  import("./pages/Portal").then((m) => ({ default: m.Portal }))
);

const BuildPractice = lazy(() =>
  import("./pages/BuildPractice").then((m) => ({ default: m.BuildPractice }))
);

/**
 * One-tap WhatsApp, floating on every visitor-facing page. Hidden on the
 * cockpit and the partner area — those people already have his number.
 */
function VisitorWhatsApp() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin") || pathname.startsWith("/partner") || pathname.startsWith("/portal")) return null;
  return <WhatsAppCta variant="fab" context={pathname.startsWith("/build") ? "build" : "general"} />;
}

/**
 * One footer, every visitor-facing page — the cockpit, portal, partner
 * dashboard, demo and payment return page carry their own chrome.
 */
function GlobalFooter() {
  const { pathname } = useLocation();
  if (/^\/(admin|portal|partner\/dashboard|partner\/reset|demo|thanks)/.test(pathname)) return null;
  return <SiteFooter />;
}

/**
 * Fires one pageview per client-side route change. Lives inside BrowserRouter
 * because useLocation needs the router context; `/admin` is excluded so the
 * owner's own sessions don't pollute the visitor numbers.
 */
function Pageviews() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    trackPageview(pathname);
  }, [pathname]);
  return null;
}

/**
 * Router root. All routes share the same global cinematic background (set in
 * main.tsx): "/" staffing app, "/build" + "/build/global" custom-build practice,
 * "/partner" affiliate bot, "/partner/dashboard" token dashboard. SPA fallback
 * handled by public/_redirects on Cloudflare.
 */
/**
 * A route change starts at the top of the new page. Without this a footer
 * link rendered the next page at the same scroll offset, so the visitor saw
 * another footer and thought nothing had happened. Hash links keep their
 * own scrolling (the pages handle those).
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);
  return null;
}

export default function App() {
  // Capture affiliate ?ref= once on first load (last-click, 90-day), any route.
  // One film at a time. When a film with sound starts anywhere on the page,
  // every other <video> pauses (the silent previews included). A silent
  // preview starting on its own never interrupts anything: only a video
  // the visitor can hear counts as the new one.
  useEffect(() => {
    const onPlay = (e: Event) => {
      const v = e.target as HTMLVideoElement | null;
      if (!v || v.tagName !== "VIDEO" || v.muted) return;
      document.querySelectorAll("video").forEach((o) => { if (o !== v && !o.paused) o.pause(); });
    };
    // When a film in a row ends, the next film in that row plays, until the
    // visitor stops or picks one. The hero spotlight runs its own chain.
    const onEnded = (e: Event) => {
      const v = e.target as HTMLVideoElement | null;
      if (!v || v.tagName !== "VIDEO" || !v.dataset.seq) return;
      const list = Array.from(document.querySelectorAll<HTMLVideoElement>(`video[data-seq="${v.dataset.seq}"]`));
      const next = list[list.indexOf(v) + 1];
      if (!next) return;
      next.muted = false;
      next.scrollIntoView({ block: "center", behavior: "smooth" });
      next.play().catch(() => { /* the browser may want another tap */ });
    };
    document.addEventListener("play", onPlay, true);
    document.addEventListener("ended", onEnded, true);
    return () => { document.removeEventListener("play", onPlay, true); document.removeEventListener("ended", onEnded, true); };
  }, []);

  useEffect(() => {
    captureRefFromUrl();
    // Pull site config on every route, not just ones that render prices — the
    // owner's copy overrides ride along with it and must reach /about too.
    void fetchSiteConfig();
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Pageviews />
      <Routes>
        <Route path="/" element={<Suspense fallback={null}><StoryHome /></Suspense>} />
        <Route path="/demo" element={<Suspense fallback={null}><StaffingApp /></Suspense>} />
        {/* Custom-build practice — a separate funnel from "/" on purpose. */}
        <Route
          path="/build"
          element={
            <Suspense fallback={<div className="min-h-dvh" />}>
              <BuildPractice region="in" />
            </Suspense>
          }
        />
        <Route
          path="/build/global"
          element={
            <Suspense fallback={<div className="min-h-dvh" />}>
              <BuildPractice region="global" />
            </Suspense>
          }
        />
        <Route
          path="/services"
          element={
            <Suspense fallback={<div className="min-h-dvh" />}>
              <Services />
            </Suspense>
          }
        />
        {/* The two productised offers — the revenue, as opposed to the wedge. */}
        <Route
          path="/whatsapp-office"
          element={
            <Suspense fallback={<div className="min-h-dvh" />}>
              <ProductPage product="office" />
            </Suspense>
          }
        />
        <Route
          path="/whatsapp-store"
          element={
            <Suspense fallback={<div className="min-h-dvh" />}>
              <ProductPage product="store" />
            </Suspense>
          }
        />
        <Route
          path="/portal"
          element={
            <Suspense fallback={<div className="min-h-dvh" />}>
              <Portal />
            </Suspense>
          }
        />
        <Route path="/preview" element={<Suspense fallback={null}><StoryHome /></Suspense>} />
        <Route path="/thanks" element={<Suspense fallback={null}><Thanks /></Suspense>} />
        <Route path="/start" element={<Suspense fallback={null}><Start /></Suspense>} />
        <Route path="/solutions" element={<Suspense fallback={null}><Solutions /></Suspense>} />
        <Route path="/security" element={<Suspense fallback={null}><Security /></Suspense>} />
        <Route path="/ceo" element={<Suspense fallback={null}><CeoStory /></Suspense>} />
        <Route path="/for/:industry" element={<Suspense fallback={null}><ForPage /></Suspense>} />
        <Route path="/for/:industry/:city" element={<Suspense fallback={null}><ForPage /></Suspense>} />
        <Route path="/about" element={<Suspense fallback={null}><About /></Suspense>} />
        <Route path="/partner" element={<Suspense fallback={null}><PartnerLanding /></Suspense>} />
        <Route path="/partner/dashboard" element={<Suspense fallback={null}><PartnerDashboard /></Suspense>} />
        <Route path="/partner/reset" element={<Suspense fallback={null}><PartnerReset /></Suspense>} />
        <Route path="/admin" element={<Suspense fallback={null}><Admin /></Suspense>} />
        <Route path="/admin/setup" element={<Suspense fallback={null}><AdminSetup /></Suspense>} />
        <Route path="*" element={<Suspense fallback={null}><StoryHome /></Suspense>} />
      </Routes>
      <GlobalFooter />
      <AssistantChat />
      {/* Sits above the chat launcher: the bot answers instantly, this reaches
          a human. Both are useful; they must not overlap. */}
      <VisitorWhatsApp />
    </BrowserRouter>
  );
}
