import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Render serves from root '/', so base must be '/'
  base: '/',
  server: {
    port: 5173,
  },
})
