import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { SettingsProvider } from "@/store/settings"
import { TestsProvider } from "@/store/tests"
import { RunProvider } from "@/store/run"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <SettingsProvider>
        <TestsProvider>
          <RunProvider>
            <App />
          </RunProvider>
        </TestsProvider>
      </SettingsProvider>
    </ThemeProvider>
  </StrictMode>
)
