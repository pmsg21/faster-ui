import type { Decorator, Preview } from '@storybook/react';

import { PAGE_STRUCTURE_RULES_NOT_APPLICABLE } from '../a11y.config';

import '../src/styles/index.css';

// Proves the token architecture: switching mode changes one attribute,
// and no component re-renders differently.
const withThemeMode: Decorator = (Story, context) => {
  document.documentElement.dataset.theme = context.globals.theme as string;
  return Story();
};

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i } },
    // Page-structure rules, off once and globally, from the same file the Cypress specs
    // read. They are not overridden — a component rendered in isolation has no page for
    // them to evaluate. Anything that is a real accessibility exemption goes through
    // `storyAcceptedContrast` on the individual story instead, which requires a measured
    // ratio and a register row. See a11y.config.ts.
    a11y: { options: PAGE_STRUCTURE_RULES_NOT_APPLICABLE },
  },
  globalTypes: {
    theme: {
      description: 'Token mode',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
  decorators: [withThemeMode],
};

export default preview;
