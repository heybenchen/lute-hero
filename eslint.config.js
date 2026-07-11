import tseslint from '@typescript-eslint/eslint-plugin'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

// Flat config (ESLint v9). Composed from the plugins declared in package.json —
// the `typescript-eslint` meta package and `@eslint/js` are intentionally not
// used so the config resolves under the project's (pnpm) install.
export default [
  { ignores: ['dist/**', 'coverage/**'] },

  // Parser + @typescript-eslint recommended rules (also disables core rules that
  // TypeScript already covers, e.g. no-undef).
  ...tseslint.configs['flat/recommended'],

  // React-specific rules for application source.
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
]
