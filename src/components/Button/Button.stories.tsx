import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import {
  ACCEPTED_CONTRAST_ATTRIBUTE,
  CONTENT_DANGER_ON_WHITE,
  storyAcceptedContrast,
  storyRendersFigmaAsDrawn,
} from '../../../a11y.config';
import { Button } from './Button';

/** Shared decision, narrowed to a marked wrapper. See a11y.config.ts. */
const BUTTON_DANGER_EXEMPTION = {
  ...CONTENT_DANGER_ON_WHITE,
  exemptSelector: `[${ACCEPTED_CONTRAST_ATTRIBUTE}]`,
};

/**
 * Story titles mirror the Figma section taxonomy — Button lives under **General**,
 * whose Overview page defines it as "the Visual Language foundation of a system".
 * The grouping is a design-system decision, not an organisational preference: if
 * Storybook groups differently from Figma, design and engineering start describing
 * the same component two ways, which is the fragmentation a design system exists to
 * prevent.
 */
const meta = {
  title: 'General/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The system button. Emphasis (`variant`) and intent (`tone`) are orthogonal axes, ' +
          'mirroring the two parallel frames in the Figma file. Accessibility is built in: ' +
          '`type="button"` by default, `aria-disabled` rather than the native attribute so the ' +
          'control stays discoverable by keyboard, and icons hidden from the accessible name.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['primary', 'outline', 'ghost', 'link'],
      description: 'Emphasis.',
    },
    tone: {
      control: 'inline-radio',
      options: ['accent', 'danger'],
      description: 'Intent. Danger is a tone, not a variant — it applies across all variants.',
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
      description: 'Small / Medium / Large in the Figma file.',
    },
    disabled: {
      control: 'boolean',
      description: 'Renders `aria-disabled`; the control stays focusable and announced.',
    },
    loading: { control: 'boolean', description: 'Renders `aria-busy` and blocks activation.' },
    loadingLabel: { control: 'text', description: 'Text alternative for the spinner.' },
    children: { control: 'text' },
    startIcon: { control: false },
    endIcon: { control: false },
  },
  args: {
    children: 'Button',
    variant: 'primary',
    tone: 'accent',
    size: 'md',
    disabled: false,
    loading: false,
    // An explicit spy, not the old `argTypesRegex: '^on[A-Z].*'` auto-detection —
    // that was deprecated in Storybook 8 and removed in 9. Being explicit also
    // makes the handler usable from a play function later.
    //
    // It is doing real work in the Disabled and Loading stories: the Actions panel
    // staying empty is the visible proof that activation is suppressed, which is
    // otherwise an invisible behaviour in a static screenshot.
    onClick: fn(),
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

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

/* ── Design fidelity ──────────────────────────────────────────────────────── */

interface FidelityRowProps {
  /** Position in the register in docs/design-fidelity.md, so the two can be read together. */
  registerNumber: number;
  /** What differs, in one phrase. */
  difference: string;
  /** The WCAG success criterion this turns on. */
  criterion: string;
  /** The measured change, e.g. "2.12 → 7.78". */
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
        {/*
          Marked so axe's color-contrast rule skips this cell and this cell only. The
          column renders values the token layer deliberately rejects; the Shipped column
          beside it stays checked. See a11y.config.ts.
        */}
        <div data-a11y-accepted-contrast className="grid gap-2">
          <div className="text-caption text-content-secondary">As drawn in Figma</div>
          {asDrawn}
        </div>
        <div className="grid gap-2">
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

/**
 * Every place the shipped button differs from the mock, side by side, with the
 * measured contrast ratio and the WCAG criterion each one turns on.
 *
 * The Figma-faithful side is rendered through the `className` escape hatch alone —
 * no props, no variants, nothing exported. It is a documentation artefact, not an
 * API. Full reasoning in `docs/design-fidelity.md`.
 */
export const DesignFidelity: Story = {
  name: 'Design fidelity',
  parameters: storyRendersFigmaAsDrawn(
    'Seven differences: six changes and one addition. Each was the smallest change ' +
      'that clears a specific WCAG criterion, and each is fixed in the semantic token ' +
      'layer — every primitive still matches its Figma node exactly.'
  ),
  render: () => (
    <div className="max-w-3xl">
      <FidelityRow
        registerNumber={1}
        difference="Label on the filled buttons"
        criterion="SC 1.4.3"
        measurement="2.12 → 7.78"
        reason="White on the brand cyan is unreadable, and no step of the ramp is dark enough to fix it. The cyan itself is untouched."
        asDrawn={<Button className="text-white">Button</Button>}
        shipped={<Button>Button</Button>}
      />
      <FidelityRow
        registerNumber={2}
        difference="Link-style button"
        criterion="SC 1.4.1"
        measurement="colour-only → underlined"
        reason="In the file a link is distinguished by colour alone, which fails for a reader with a colour vision deficiency. The underline is present at rest, not only on hover."
        asDrawn={
          <Button variant="link" className="text-content-accent no-underline">
            Read more
          </Button>
        }
        shipped={<Button variant="link">Read more</Button>}
      />
      <FidelityRow
        registerNumber={3}
        difference="Outline label, hovered"
        criterion="SC 1.4.3"
        measurement="1.88 → 15.12"
        reason="Shown in its hovered state. The design turns the label cyan; we darken it instead and leave the cyan on the border, where it is not text."
        asDrawn={
          <Button variant="outline" className="border-accent-solid-hover text-content-accent">
            Button
          </Button>
        }
        shipped={
          <Button variant="outline" className="border-accent-solid-hover text-content-primary">
            Button
          </Button>
        }
      />
      <FidelityRow
        registerNumber={4}
        difference="Danger label across states"
        criterion="SC 1.4.3"
        measurement="2.98 → 4.21"
        reason="Shown hovered. Red is kept — it is a warning, not decoration — but pinned to the darkest step instead of tracking the ramp, so one already-accepted exception covers all three states."
        asDrawn={
          <Button variant="outline" tone="danger" className="text-danger-solid-hover">
            Delete
          </Button>
        }
        shipped={
          <Button variant="outline" tone="danger">
            Delete
          </Button>
        }
      />
      <FidelityRow
        registerNumber={5}
        difference="Danger ghost background, pressed"
        criterion="SC 1.4.11"
        measurement="2.97 → 3.69"
        reason="Shown pressed. One ramp step lighter, because the drawn value put the label below even the 3:1 floor. (The faithful side borrows danger-solid-disabled, which resolves to the same danger-300.)"
        asDrawn={
          <Button variant="ghost" tone="danger" className="bg-danger-solid-disabled">
            Delete
          </Button>
        }
        shipped={
          <Button variant="ghost" tone="danger" className="bg-danger-subtle-active">
            Delete
          </Button>
        }
      />
      <FidelityRow
        registerNumber={6}
        difference="Link-style target height"
        criterion="SC 2.5.8"
        measurement="18px → 24px"
        reason="A Figma frame height is the text's bounding box, not a target specification. Link has no background, so the larger target is invisible."
        asDrawn={
          <Button variant="link" size="sm" className="min-h-0">
            Read more
          </Button>
        }
        shipped={
          <Button variant="link" size="sm">
            Read more
          </Button>
        }
      />
      <FidelityRow
        registerNumber={7}
        difference="Focus state — an addition, not a change"
        criterion="SC 1.4.11"
        measurement="none → 15.79"
        reason="The file draws no focus state. It cannot be the brand cyan, which is far below the 3:1 an indicator needs, so the ring is neutral. Shown forced on; normally it appears on keyboard focus only."
        asDrawn={<Button className="outline-none">Button</Button>}
        shipped={
          <Button className="outline-focus-strong outline-2 outline-offset-2">Button</Button>
        }
      />
    </div>
  ),
};

/* ── Playground ───────────────────────────────────────────────────────────── */

export const Playground: Story = {};

/* ── Variants ─────────────────────────────────────────────────────────────── */

export const Primary: Story = { args: { variant: 'primary' } };
export const Outline: Story = { args: { variant: 'outline' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Link: Story = { args: { variant: 'link' } };

export const AllVariants: Story = {
  name: 'All variants',
  render: (args) => (
    <div className="flex flex-wrap items-center gap-4">
      <Button {...args} variant="primary">
        Primary
      </Button>
      <Button {...args} variant="outline">
        Outline
      </Button>
      <Button {...args} variant="ghost">
        Ghost
      </Button>
      <Button {...args} variant="link">
        Link
      </Button>
    </div>
  ),
};

/* ── Tones ────────────────────────────────────────────────────────────────── */

export const DangerTone: Story = {
  name: 'Danger tone',
  parameters: storyAcceptedContrast(
    BUTTON_DANGER_EXEMPTION,
    'Danger is a **tone**, not a variant: it applies across all four variants, exactly ' +
      'as the Figma file models it with a parallel "Danger Button" frame.'
  ),
  render: (args) => (
    // Marked because the non-solid danger labels carry the recorded 4.21 exemption. The
    // solid variant inside is NOT exempt in principle (7.78) — it sits here only because
    // the four belong together visually; every other story on this page stays fully checked.
    <div data-a11y-accepted-contrast className="flex flex-wrap items-center gap-4">
      <Button {...args} tone="danger" variant="primary">
        Delete
      </Button>
      <Button {...args} tone="danger" variant="outline">
        Delete
      </Button>
      <Button {...args} tone="danger" variant="ghost">
        Delete
      </Button>
      <Button {...args} tone="danger" variant="link">
        Delete
      </Button>
    </div>
  ),
};

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
          'Small / Medium / Large map to `sm` / `md` / `lg`. The Storybook taxonomy follows ' +
          'Figma because designers navigate it; the prop values follow ecosystem convention ' +
          'because developers type them.',
      },
    },
  },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-4">
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
    </div>
  ),
};

