import { defineConfig } from 'vite';
// /api goes to the local keeper during development (node keeper/server.mjs).
// VITE_BASE is /feral/ on GitHub Pages and ./ for local and file builds.
export default defineConfig({
  base: process.env.VITE_BASE || './',
  server: { fs: { allow: ['..'] }, proxy: { '/api': 'http://127.0.0.1:8787' } },
  define: { __OFFLINE__: 'false' },
});
