import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { Input } from './Input';

/**
 * Story titles mirror the Figma section taxonomy. The Input page sits under **Data
 * Entry**, which the file's Overview page defines as "inputting of data or information
 * from various sources into a system". If Storybook grouped differently from Figma,
 * design and engineering would start describing the same component two ways — the
 * fragmentation a design system exists to prevent.
 */
const meta = {
  title: 'Data Entry/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The system text field. `size` is the **only** public axis — the Figma page models ' +
          '237 components across seven sets, but `State`, `Typing`, `Text Entered` and ' +
          '`State 2` are all runtime, and a design tool can only express runtime state by ' +
          'drawing every combination of it. Accessibility is built in: the label is required ' +
          'and cannot be omitted, `aria-describedby` lists the hint before the error, and the ' +
          'error region is always mounted so its announcement is reliable.',
      },
    },
  },
  argTypes: {
    label: { control: 'text', description: 'Required. A nameless field does not compile.' },
    labelHidden: {
      control: 'boolean',
      description: 'Hides the label visually; it stays in the accessibility tree.',
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
      description: 'Small / Medium / Large in the Figma file.',
    },
    hint: { control: 'text', description: 'Guidance. Announced *before* the error.' },
    error: { control: 'text', description: 'Presence alone sets `aria-invalid`.' },
    placeholder: { control: 'text', description: 'Never a substitute for the label.' },
    disabled: {
      control: 'boolean',
      description: 'The native attribute — the value will not submit.',
    },
    clearable: { control: 'boolean' },
    clearLabel: { control: 'text' },
    startIcon: { control: false },
    endIcon: { control: false },
    prefix: { control: false },
    suffix: { control: false },
  },
  args: {
    label: 'Email address',
    size: 'md',
    labelHidden: false,
    disabled: false,
    clearable: false,
    placeholder: 'you@example.com',
    onChange: fn(),
    onClear: fn(),
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Design fidelity ──────────────────────────────────────────────────────── */

interface FidelityRowProps {
  /** Position in the register in docs/design-fidelity.md, so the two read together. */
  registerNumber: number;
  /** What differs, in one phrase. */
  difference: string;
  /** The WCAG success criterion this turns on. */
  criterion: string;
  /** The measured change, e.g. "1.64 → 8.72". */
  measurement: string;
  /** The Figma-faithful rendering, built from `className` only. */
  asDrawn: ReactNode;
  /** What the component actually ships. */
  shipped: ReactNode;
  /** Why the difference exists. */
  reason: string;
}

function FidelityRow({
  registerNumber,
  difference,
  criterion,
  measurement,
  asDrawn,
  shipped,
  reason,
}: FidelityRowProps) {
  return (
    <div className="border-line-subtle grid gap-3 border-b py-5 last:border-b-0">
      <div className="text-body text-content-primary font-medium">
        {registerNumber}. {difference}
      </div>
      <div className="flex flex-wrap items-start gap-10">
        <div className="grid w-56 gap-2">
          <div className="text-caption text-content-secondary">As drawn in Figma</div>
          {asDrawn}
        </div>
        <div className="grid w-56 gap-2">
          <div className="text-caption text-content-secondary">Shipped</div>
          {shipped}
        </div>
      </div>
      <div className="text-caption text-content-secondary">
        <strong className="text-content-primary">{measurement}</strong> · {criterion} — {reason}
      </div>
    </div>
  );
}

export const DesignFidelity: Story = {
  name: 'Design fidelity',
  parameters: {
    docs: {
      description: {
        story:
          'Input contributes **three** rows to the register: two changes and one addition. ' +
          'It also *extends* two rows Button already established — the neutral focus ring ' +
          '(row 7) and cyan never carrying text (row 3) — rather than minting duplicates, ' +
          'because a row is a decision, not an occurrence.',
      },
    },
  },
  render: () => (
    <div className="max-w-4xl">
      <FidelityRow
        registerNumber={8}
        difference="Placeholder and value both shift one ramp step"
        criterion="SC 1.4.3"
        measurement="1.64 → 8.72"
        reason="The drawn placeholder (neutral-400) is unreadable on white. Darkening it alone would make it identical to the value and erase the empty/filled distinction, so both move one step and the design's relationship survives."
        asDrawn={
          <Input
            label="Email address"
            placeholder="you@example.com"
            className="[&_input]:text-[#4B4B4B] [&_input]:placeholder:text-[#CACACA]"
          />
        }
        shipped={<Input label="Email address" placeholder="you@example.com" />}
      />

      <FidelityRow
        registerNumber={9}
        difference="A resting field is identifiable by more than its border"
        criterion="SC 1.4.11"
        measurement="1.31 / 1.64 ❌"
        reason="line-subtle measures 1.31:1 and the hover border 1.64:1 against a 3.0 bar, so a field outlined alone is not perceivable. The required visible label carries identification instead. line-danger is the exception — 3.47:1, so an errored field does clear it unaided."
        asDrawn={<Input label="Email address" labelHidden placeholder="Email address" />}
        shipped={<Input label="Email address" placeholder="you@example.com" />}
      />

      <FidelityRow
        registerNumber={10}
        difference="A visible label — an addition, not a change"
        criterion="SC 3.3.2"
        measurement="—"
        reason="The design draws no label anywhere on the page, the same way it drew no focus state for Button. A placeholder is not a label: it disappears on input, it fails voice control, and it is invisible to page translation. The label is required at the type level so a nameless field cannot compile."
        asDrawn={<Input label="Email address" labelHidden placeholder="Email address" />}
        shipped={<Input label="Email address" placeholder="you@example.com" />}
      />
    </div>
  ),
};

/* ── Playground ───────────────────────────────────────────────────────────── */

export const Playground: Story = {};

/* ── Sizes ────────────────────────────────────────────────────────────────── */

export const Small: Story = { args: { size: 'sm' } };
export const Medium: Story = { args: { size: 'md' } };
export const Large: Story = { args: { size: 'lg' } };

export const AllSizes: Story = {
  name: 'All sizes',
  parameters: {
    docs: {
      description: {
        story:
          'Field heights are 24 / 36 / 40 px. Note that the help text does **not** track the ' +
          'field scale: Large and Medium are both Body 14/22, and only Small drops to Caption ' +
          '12/18. That comes from the `space` annotation section, not from any variant property.',
      },
    },
  },
  render: (args) => (
    <div className="flex w-80 flex-col gap-6">
      <Input {...args} size="sm" label="Small" hint="Caption help text" />
      <Input {...args} size="md" label="Medium" hint="Body help text" />
      <Input {...args} size="lg" label="Large" hint="Body help text — not Subtitle" />
    </div>
  ),
};

/* ── States ───────────────────────────────────────────────────────────────── */

export const WithHint: Story = {
  name: 'With hint',
  args: { label: 'Password', hint: 'At least 8 characters.', placeholder: '' },
};

export const ErrorState: Story = {
  name: 'Error',
  args: {
    label: 'Email address',
    error: 'Enter a valid email address.',
    defaultValue: 'not-an-email',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The presence of `error` alone sets `aria-invalid` and the danger border. The error ' +
          'region is always in the DOM with `role="alert"` and only its content toggles, ' +
          'because screen readers announce a live region’s content changes reliably but ' +
          'vary on a region that appears already-populated.',
      },
    },
  },
};

