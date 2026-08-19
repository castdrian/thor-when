import { defineConfig, loadEnv } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [svelte()],
    base: env.VITE_BASE_PATH ?? (env.GITHUB_ACTIONS === 'true' ? '/thor-when/' : '/'),
    build: {
      target: 'es2022',
      sourcemap: true
    }
  }
})
