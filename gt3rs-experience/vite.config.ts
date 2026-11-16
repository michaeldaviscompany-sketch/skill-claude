import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/](three|three-stdlib|troika|postprocessing|@react-three)/ },
            { name: 'motion', test: /node_modules[\\/](gsap|lenis|@gsap)/ },
          ],
        },
      },
    },
  },
  plugins: [react()],
})