export const HintAndError: Story = {
  name: 'Hint and error together',
  args: {
    label: 'Password',
    hint: 'At least 8 characters.',
    error: 'That password is too short.',
    defaultValue: 'abc',
    placeholder: '',
  },
  parameters: {
    docs: {
      description: {
        story:
          '`aria-describedby` lists the hint **before** the error, so a screen-reader user ' +
          'hears the rule and then how they broke it.',
      },
    },
  },
};

export const Disabled: Story = {
  args: { label: 'Email address', disabled: true, defaultValue: 'a@b.com' },
  parameters: {
    docs: {
      description: {
        story:
          'Uses the **native** attribute, deliberately unlike `Button`, which uses ' +
          '`aria-disabled`. Under `aria-disabled` an input’s value still submits with the ' +
          'form — a data bug rather than an accessibility inconvenience. Button’s ' +
          'discoverability argument does not travel here, because a field always has a ' +
          'visible label. Check the Actions panel: the control is out of the tab order.',
      },
    },
  },
};

export const Focus: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Tab into the field. Focus is **two** things at once: a cyan `line-focus` inner ' +
          'border, which is what the design draws, and a neutral `focus-strong` outline at 2px ' +
          'offset, which is what actually satisfies SC 1.4.11 — cyan measures 2.12:1 against a ' +
          '3.0 bar. The design’s other affordance, a 16%-alpha cyan halo, is not shipped; ' +
          'its token was removed rather than left unused.',
      },
    },
  },
  render: (args) => (
    <div className="flex w-80 flex-col gap-4">
      <button type="button" className="text-body text-content-secondary self-start underline">
        Tab from here
      </button>
      <Input {...args} label="Email address" />
      <Input {...args} label="Email address (invalid)" error="The error border outranks focus." />
    </div>
  ),
};

