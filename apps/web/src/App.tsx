import { BrowserRouter, Routes, Route } from "react-router"
import { Layout } from "@/components/layout"
import { HomePage } from "@/pages/home"
import { TestDetailPage } from "@/pages/test-detail"
import { SettingsPage } from "@/pages/settings"

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/tests/:id" element={<TestDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
