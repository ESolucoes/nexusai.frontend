// src/components/layout/Header.tsx
import { Link, useLocation } from "react-router-dom"
import "../../styles/layout/header.css"

export default function Header() {
  const { pathname } = useLocation()

  const isDashboardActive = pathname.startsWith("/dashboard/mentores")
  const isAgentesActive = pathname.startsWith("/mentores/agentes")
  const isMentoresActive = pathname.startsWith("/mentores") && !isAgentesActive

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar-logo">
        <img src="/images/logo.png" alt="Logo" draggable={false} />
        <span className="brand-name">Growth Digital</span>
      </div>

      <nav className="app-sidebar-nav">
        <Link className={isDashboardActive ? "active" : ""} to="/dashboard/mentores">
          Dashboard
        </Link>

        <Link className={isMentoresActive ? "active" : ""} to="/mentores">
          Mentores
        </Link>

        <span className="nav-label">Mentorados</span>

        <Link className={isAgentesActive ? "active" : ""} to="/mentores/agentes">
          Agentes
        </Link>
      </nav>
    </aside>
  )
}
