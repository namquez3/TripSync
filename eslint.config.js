// Root ESLint configuration with per-package overrides.
// This config ensures TypeScript parserOptions.project points to the frontend's
// tsconfig so ESLint won't try to read a tsconfig.json from the repo root.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  // Frontend (Expo + TypeScript)
  {
    files: ['frontend/**/*.{ts,tsx,js,jsx}'],
    extends: [expoConfig],
    // Tell TypeScript-aware rules where to find the tsconfig for the frontend only
    parserOptions: {
      project: ['./frontend/tsconfig.json'],
    },
    ignores: ['frontend/dist/**'],
  },

  // Backend (Node, plain JavaScript)
  {
    files: ['backend/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
    env: {
      node: true,
      es2020: true,
    },
    rules: {
      // Server code commonly uses console for logging; configure as needed
      'no-console': 'off',
    },
  },

  // Global ignores (build artifacts, node_modules, expo caches)
  {
    ignores: ['**/node_modules/**', '.expo/**', '.expo-shared/**'],
  },
]);
