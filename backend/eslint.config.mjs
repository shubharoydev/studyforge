import js from '@eslint/js'
import globals from 'globals'

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'storage/**', 'coverage/**', '**/*.cjs']
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-console': 'off'
    }
  }
]
