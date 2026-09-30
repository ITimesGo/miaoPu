import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: https://itimesgo.github.io/miaoPu/
export default defineConfig({
  plugins: [react()],
  base: '/miaoPu/',
})
