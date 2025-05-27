import { defineConfig } from 'eslint/config'
import js from '@eslint/js'
import globals from 'globals'

export default defineConfig([
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      'no-case-declarations': 'off',
      semi: 'off',
      'comma-dangle': ['error', 'never'],
      'space-before-function-paren': 'off',
      'no-unused-vars': [
        'error',
        {
          caughtErrors: 'none'
        }
      ]
    }
  }
])
