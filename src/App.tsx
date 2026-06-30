import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { captureRefFromUrl } from "./lib/refAttribution";
import { StaffingApp } from "./pages/StaffingApp";
import { PartnerLanding } from "./pages/PartnerLanding";
import { PartnerDashboard } from "./pages/PartnerDashboard";
import { About } from "./pages/About";

/**
 * Router root. Three routes share the same global cinematic background (set in
 * main.tsx): "/" staffing app, "/partner" affiliate bot, "/partner/dashboard"
 * token dashboard. SPA fallback handled by public/_redirects on Cloudflare.
 */
export default function App() {
  // Capture affiliate ?ref= once on first load (last-click, 90-day), any route.
  useEffect(() => {
    captureRefFromUrl();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StaffingApp />} />
        <Route path="/about" element={<About />} />
        <Route path="/partner" element={<PartnerLanding />} />
        <Route path="/partner/dashboard" element={<PartnerDashboard />} />
        <Route path="*" element={<StaffingApp />} />
      </Routes>
    </BrowserRouter>
  );
}
