import { Link, useLocation } from "react-router-dom"
import "../../styles/layout/header.css"

export default function MentoradoHeader() {
  const { pathname } = useLocation()

  const isHomeActive = pathname.startsWith("/home/mentorado")
  const isAgentesActive = pathname.startsWith("/home/mentorados/agentes")

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar-logo">
        <img src="/images/logo.png" alt="Logo" draggable={false} />
        <span className="brand-name">Growth Digital</span>
      </div>

      <nav className="app-sidebar-nav">
        <Link className={isHomeActive ? "active" : ""} to="/home/mentorado">
          Home
        </Link>

        <Link className={isAgentesActive ? "active" : ""} to="/home/mentorados/agentes">
          Agentes
        </Link>
      </nav>
    </aside>
  )
}
