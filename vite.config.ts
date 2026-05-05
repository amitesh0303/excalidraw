import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
    plugins: [react(), cloudflare()],
    server: {
        port: 5173,
        open: true
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'canvas': ['roughjs'],
                    'state': ['zustand'],
                    'supabase': ['@supabase/supabase-js'],
                    'utils': ['uuid']
                }
            }
        },
        chunkSizeWarningLimit: 1000,
    },
    optimizeDeps: {
        include: ['react', 'react-dom', 'roughjs', 'zustand', '@supabase/supabase-js']
    }
})