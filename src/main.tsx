import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./lib/theme";
import { VoiceProvider } from "./lib/voice";
import { AuroraBackground } from "./components/AuroraBackground";
import { WelcomeSplash } from "./components/WelcomeSplash";
import { HoloBackground } from "./components/holo/HoloBackground";
import App from "./App";
import "./i18n";
import "./index.css";

// Web fonts are attached with media="print" in index.html so a slow
// fonts.googleapis.com can never block first paint (see the note there). Flip
// them on as soon as the sheet is available; the page is already readable in the
// fallback stack by this point, so this only upgrades the typography.
const webfonts = document.getElementById("webfonts") as HTMLLinkElement | null;
if (webfonts) {
  const enable = () => {
    webfonts.media = "all";
  };
  // Already cached from a previous visit? Then it is safe to switch immediately.
  if (webfonts.sheet) enable();
  else webfonts.addEventListener("load", enable, { once: true });
}

// Registered after load so it never competes with first paint. See public/sw.js —
// it caches only immutable hashed assets, never HTML or API responses.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* installability is a bonus; never break the site over it */
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuroraBackground />
      <HoloBackground />
      <VoiceProvider>
        <WelcomeSplash />
        <App />
      </VoiceProvider>
    </ThemeProvider>
  </StrictMode>
);
