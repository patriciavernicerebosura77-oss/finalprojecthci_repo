import path from "path";
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Itong linya na ito ang mag-aayos sa `@/components/...` na error
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

