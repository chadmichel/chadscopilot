import { defineConfig } from '@vitejs/vite';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(
  readFileSync('./package.json', { encoding: 'utf8' })
);

export default defineConfig({
  // ... other config
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
});
