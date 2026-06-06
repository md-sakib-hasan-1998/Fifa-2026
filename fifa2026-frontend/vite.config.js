import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // For GitHub Pages deployment — replace with your repo name
  // e.g. if your repo is github.com/yourname/fifa2026, set base: '/fifa2026/'
  base: '/fifa2026/',
  server: {
    port: 5173,
  },
})