/* ── States ───────────────────────────────────────────────────────────────── */

export const Disabled: Story = {
  args: { disabled: true },
  parameters: {
    docs: {
      description: {
        story:
          'Renders `aria-disabled`, **not** the native `disabled` attribute. The native one ' +
          'removes the control from the tab order, so a keyboard or screen-reader user never ' +
          'discovers it exists or why it is unavailable.\n\n' +
          '**Check it in ten seconds:** tab to it — it takes focus — then click it, and press ' +
          'Enter and Space. The **Actions** panel stays empty. That emptiness is the ' +
          'guarantee: the control is reachable and announced, and activation is suppressed. ' +
          'A disabled button that still fires its handler looks identical to one that does ' +
          'not, so this is the only way to see the difference without reading a test.',
      },
    },
  },
};

export const Loading: Story = {
  args: { loading: true },
  parameters: {
    docs: {
      description: {
        story:
          'Sets `aria-busy`, swaps the leading icon for a spinner, and blocks activation. The ' +
          'spinner is hidden from assistive technology and paired with a visually hidden text ' +
          'alternative. The animation is wrapped in `motion-safe`, so it does not spin for a ' +
          'reader who has asked for reduced motion.\n\n' +
          '**Check it in ten seconds:** click it, and press Enter and Space. The **Actions** ' +
          'panel stays empty — a request in flight cannot be fired twice by an impatient ' +
          'second click.',
      },
    },
  },
};

