import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  base: process.env.GITHUB_ACTIONS === 'true' ? '/thor-when/' : '/',
  build: {
    target: 'es2022',
    sourcemap: true
  }
})
