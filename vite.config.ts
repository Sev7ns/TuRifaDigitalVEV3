import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Cast process to any to avoid TS2580 error in environments where @types/node isn't picked up automatically
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Maps process.env.API_KEY to the value set in Netlify UI
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});