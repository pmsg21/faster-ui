import type { Decorator, Preview } from '@storybook/react';

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
