import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import LoginPage from "./pages/autenticacao/LoginPage"
import DashboardPage from "./pages/mentores/DashboardPage"
import { getToken, decodeJwt } from "./lib/api"

function isTokenValid(t?: string | null) {
  if (!t) return false
  const payload = decodeJwt<any>(t)
  const exp = payload?.exp
  if (!exp) return true
  return Math.floor(Date.now() / 1000) < exp
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const ok = isTokenValid(getToken())
  if (!ok) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        <Route
          path="/dashboard/mentores"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
