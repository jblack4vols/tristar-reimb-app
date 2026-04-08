import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'vendor-react'
          if (id.includes('node_modules/@supabase')) return 'vendor-supabase'
          if (id.includes('node_modules/@azure') || id.includes('node_modules/bcryptjs')) return 'vendor-auth'
          if (id.includes('node_modules/crypto-js')) return 'vendor-crypto'
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) return 'vendor-pdf'
          if (id.includes('node_modules/jszip') || id.includes('node_modules/file-saver')) return 'vendor-misc'
        },
      },
    },
  },
})
