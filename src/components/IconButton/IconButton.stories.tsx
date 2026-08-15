import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { IconButton } from './IconButton';

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path
      d="M12 5v14M5 12h14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path
      d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Same taxonomy as Button — the Figma **General** section. */
const meta = {
  title: 'General/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A square, icon-only button. It **composes `Button`**, so `aria-disabled` handling, ' +
          'suppressed activation, `type="button"`, loading and focus are shared by construction ' +
          'rather than reimplemented. `aria-label` is **required at the type level**: an ' +
          'icon-only control has no visible text, so a nameless one does not compile.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['primary', 'outline', 'ghost'],
      description: 'No `link` — the Figma IconButton set has three variants, not four.',
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
      description: 'Small / Medium / Large — 24 / 36 / 40px square.',
    },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    'aria-label': { control: 'text', description: 'Required. The control has no visible name.' },
    icon: { control: false },
  },
  args: {
    'aria-label': 'Add item',
    icon: <PlusIcon />,
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    onClick: fn(),
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * IconButton introduces no divergences of its own. Two entries from the register
 * apply to it, both inherited from Button — see `docs/design-fidelity.md`.
 */
export const DesignFidelity: Story = {
  name: 'Design fidelity',
  parameters: {
    docs: {
      description: {
        story:
          'Rows 1 and 7 of the register apply here; nothing else does. The glyph on the filled ' +
          'variant is the dark on-accent token rather than white, and the focus ring is an ' +
          'addition the Figma file does not draw.',
      },
    },
  },
  render: (args) => (
    <div className="grid max-w-3xl gap-5">
      <div className="border-line-subtle grid gap-3 border-b pb-5">
        <div className="text-body text-content-primary font-medium">
          1. Glyph on the filled variant
        </div>
        <div className="flex flex-wrap items-start gap-10">
          <div className="grid gap-2">
            <div className="text-caption text-content-secondary">As drawn in Figma</div>
            <IconButton {...args} className="text-white" icon={<PlusIcon />} />
          </div>
          <div className="grid gap-2">
            <div className="text-caption text-content-secondary">Shipped</div>
            <IconButton {...args} icon={<PlusIcon />} />
          </div>
        </div>
        <div className="text-caption text-content-secondary">
          <strong className="text-content-primary">2.12 → 7.78</strong> · SC 1.4.3 — white on the
          brand cyan is unreadable, and no step of the ramp is dark enough to fix it.
        </div>
      </div>
      <div className="grid gap-3">
        <div className="text-body text-content-primary font-medium">
          7. Focus state — an addition, not a change
        </div>
        <div className="flex flex-wrap items-start gap-10">
          <div className="grid gap-2">
            <div className="text-caption text-content-secondary">As drawn in Figma</div>
            <IconButton {...args} className="outline-none" icon={<PlusIcon />} />
          </div>
          <div className="grid gap-2">
            <div className="text-caption text-content-secondary">Shipped</div>
            <IconButton
              {...args}
              className="outline-focus-strong outline-2 outline-offset-2"
              icon={<PlusIcon />}
            />
          </div>
        </div>
        <div className="text-caption text-content-secondary">
          <strong className="text-content-primary">none → 15.79</strong> · SC 1.4.11 — the file
          draws no focus state, and it cannot be the brand cyan.
        </div>
      </div>
    </div>
  ),
};

export const Playground: Story = { args: { icon: <PlusIcon /> } };

export const Primary: Story = { args: { variant: 'primary', icon: <PlusIcon /> } };
export const Outline: Story = { args: { variant: 'outline', icon: <PlusIcon /> } };
export const Ghost: Story = { args: { variant: 'ghost', icon: <PlusIcon /> } };

export const AllVariants: Story = {
  name: 'All variants',
  render: (args) => (
    <div className="flex flex-wrap items-center gap-4">
      <IconButton {...args} variant="primary" aria-label="Add item" icon={<PlusIcon />} />
      <IconButton {...args} variant="outline" aria-label="Add item" icon={<PlusIcon />} />
      <IconButton {...args} variant="ghost" aria-label="Add item" icon={<PlusIcon />} />
    </div>
  ),
};

export const AllSizes: Story = {
  name: 'All sizes',
  parameters: {
    docs: {
      description: {
        story:
          '24 / 36 / 40px square. **`sm` sits exactly on the SC 2.5.8 floor** of 24×24 with no ' +
          'margin, so it is meant for pointer-dense UI — toolbars, table rows. `md` and `lg` ' +
          'are the touch defaults. The floor is asserted in `IconButton.cy.tsx`, not just ' +
          'written down here.',
      },
    },
  },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-4">
      <IconButton {...args} size="sm" aria-label="Small" icon={<PlusIcon />} />
      <IconButton {...args} size="md" aria-label="Medium" icon={<PlusIcon />} />
      <IconButton {...args} size="lg" aria-label="Large" icon={<PlusIcon />} />
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, icon: <PlusIcon /> },
  parameters: {
    docs: {
      description: {
        story:
          'Renders `aria-disabled`, not the native attribute — inherited from `Button`, so it ' +
          'cannot drift between the two components. Tab to it: reachable, announced, inert.',
      },
    },
  },
};

export const Loading: Story = {
  args: { loading: true, icon: <PlusIcon /> },
  parameters: {
    docs: {
      description: {
        story:
          'The glyph is replaced by the spinner and `aria-busy` is set. The animation respects ' +
          '`prefers-reduced-motion`.',
      },
    },
  },
};

export const Focus: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Forced on for the first two; tab to the third to see it for real.',
      },
    },
  },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-4">
      <IconButton
        {...args}
        className="outline-focus-strong outline-2 outline-offset-2"
        aria-label="Add item"
        icon={<PlusIcon />}
      />
      <IconButton
        {...args}
        variant="outline"
        className="outline-focus-strong outline-2 outline-offset-2"
        aria-label="Add item"
        icon={<PlusIcon />}
      />
      <IconButton {...args} aria-label="Tab to me" icon={<PlusIcon />} />
    </div>
  ),
};

export const EveryState: Story = {
  name: 'Every state',
  render: (args) => (
    <div className="grid gap-4">
      {(['primary', 'outline', 'ghost'] as const).map((variant) => (
        <div key={variant} className="flex flex-wrap items-center gap-4">
          <IconButton {...args} variant={variant} aria-label="Default" icon={<PlusIcon />} />
          <IconButton
            {...args}
            variant={variant}
            disabled
            aria-label="Disabled"
            icon={<PlusIcon />}
          />
          <IconButton
            {...args}
            variant={variant}
            loading
            aria-label="Loading"
            icon={<PlusIcon />}
          />
          <IconButton
            {...args}
            variant={variant}
            className="outline-focus-strong outline-2 outline-offset-2"
            aria-label="Focus"
            icon={<PlusIcon />}
          />
        </div>
      ))}
    </div>
  ),
};

export const InAToolbar: Story = {
  name: 'Edge case: a dense toolbar',
  parameters: {
    docs: {
      description: {
        story:
          'The case `sm` exists for. Note that the hit area is **not** extended beyond the ' +
          'visual box: an invisible 44px target on a 24px control would overlap its neighbours, ' +
          'and an overlapping target is worse than a small one.',
      },
    },
  },
  render: (args) => (
    <div className="rounded-control border-line-subtle inline-flex items-center gap-1 border p-1">
      <IconButton {...args} size="sm" variant="ghost" aria-label="Add row" icon={<PlusIcon />} />
      <IconButton
        {...args}
        size="sm"
        variant="ghost"
        aria-label="Delete row"
        icon={<TrashIcon />}
      />
    </div>
  ),
};
