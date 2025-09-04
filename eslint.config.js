// Плоска конфігурація ESLint для браузерного ESM‑проєкту
// Мінімальні правила для старту; за потреби посилимо пізніше.
import js from '@eslint/js';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', '_externos/**', '.github/**'],
  },
  // Браузерний застосунок (ESM)
  {
    files: ['*.js', 'src/**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        performance: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        requestAnimationFrame: 'readonly',
        Image: 'readonly',
        L: 'readonly', // Leaflet global from index.html
        localStorage: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-constant-condition': ['error', { checkLoops: false }],
      eqeqeq: ['warn', 'smart'],
      curly: ['warn', 'all'],
      'prefer-const': 'warn',
    },
  },
  // Node‑скрипти та конфіги
  {
    files: [
      'scripts/**/*.mjs',
      'vite.config.ts',
      'vitest.config.ts',
      'playwright.config.ts',
      'eslint.config.js',
    ],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
      },
    },
    rules: {},
  },
];
