import { defineConfig } from 'cypress';

export default defineConfig({
  component: {
    devServer: { framework: 'react', bundler: 'vite' },
    specPattern: 'src/**/*.cy.{ts,tsx}',
    supportFile: 'cypress/support/component.ts',
    viewportWidth: 1000,
    viewportHeight: 700,
    video: false,
  },
});
