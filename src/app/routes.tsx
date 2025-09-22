import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'

const LoginPage = lazy(() => import('../pages/autenticacao/LoginPage'))
const ForgotPasswordPage = lazy(() => import('../pages/autenticacao/ForgotPasswordPage'))
const ChangePasswordPage = lazy(() => import('../pages/autenticacao/ChangePasswordPage'))
const RegisterMentorPage = lazy(() => import('../pages/autenticacao/RegisterMentorPage'))
const DashboardPage = lazy(() => import('../pages/mentores/DashboardPage'))
const AgentesPage = lazy(() => import('../pages/mentores/AgentesPage'))

// NOVOS
const PerfilMentorPage = lazy(() => import('../pages/mentores/PerfilMentorPage'))
const PerfilMentoradoPage = lazy(() => import('../pages/mentorados/PerfilMentoradoPage'))

// Mentorado
const MentoradoHomePage = lazy(() => import('../pages/mentorados/HomePage'))
const MentoradoMapeamentoPage = lazy(() => import('../pages/mentorados/MapeamentoPage'))
const MentoradoAgentesPage = lazy(() => import('../pages/mentorados/AgentesPage'))

const MentoresMentoradoHomePage = lazy(() => import('../pages/mentores/MentoresMentoradoHomePage'))

export const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/change-password', element: <ChangePasswordPage /> },
  {
    path: '/6cb6bc36e770ec7aaedc755636d116e8ebfadf278087bb38ed08c6bd8fc9dad598bc58f0026ddb8fba1ed1bf895d7d7406d9898c465e6814d3bfaa7b7cc08a3b',
    element: <RegisterMentorPage />,
  },

  { path: '/dashboard/mentores', element: <DashboardPage /> },
  { path: '/mentores/agentes', element: <AgentesPage /> },

  // NOVA: Perfil do Mentor
  { path: '/mentores/perfil', element: <PerfilMentorPage /> },

  // visão do mentor sobre um mentorado específico
  { path: '/mentores/home/mentorado', element: <MentoresMentoradoHomePage /> },

  // Mentorado
  { path: '/dashboard/mentorado', element: <MentoradoHomePage /> },
  { path: '/dashboard/mentorado/mapeamento', element: <MentoradoMapeamentoPage /> },
  { path: '/dashboard/mentorados/agentes', element: <MentoradoAgentesPage /> },

  // NOVA: Perfil do Mentorado
  { path: '/dashboard/mentorado/perfil', element: <PerfilMentoradoPage /> },
])
