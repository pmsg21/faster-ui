// @ts-check
/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.css$': '<rootDir>/__mocks__/styleMock.cjs',
  },
  transform: {
    // The automatic JSX runtime must be set explicitly: @swc/jest defaults to the
    // classic one, which compiles JSX to `React.createElement` and needs `React`
    // in scope. The library itself never imports React just to render, so the
    // first component test failed with `React is not defined` until this landed.
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', tsx: true },
          transform: { react: { runtime: 'automatic' } },
        },
      },
    ],
  },
  testMatch: ['<rootDir>/src/**/*.{test,spec}.{ts,tsx}'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.stories.tsx',
    // Cypress specs are never run by Jest, so they'd count as 0%-covered source.
    '!src/**/*.cy.tsx',
    '!src/**/index.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: { branches: 80, functions: 85, lines: 85, statements: 85 },
  },
};

export default config;
