module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'react-native'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react-native/all',
    'prettier',
  ],
  settings: {
    react: { version: 'detect' },
  },
  env: {
    'react-native/react-native': true,
    jest: true,
  },
  rules: {
    // No implicit tech debt: catch unused code and unsafe patterns immediately
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': [
      'warn',
      { allowExpressions: true },
    ],
    'react-hooks/exhaustive-deps': 'error',
    // Accessibility: every pressable must have an a11y label
    'react-native/no-raw-text': 'off',
    'react-native/no-inline-styles': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
