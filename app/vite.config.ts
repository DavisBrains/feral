import { defineConfig } from 'vite';
// /api goes to the local keeper during development (node keeper/server.mjs).
export default defineConfig({ server: { fs: { allow: ['..'] }, proxy: { '/api': 'http://127.0.0.1:8787' } }, define: { __OFFLINE__: 'false' } });