export const Focus: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The Figma file has no focus state, so this one is ours. It cannot be the brand ' +
          'cyan, which measures 1.88–2.12 against the 3.0 SC 1.4.11 requires — the ring is ' +
          'neutral and clears 15.79 on every surface a button sits on. The first two are ' +
          'forced on; tab to the third to see it for real.',
      },
    },
  },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-4">
      <Button {...args} className="outline-focus-strong outline-2 outline-offset-2">
        Focused
      </Button>
      <Button
        {...args}
        variant="outline"
        className="outline-focus-strong outline-2 outline-offset-2"
      >
        Focused
      </Button>
      <Button {...args}>Tab to me</Button>
    </div>
  ),
};

export const EveryState: Story = {
  name: 'Every state',
  render: (args) => (
    <div className="grid gap-4">
      {(['primary', 'outline', 'ghost', 'link'] as const).map((variant) => (
        <div key={variant} className="flex flex-wrap items-center gap-4">
          <Button {...args} variant={variant}>
            Default
          </Button>
          <Button {...args} variant={variant} disabled>
            Disabled
          </Button>
          <Button {...args} variant={variant} loading>
            Loading
          </Button>
          <Button
            {...args}
            variant={variant}
            className="outline-focus-strong outline-2 outline-offset-2"
          >
            Focus
          </Button>
        </div>
      ))}
    </div>
  ),
};

/* ── Icons ────────────────────────────────────────────────────────────────── */

export const WithIcons: Story = {
  name: 'With icons',
  parameters: {
    docs: {
      description: {
        story:
          'Icons are named `startIcon` / `endIcon` rather than left/right: logical properties ' +
          'survive RTL. The component wraps them and hides them from the accessible name ' +
          'itself, so a decorative glyph cannot leak into the label by accident.',
      },
    },
  },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-4">
      <Button {...args} startIcon={<PlusIcon />}>
        Start icon
      </Button>
      <Button {...args} endIcon={<PlusIcon />}>
        End icon
      </Button>
    </div>
  ),
};

/* ── Edge cases ───────────────────────────────────────────────────────────── */

export const LongLabel: Story = {
  name: 'Edge case: a very long label',
  parameters: {
    docs: {
      description: {
        story:
          'Height is a minimum rather than the fixed height the file draws, so a long label ' +
          'grows the control instead of overflowing it. The `min-width` from the source ' +
          "still applies, so short labels in a row stay aligned — that is the source's own " +
          '"Min Width" node, not an invention.',
      },
    },
  },
  render: (args) => (
    <div className="grid max-w-md gap-4">
      <Button {...args}>
        Save this document and every attachment associated with it to the archive
      </Button>
      <div className="flex flex-wrap items-center gap-2">
        <Button {...args}>OK</Button>
        <Button {...args}>No</Button>
      </div>
    </div>
  ),
};
