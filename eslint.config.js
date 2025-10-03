import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  // Global ignores
  {
    ignores: ['dist/', 'coverage/', '**/*.d.ts', 'tests/'],
  },
  // Base recommended configurations
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Custom configuration for the project
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { args: 'none' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/quotes': [
        'error',
        'single',
        { avoidEscape: true, allowTemplateLiterals: false },
      ],
      curly: ['error', 'all'],
      eqeqeq: 'error',
      'prefer-arrow-callback': 'error',
    },
  },

  // Prettier config must be last to override other formatting rules
  eslintConfigPrettier,
);
