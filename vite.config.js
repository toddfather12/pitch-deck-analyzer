import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In dev, the Node API (npm run dev:api) runs on 8787.
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true, timeout: 300000 } },
  },
})
