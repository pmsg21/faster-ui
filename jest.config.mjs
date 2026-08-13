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
    '^.+\\.(t|j)sx?$': ['@swc/jest', {}],
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
