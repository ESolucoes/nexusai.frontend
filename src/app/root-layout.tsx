import { Suspense } from 'react'
import { Outlet, Link, NavLink } from 'react-router-dom'

export function RootLayout() {
  return (
    <div style={{ fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif' }}>
      <header style={{ display: 'flex', gap: 16, padding: 16, borderBottom: '1px solid #eee' }}>
        <Link to="/" style={{ fontWeight: 700 }}>NexusAI Frontend</Link>
        <nav style={{ display: 'flex', gap: 8 }}>
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/health">Health</NavLink>
        </nav>
      </header>
      <main style={{ padding: 16, maxWidth: 960, margin: '0 auto' }}>
        <Suspense fallback={<p>Carregando…</p>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
