import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? 'unknown'),
    __GIT_COMMIT__: JSON.stringify(process.env.OKOSCOPE_WEB_GIT_COMMIT ?? 'unknown'),
  },
  server: {
    port: 4173,
    proxy: {
      '/api': {
        target: process.env.OKOSCOPE_DEV_API_TARGET ?? 'https://okoscope.com',
        changeOrigin: true,
      },
    },
  },
})
