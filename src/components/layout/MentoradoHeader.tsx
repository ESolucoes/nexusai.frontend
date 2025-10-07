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
        {/* Dashboard do mentorado */}
        <NavLink
          to="/dashboard/mentorado"
          end
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Dashboard
        </NavLink>

        {/* NOVO: Mapeamento (áudio + vagas) */}
        <NavLink
          to="/dashboard/mentorado/mapeamento"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Mapeamento
        </NavLink>

        {/* Agentes */}
        <NavLink
          to="/dashboard/mentorados/agentes"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Agentes
        </NavLink>

        {/* Perfil do Mentorado */}
        <NavLink
          to="/dashboard/mentorado/perfil"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Perfil
        </NavLink>

        {/* NOVO: Candidatura */}
        <NavLink
          to="/dashboard/mentorado/candidatura"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Candidatura
        </NavLink>
      </nav>

      <div className="app-sidebar-footer">
        <NavLink to="/" className="logout-link">
          Encerrar Seção
        </NavLink>
      </div>
    </aside>
  )
}
