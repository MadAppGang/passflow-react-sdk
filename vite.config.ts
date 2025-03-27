import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import EnvironmentPlugin from 'vite-plugin-environment';
import path from 'path';
import { dependencies, peerDependencies, optionalDependencies } from './package.json';
import tailwindcss from 'tailwindcss';
import cssnano from 'cssnano';

const baseExternal = [...Object.keys(dependencies), ...Object.keys(peerDependencies), 'react/jsx-runtime'];

const optionalExternal = Object.keys(optionalDependencies || {});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), dts(), EnvironmentPlugin('all')],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format}.js`,
    },
    rollupOptions: {
      external: (id) => {
        return baseExternal.includes(id) || optionalExternal.some(dep => id.startsWith(dep));
      },
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
      }
    },
    target: 'esnext',
    sourcemap: true,
    emptyOutDir: true,
    minify: 'terser',
    cssCodeSplit: false,
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss('./tailwind.config.js'),
        cssnano({
          preset: 'default',
        }),
      ],
    },
  },
  assetsInclude: ['**/*.svg'],
});