export const EveryState: Story = {
  name: 'Every state',
  parameters: {
    docs: {
      description: {
        story:
          'The five states the Figma `State` axis draws — Default, Hover, Pressed & Focus, ' +
          'Error, Disabled — none of which is a prop. Hover and focus are shown by ' +
          'interacting; the other three are rendered.',
      },
    },
  },
  render: (args) => (
    <div className="flex w-80 flex-col gap-6">
      <Input {...args} label="Default" />
      <Input {...args} label="Filled" defaultValue="a@b.com" />
      <Input {...args} label="Error" defaultValue="not-an-email" error="Enter a valid address." />
      <Input {...args} label="Disabled" defaultValue="a@b.com" disabled />
    </div>
  ),
};

/* ── Slots ────────────────────────────────────────────────────────────────── */

function SearchIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 12l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export const WithIcons: Story = {
  name: 'With icons',
  parameters: {
    docs: {
      description: {
        story:
          'Icons are 18 / 16 / 14 px by size and are hidden from the accessible name — the ' +
          'label carries it. `startIcon` and `endIcon` are named logically rather than ' +
          'physically, so they survive RTL.',
      },
    },
  },
  render: (args) => (
    <div className="flex w-80 flex-col gap-6">
      <Input {...args} label="Search products" startIcon={<SearchIcon />} placeholder="Search" />
      <Input {...args} label="Search products" endIcon={<SearchIcon />} placeholder="Search" />
    </div>
  ),
};

export const WithAffixes: Story = {
  name: 'With prefix and suffix',
  parameters: {
    docs: {
      description: {
        story:
          'The **inline** affix treatment from the `Prefix & Suffix` set — a unit or symbol ' +
          'inside the field’s own padding. The standalone `Prefix` / `Suffix` sets draw ' +
          'something different: a *filled addon segment* with its own surface and corner ' +
          'radius. That is an input group, and it belongs in its own component rather than a ' +
          'prop on this one; it is extracted and specified in `docs/decisions.md`, not shipped.',
      },
    },
  },
  render: (args) => (
    <div className="flex w-80 flex-col gap-6">
      <Input {...args} label="Amount" prefix="¥" placeholder="0.00" />
      <Input {...args} label="Amount" suffix="CNY" placeholder="0.00" />
      <Input {...args} label="Amount" prefix="¥" suffix="CNY" placeholder="0.00" />
    </div>
  ),
};

function ClearableExample() {
  const [value, setValue] = useState('Running shoes');
  return (
    <Input
      label="Search products"
      value={value}
      clearable
      placeholder="Search"
      onChange={(event) => setValue(event.target.value)}
      onClear={() => setValue('')}
    />
  );
}

export const Clearable: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The clear control is the only **nested interactive control** in this library, and ' +
          'the design models it in more detail than anything else on the page — 117 of the 237 ' +
          'components exist to draw it. It appears only when there is something to clear, it ' +
          'sits after the field in the DOM so tab order matches reading order, its glyph ' +
          'follows the drawn 16/14/12 while its **target** is floored at 24px for SC 2.5.8, ' +
          'and activating it returns focus to the field — without that, focus would fall to ' +
          '`<body>` the moment the button unmounts. Its name says *what* it clears.',
      },
    },
  },
  render: () => (
    <div className="w-80">
      <ClearableExample />
    </div>
  ),
};

export const HiddenLabel: Story = {
  name: 'Hidden label',
  args: { label: 'Search products', labelHidden: true, placeholder: 'Search' },
  parameters: {
    docs: {
      description: {
        story:
          'For fields whose purpose is obvious from context — a toolbar search, a filter row. ' +
          'The label is `sr-only`, never `display: none`, so it stays in the accessibility ' +
          'tree. This is **not** a tidier default: a visible label is the only version that ' +
          'also works for voice-control users, who speak what they see.',
      },
    },
  },
};

/* ── Edge cases ───────────────────────────────────────────────────────────── */

export const LongContent: Story = {
  name: 'Long content',
  parameters: {
    docs: {
      description: {
        story: 'Long labels, hints and errors wrap; the field keeps its height and geometry.',
      },
    },
  },
  render: (args) => (
    <div className="w-72">
      <Input
        {...args}
        label="Enter the email address associated with your account"
        hint="We will send a password reset link to this address. It expires after one hour."
        error="That address is already registered. Sign in instead, or use a different address."
        defaultValue="a-very-long-email-address@a-very-long-domain-name.example.com"
      />
    </div>
  ),
};
