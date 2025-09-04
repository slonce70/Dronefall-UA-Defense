import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { open: true },
  build: {
    target: 'es2020',
    // Керування sourcemap через змінну середовища: за замовчуванням вимкнено
    sourcemap: process.env.SOURCEMAP === 'true',
  },
});
