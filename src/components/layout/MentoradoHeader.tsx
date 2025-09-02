// frontend/src/components/layout/MentoradoHeader.tsx
import { NavLink } from "react-router-dom"
import "../../styles/layout/header.css"

export default function MentoradoHeader() {
  return (
    <aside className="app-sidebar">
      <div className="app-sidebar-logo">
        <img src="/images/logo.png" alt="Logo" draggable={false} />
        <span className="brand-name">Growth Digital</span>
      </div>

      <nav className="app-sidebar-nav">
        {/* ativa só em /home/mentorado */}
        <NavLink
          to="/home/mentorado"
          end
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Home
        </NavLink>

        {/* ativa em /home/mentorados/agentes e subrotas */}
        <NavLink
          to="/home/mentorados/agentes"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Agentes
        </NavLink>
      </nav>

      {/* rodapé fixo */}
      <div className="app-sidebar-footer">
        <NavLink to="/" className="logout-link">
          Encerrar Seção
        </NavLink>
      </div>
    </aside>
  )
}
