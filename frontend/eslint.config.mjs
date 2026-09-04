export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**']
  },
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...{ window: true, document: true, navigator: true, localStorage: true, fetch: true, setTimeout: true, clearTimeout: true }, ...globalThis }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off'
    }
  }
]
