import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { captureRefFromUrl } from "./lib/refAttribution";
import { trackPageview } from "./lib/track";
import { fetchSiteConfig } from "./lib/siteConfig";
import { StaffingApp } from "./pages/StaffingApp";
import { PartnerLanding } from "./pages/PartnerLanding";
import { PartnerDashboard } from "./pages/PartnerDashboard";
import { PartnerReset } from "./pages/PartnerReset";
import { About } from "./pages/About";
import { Admin, AdminSetup } from "./pages/Admin";
import { AssistantChat } from "./components/AssistantChat";
import { WhatsAppCta } from "./components/WhatsAppCta";

// The custom-build practice is a separate, lower-traffic funnel — keep it out of
// the initial bundle so "/" stays inside the BUILD_SPEC ~200KB gzip budget.
const Services = lazy(() =>
  import("./pages/Services").then((m) => ({ default: m.Services }))
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
export default function App() {
  // Capture affiliate ?ref= once on first load (last-click, 90-day), any route.
  useEffect(() => {
    captureRefFromUrl();
    // Pull site config on every route, not just ones that render prices — the
    // owner's copy overrides ride along with it and must reach /about too.
    void fetchSiteConfig();
  }, []);

  return (
    <BrowserRouter>
      <Pageviews />
      <Routes>
        <Route path="/" element={<StaffingApp />} />
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
        <Route
          path="/portal"
          element={
            <Suspense fallback={<div className="min-h-dvh" />}>
              <Portal />
            </Suspense>
          }
        />
        <Route path="/about" element={<About />} />
        <Route path="/partner" element={<PartnerLanding />} />
        <Route path="/partner/dashboard" element={<PartnerDashboard />} />
        <Route path="/partner/reset" element={<PartnerReset />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/setup" element={<AdminSetup />} />
        <Route path="*" element={<StaffingApp />} />
      </Routes>
      <AssistantChat />
      {/* Sits above the chat launcher: the bot answers instantly, this reaches
          a human. Both are useful; they must not overlap. */}
      <VisitorWhatsApp />
    </BrowserRouter>
  );
}
