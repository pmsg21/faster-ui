import { defineConfig } from 'cypress';

export default defineConfig({
  component: {
    devServer: { framework: 'react', bundler: 'vite' },
    specPattern: 'src/**/*.cy.{ts,tsx}',
    supportFile: 'cypress/support/component.ts',
    viewportWidth: 1000,
    viewportHeight: 700,
    video: false,
    setupNodeEvents(on) {
      // Without this, an axe failure reports only a count ("2 accessibility
      // violations were detected") and the detail stays in the browser's command
      // log — invisible in CI, which is the one place it is needed.
      on('task', {
        logA11yViolations(violations: { id: string; impact: string; nodes: { html: string }[] }[]) {
          for (const violation of violations) {
            console.error(
              `\n  [axe] ${violation.id} (${violation.impact}) — ${violation.nodes.length} node(s)`
            );
            for (const node of violation.nodes) {
              console.error(`        ${node.html}`);
            }
          }
          return null;
        },
      });
    },
  },
});
