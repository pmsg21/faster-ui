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

  // ── The hardcoded-colour gate ─────────────────────────────────────────────
  // The most-cited rule in CLAUDE.md: a colour outside the primitive layer is a
  // build failure. A component that names a raw colour has reached past the token
  // layer, and the whole architecture — dark mode as a re-map, the contrast
  // contract, a re-skin being a mapping change — depends on that not happening.
  //
  // Three exemptions, each for a different reason:
  //  - `src/styles/**` — primitives ARE literals by definition.
  //  - `*.stories.tsx` — a Design Fidelity row's job is to render values the token
  //    layer deliberately does not contain (see docs/decisions.md).
  //  - `*.cy.tsx` / `*.test.tsx` — a test asserting that a token resolved to the
  //    right painted pixel has to name that pixel. Deriving the expected value
  //    from the token under test would make the assertion circular and unable to
  //    catch the thing it exists to catch.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/styles/**', '**/*.stories.tsx', '**/*.cy.tsx', '**/*.{test,spec}.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // Hex, rgb()/rgba(), hsl()/hsla() anywhere in a string literal.
          selector: 'Literal[value=/(#[0-9a-fA-F]{3,8}\\b)|(\\b(rgb|rgba|hsl|hsla)\\s*\\()/]',
          message:
            'Hardcoded colour. Components name semantic tokens only — add a token in ' +
            'src/styles/tokens.css instead (CLAUDE.md, token layering).',
        },
        {
          // Tailwind arbitrary colour values: bg-[#15C5CE], text-[rgb(...)].
          selector:
            'Literal[value=/(bg|text|border|ring|outline|fill|stroke|shadow|from|via|to)-\\[(#|rgb|hsl)/]',
          message:
            'Hardcoded colour in a Tailwind arbitrary value. Components name semantic ' +
            'tokens only (CLAUDE.md, token layering).',
        },
      ],
    },
  },

  // Build scripts run in Node, not in a browser or a bundle. They legitimately
  // reach for `process` and write to stdout — a build step that fails silently is
  // worse than one that talks.
  {
    files: ['scripts/**/*.mjs'],
    // Declared by name rather than pulling in the `globals` package for two of
    // them — which would also be a fourth undeclared transitive to reason about.
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
    rules: { 'no-console': 'off' },
  },

  // Must stay last: turns off every rule that conflicts with Prettier.
  prettierConfig
);
