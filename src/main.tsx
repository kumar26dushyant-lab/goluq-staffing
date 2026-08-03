import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./lib/theme";
import { VoiceProvider } from "./lib/voice";
import { AuroraBackground } from "./components/AuroraBackground";
import { HoloBackground } from "./components/holo/HoloBackground";
import App from "./App";
import "./i18n";
import "./index.css";

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
        <App />
      </VoiceProvider>
    </ThemeProvider>
  </StrictMode>
);
