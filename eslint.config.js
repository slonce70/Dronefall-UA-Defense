// Плоска конфігурація ESLint для браузерного ESM‑проєкту
// Мінімальні правила для старту; за потреби посилимо пізніше.
import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', '_externos/**', '.github/**'],
  },
  // Браузерний застосунок (ESM)
  {
    files: ['*.js', 'src/**/*.js'],
    ...js.configs.recommended,
    plugins: {
      import: importPlugin,
      jsdoc,
    },
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
      // Требуем фигурные скобки только для многострочных блоков
      curly: ['warn', 'multi-line'],
      'prefer-const': 'warn',
      // Імпорти впорядковуємо за групами з порожнім рядком між групами
      'import/order': [
        'warn',
        {
          groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
          'newlines-between': 'always',
        },
      ],
      // Базові перевірки складності/розміру — помʼякшені пороги для існуючого коду
      complexity: ['warn', { max: 30 }],
      'max-depth': ['warn', 6],
      'max-params': ['warn', 7],
      'max-nested-callbacks': ['warn', 6],
      'max-lines': ['warn', { max: 600, skipBlankLines: true, skipComments: true }],
      'jsdoc/check-alignment': 'warn',
      'jsdoc/check-types': 'warn',
      'jsdoc/require-param-type': 'warn',
      'jsdoc/require-returns-type': 'warn',
      // Уникаємо прямого innerHTML (виняток — тимчасово pvoMenu)
      'no-restricted-properties': [
        'warn',
        { object: '*', property: 'innerHTML', message: 'Не використовуйте innerHTML. Створюйте елементи через DOMSecurity або textContent.' },
      ],
    },
  },
  // Локальні винятки для великих модулів рендера/логіки
  {
    files: ['src/sprites.js', 'src/ui/mapHandlers.js', 'src/core/waveScheduler.js', 'src/spawn.js', 'src/core/Logger.js', 'src/ui/controls.js', 'src/game/MainController.js', 'src/game/spawnWave.js'],
    rules: {
      complexity: 'off',
      'max-lines': 'off',
      'max-depth': 'off',
      'max-params': 'off',
    },
  },
  // (Після міграції innerHTML більше не потрібні винятки)
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
