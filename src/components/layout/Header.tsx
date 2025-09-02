import { Link, useLocation } from "react-router-dom"
import "../../styles/layout/header.css"

export default function Header() {
  const { pathname } = useLocation()

  const isDashboardActive = pathname.startsWith("/dashboard/mentores")
  const isAgentesActive = pathname.startsWith("/mentores/agentes")

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

        <Link className={isAgentesActive ? "active" : ""} to="/mentores/agentes">
          Agentes
        </Link>
      </nav>

      {/* Rodapé fixo: Encerrar Seção */}
      <div className="app-sidebar-footer">
        <Link to="/" className="logout-link">Encerrar Seção</Link>
      </div>
    </aside>
  )
}
