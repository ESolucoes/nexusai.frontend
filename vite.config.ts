import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_URL || 'http://localhost:3000'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      open: true,
      proxy: {
        '/autenticacao': { target, changeOrigin: true, secure: false },
        '/usuarios':     { target, changeOrigin: true, secure: false },
        '/vigencias':    { target, changeOrigin: true, secure: false },
        '/mentores':     { target, changeOrigin: true, secure: false },
        '/mentorados':   { target, changeOrigin: true, secure: false },
        '/agentes':      { target, changeOrigin: true, secure: false },
        '/arquivos':     { target, changeOrigin: true, secure: false },
        '/docs':         { target, changeOrigin: true, secure: false },
        '/uploads':      { target, changeOrigin: true, secure: false },
      },
    },
  }
})
