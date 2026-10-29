import {defineConfig} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';

// Ergebnis ist eine einzige HTML-Datei (für den Test-Link und später die App)
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {target: 'es2020'}
});
