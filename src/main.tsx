import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { getBootParams } from "@/lib/apiClient";

// When the UI is embedded by the Electron shell, tag <html> so we can apply
// small compositing tweaks (see index.css).
if (typeof window !== "undefined" && getBootParams().shell === "electron") {
  document.documentElement.classList.add("is-electron");
}

createRoot(document.getElementById("root")!).render(<App />);
