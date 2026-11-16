import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // `dev-dist` es el service worker que genera vite-plugin-pwa al correr
  // `npm run dev` (devOptions.enabled). Es código generado: no se lintea.
  globalIgnores(['dist', 'dev-dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Reglas nuevas y muy estrictas del React Compiler. Marcan como error el
      // patrón normal de "cargar datos en un useEffect" (que la app usa en casi
      // todas las páginas y funciona bien). Se desactivan para no obligar a
      // refactorizar código que anda. Reactivar si algún día se adopta el compiler.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
    },
  },
])
