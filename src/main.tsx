import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./lib/theme";
import { VoiceProvider } from "./lib/voice";
import { AuroraBackground } from "./components/AuroraBackground";
import { HoloBackground } from "./components/holo/HoloBackground";
import App from "./App";
import "./i18n";
import "./index.css";

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
