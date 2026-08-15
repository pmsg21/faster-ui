import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import storybook from 'eslint-plugin-storybook';
import tailwind from 'eslint-plugin-tailwindcss';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'storybook-static', 'node_modules', '!.storybook'] },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  {
    files: ['**/*.{ts,tsx}'],
    extends: [tailwind.configs.recommended],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    settings: {
      react: { version: 'detect' },
      tailwindcss: {
        // MANDATORY in plugin v4: it reads the @theme tokens from here
        // instead of a tailwind.config.js. This is what makes the linter
        // validate classes against the real token source.
        cssConfigPath: './src/styles/index.css',
      },
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.strict.rules,

      // Class ORDER is Prettier's job, not ESLint's. Both plugins sort, they
      // disagree, and each undoes the other: `eslint --fix` reorders, then
      // `prettier --write` reorders back, so `lint` and `format:check` cannot be
      // green at the same time. Prettier owns formatting here (it also runs last
      // in lint-staged), so the ESLint sorter is off. `no-custom-classname` stays
      // on — that one catches a mistyped token, which is a real defect.
      'tailwindcss/classnames-order': 'off',

      // No console noise in a published library.
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // A design system's public API must be explicit.
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Cypress files are type-checked by their own TS project, not the root one.
  // projectService can't cross to a sibling tsconfig, so point the parser at it
  // explicitly — this keeps type-aware linting working on .cy files.
  {
    files: ['cypress/**/*.{ts,tsx}', 'src/**/*.cy.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: './cypress/tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Tests and stories may be looser.
  {
    files: ['**/*.{test,spec}.{ts,tsx}', '**/*.stories.tsx', '**/*.cy.tsx'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },

  ...storybook.configs['flat/recommended'],

  // Type-aware rules can't run on files outside the TS project.
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },

  // Flat config does not auto-assign CommonJS by extension; the Jest CSS mock
  // is a .cjs file and needs `module`/`require` defined.
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
  },

  // Must stay last: turns off every rule that conflicts with Prettier.
  prettierConfig
);
