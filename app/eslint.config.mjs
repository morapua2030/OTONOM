// Lint for the whole app workspace (C5-01 / C1-01, audit 2026-11-18). Run in CI as `pnpm lint`.
// typescript-eslint "recommended" + React hooks + Next.js. Rules that the existing code still breaks are warnings, and
// CI fails when the warning count grows (`--max-warnings` in package.json is a ratchet: lower it, never raise it).
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/results/**',
      '**/coverage/**',
      'web/src/payload-types.ts',
      'web/src/app/(payload)/admin/importMap.js',
      'web/next-env.d.ts',
      'web/public/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['web/**/*.{ts,tsx,mts,js,mjs}'],
    plugins: { 'react-hooks': reactHooks, '@next/next': nextPlugin },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      // Existing debt (plain <a> links), held by the --max-warnings ratchet.
      '@next/next/no-html-link-for-pages': 'warn',
    },
    settings: { next: { rootDir: 'web' } },
  },
  {
    rules: {
      // Existing debt, held by the --max-warnings ratchet (audit C1-03: explicit any; unused names).
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      // A suppression must say why (audit C1-04).
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': 'allow-with-description', 'ts-expect-error': 'allow-with-description' }],
    },
  },
);
