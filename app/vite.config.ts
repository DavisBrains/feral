import { defineConfig } from 'vite';
export default defineConfig({ server: { fs: { allow: ['..'] } }, define: { __OFFLINE__: 'false' } });
