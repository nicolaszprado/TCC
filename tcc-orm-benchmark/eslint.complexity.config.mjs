import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Configuração exclusiva para a coleta de complexidade ciclomática no TCC.
 * Ela não substitui uma eventual configuração de lint da aplicação.
 */
export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'tests/**',
      'database/**',
      'apps/shared/**',
      'apps/typeorm/src/experiments/**',
      'apps/prisma/src/generated/**',
      '**/dist/**',
      '**/coverage/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: [
      'apps/raw-sql/src/**/*.ts',
      'apps/typeorm/src/**/*.ts',
      'apps/prisma/src/**/*.ts',
    ],
    rules: {
      // O limite 0 faz o ESLint registrar a complexidade de toda função.
      // "warn" mantém esta coleta separada do lint de qualidade.
      complexity: ['warn', 0],
    },
  },
);
