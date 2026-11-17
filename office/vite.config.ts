import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' supaya bisa dipasang di GitHub Pages (alamat /nama-repo/).
export default defineConfig({ base: './', plugins: [react()] });
