import { defineConfig } from 'vite';

export default defineConfig({
  // относительные пути — сборку можно открыть из любой папки или залить на itch.io / Poki
  base: './',
  server: { port: 5173 },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000, // Phaser сам по себе ~1.2 МБ, это нормально
    rollupOptions: {
      output: { entryFileNames: 'game.js', assetFileNames: 'assets/[name][extname]' },
    },
  },
});
