import path from 'node:path';
import react from '@vitejs/plugin-react';
import cssnano from 'cssnano';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import EnvironmentPlugin from 'vite-plugin-environment';
import { dependencies, peerDependencies } from './package.json';

const baseExternal = [...Object.keys(dependencies), ...Object.keys(peerDependencies), 'react/jsx-runtime'];

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src'],
      exclude: [
        'src/app.tsx',
        'src/main.tsx',
        'src/test/**',
        'src/**/__tests__/**',
        'src/**/*.test.*',
        'src/**/*.stories.*',
      ],
    }),
    EnvironmentPlugin('all'),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format}.js`,
    },
    rolldownOptions: {
      external: (id) => {
        return baseExternal.includes(id);
      },
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'style.css';
          }
          return assetInfo.name;
        },
      },
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
        cssnano({
          preset: 'default',
        }),
      ],
    },
  },
  assetsInclude: ['**/*.svg'],
});
