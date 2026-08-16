import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { Button } from '../Button';
import { Dialog } from './Dialog';
import type { DialogProps } from './Dialog';

/**
 * Story titles mirror the Figma section taxonomy. The Dialog page sits under
 * **Feedback**, which the file's Overview page defines as "displaying reaction to user's
 * operation or system process". Grouping differently from Figma is how design and
 * engineering start describing the same component two ways.
 */
const meta = {
  title: 'Feedback/Dialog',
  component: Dialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The system modal, built on the native `<dialog>` element and `showModal()`. Focus ' +
          'trapping, focus restoration, Escape, top-layer rendering and background inertness ' +
          'come from the platform rather than from us — the same choice `Button` made in using ' +
          'a real `<button>`.\n\n' +
          'The Figma page draws four top-level frames, and they are **not four values of one ' +
          'axis**. `Warning` is a semantic difference (`role="alertdialog"`, per prose calling ' +
          'it "an urgent interruption … users need to acknowledge it"). `With divider` is a ' +
          'presentational choice that also re-spaces the dialog. And `Scrollable` is not a prop ' +
          'at all — its own prose is conditional ("**if** the dialog content overflows"), so it ' +
          "is a max-height and `overflow-y: auto`, exactly as `Input`'s `Text Entered` axis " +
          'turned out to be runtime.\n\n' +
          '`size` changes the **width only** — 400 / 600 / 900. Every other measure is ' +
          'identical at all three, which is the single most useful thing the four `Space` ' +
          'sections say.',
      },
    },
  },
  argTypes: {
    open: { control: false, description: 'Controlled. There is deliberately no `defaultOpen`.' },
    onOpenChange: {
      control: false,
      description: 'A close *request* — nothing closes until `open` changes.',
    },
    title: {
      control: 'text',
      description: 'Required. The accessible name, via `aria-labelledby`.',
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
      description: '400 / 600 / 900px. Width only.',
    },
    tone: {
      control: 'inline-radio',
      options: ['default', 'warning'],
      description: '`warning` adds the glyph and switches the role to `alertdialog`.',
    },
    dividers: { control: 'boolean', description: 'Re-spaces the dialog to a uniform 16px rhythm.' },
    closeOnBackdropClick: {
      control: 'boolean',
      description: 'Defaults to true, and to **false** at the warning tone.',
    },
    closeLabel: { control: 'text' },
    footer: { control: false },
    children: { control: false },
    initialFocusRef: { control: false },
  },
  args: {
    // Declared, but never the source of truth. `open` is required on the component —
    // the API is controlled and has no `defaultOpen` — so the story type demands it;
    // every story below drives it from `DialogDemo`'s own state, because a dialog
    // toggled from a Storybook control has no trigger to restore focus to, and focus
    // restoration is half of what this component exists to get right.
    open: false,
    title: 'Delete file?',
    size: 'md',
    tone: 'default',
    dividers: false,
    onOpenChange: fn(),
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Every story needs a trigger, and not only for convenience: focus restoration is one of
 * the behaviours this component exists to get right, and it has nothing to return focus
 * to without a real control to return it to. Open one, press Escape, and the trigger
 * should be focused again.
 */
function DialogDemo({
  triggerLabel = 'Open dialog',
  ...props
}: Partial<DialogProps> & { triggerLabel?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <Dialog
        title="Delete file?"
        {...props}
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          props.onOpenChange?.(next);
        }}
      >
        {props.children ?? 'Some contents… Some contents…'}
      </Dialog>
    </>
  );
}

const CancelConfirm = (
  <>
    <Button variant="ghost">Cancel</Button>
    <Button>Confirm</Button>
  </>
);

/* ── Design fidelity ──────────────────────────────────────────────────────── */

interface FidelityRowProps {
  registerNumber: number;
  difference: string;
  criterion: string;
  measurement: string;
  asDrawn: ReactNode;
  shipped: ReactNode;
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
        {registerNumber}. {difference} <span className="text-content-secondary">(extended)</span>
      </div>
      <div className="flex flex-wrap items-start gap-10">
        <div data-a11y-accepted-contrast className="grid w-56 gap-2">
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

/** The drawn close control: a 14px glyph with no target around it. */
function CloseGlyph({ target }: { target: number }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="border-line-focus inline-flex items-center justify-center border border-dashed"
        style={{ width: target, height: target }}
      >
        <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" className="size-3.5">
          <path d="M3 3l8 8m0-8l-8 8" stroke="#8E8E8E" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-caption text-content-secondary">
        {target}×{target}
      </span>
    </div>
  );
}

export const DesignFidelity: Story = {
  name: 'Design fidelity',
  parameters: {
    docs: {
      description: {
        story:
          'Dialog contributes **no new rows** to the register — the sequence across the four ' +
          'components is seven, zero, three, zero. Every difference it does carry is a decision ' +
          'an earlier component already made, extended rather than duplicated, because a row is ' +
          'a decision and not an occurrence.\n\n' +
          'Four other differences are deliberately **not** register rows, and the reasoning is ' +
          'worth stating because each one looks like a divergence:\n\n' +
          '- **The dark-mode border** — Figma has no dark mode, so there is nothing to diverge ' +
          "from. It discharges the token layer's elevation obligation instead.\n" +
          "- **A max-height instead of the drawn fixed 400px** — the Scrollable page's own " +
          'prose makes scrolling conditional on overflow, so this *is* the design intent.\n' +
          '- **The divider at `line-subtle`** where Figma draws `neutral-200` — a shared-token ' +
          'decision (docs/tokens.md), one ramp step *more* visible, and nothing turns on it.\n' +
          '- **The close glyph at `content-secondary`** where Figma draws `neutral-500` — this ' +
          "reuses the 500 → 600 AA remap Input's affix already applied, which added no row.",
      },
    },
  },
  render: () => (
    <div className="max-w-4xl">
      <FidelityRow
        registerNumber={6}
        difference="The close control has a 24×24 target"
        criterion="SC 2.5.8"
        measurement="14 → 24 px"
        reason="Figma reports the size of the artwork, not a specification of how big the thing you press should be. The glyph stays 14px and the target is floored at 24 — the same decision the link-style button's height and Input's clear control already took."
        asDrawn={<CloseGlyph target={14} />}
        shipped={<CloseGlyph target={24} />}
      />

      <FidelityRow
        registerNumber={1}
        difference="The confirming action carries a dark label"
        criterion="SC 1.4.3"
        measurement="2.12 → 7.78"
        reason="White on the brand cyan measures 2.12:1 against a 4.5:1 requirement, and no step of the ramp is dark enough to fix it. The cyan itself is untouched."
        asDrawn={
          <Button className="text-[#FFFFFF]" tabIndex={-1}>
            Confirm
          </Button>
        }
        shipped={<Button tabIndex={-1}>Confirm</Button>}
      />

      <FidelityRow
        registerNumber={7}
        difference="There is a focus state"
        criterion="SC 1.4.11"
        measurement="15.79–16.48"
        reason="An addition, not a change: the file draws no focus state anywhere, and a keyboard user has to see which control they are on. Tab to the button on the right to see it."
        asDrawn={
          <Button variant="outline" className="focus-visible:outline-none" tabIndex={-1}>
            No ring
          </Button>
        }
        shipped={<Button variant="outline">Focus me</Button>}
      />
    </div>
  ),
};

/* ── The four Figma frames ────────────────────────────────────────────────── */

export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The base. Focus lands on **Confirm**, not on the close control — the close is first ' +
          'in DOM order because the design puts it in the title row, and landing there tells a ' +
          'keyboard user only how to leave.',
      },
    },
  },
  render: (args) => <DialogDemo {...args} footer={CancelConfirm} />,
};

export const Warning: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A semantic difference rather than a colour. It renders `role="alertdialog"`, and ' +
          'clicking the scrim does **not** dismiss it — the page prose says users "need to ' +
          'acknowledge it to close dialog box". Escape still works, which the APG keeps on ' +
          '`alertdialog`.\n\n' +
          'The amber glyph is `aria-hidden`, and that is load-bearing rather than incidental: ' +
          'it measures 1.87 on this surface, which is only acceptable because SC 1.4.11 governs ' +
          'graphics *required* to understand the content. The body text, the destructive action ' +
          'and the role all carry the meaning instead.',
      },
    },
  },
  args: { tone: 'warning', title: 'Delete file?' },
  render: (args) => (
    <DialogDemo
      {...args}
      triggerLabel="Delete file"
      footer={
        <>
          <Button variant="ghost">Cancel</Button>
          <Button variant="outline" tone="danger">
            Delete
          </Button>
        </>
      }
    >
      This file will be permanently removed. This cannot be undone.
    </DialogDemo>
  ),
};

export const WithDividers: Story = {
  name: 'With dividers',
  parameters: {
    docs: {
      description: {
        story:
          'Not additive. The rules come with a **different spacing rhythm** — a uniform 16px ' +
          'where the base dialog runs 24 / 16 / 32 / 24 — which is why this is a real `cva` ' +
          'variant rather than an `after:` pseudo-element: a pseudo-element could draw the ' +
          'lines but could not move the padding, and the two would drift apart.',
      },
    },
  },
  args: { dividers: true, title: 'Terms of service' },
  render: (args) => (
    <DialogDemo
      {...args}
      triggerLabel="Review terms"
      footer={
        <>
          <Button variant="ghost">Cancel</Button>
          <Button>Save</Button>
        </>
      }
    >
      Some contents… Some contents…
    </DialogDemo>
  ),
};

export const Scrollable: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '**Not a prop.** The Figma page draws this as a separate frame, but its prose is ' +
          'conditional — 若对话框内容溢出 ("if the dialog content overflows") — so it is what ' +
          'happens at runtime when the body exceeds the available height. The scroll boundary ' +
          'is the body alone: the title and the actions stay in view, which is what a reader of ' +
          'a long dialog needs.',
      },
    },
  },
  args: { title: 'Release notes' },
  render: (args) => (
    <DialogDemo
      {...args}
      triggerLabel="Read release notes"
      footer={
        <>
          <Button variant="ghost">Disagree</Button>
          <Button>Agree</Button>
        </>
      }
    >
      {Array.from({ length: 30 }, (_, index) => (
        <p key={index} className="mb-2">
          Some contents… ({index + 1} of 30)
        </p>
      ))}
    </DialogDemo>
  ),
};

/* ── Sizes and states ─────────────────────────────────────────────────────── */

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '400 / 600 / 900px. **Width only** — padding, the 26px title row, the 36px footer, ' +
          'the 98px buttons, the 14px close glyph and the 16px warning icon are identical at ' +
          'every step. A reader assuming `size` is a uniform scale would get both ends wrong.',
      },
    },
  },
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      <DialogDemo {...args} size="sm" triggerLabel="Small — 400px" footer={CancelConfirm} />
      <DialogDemo {...args} size="md" triggerLabel="Medium — 600px" footer={CancelConfirm} />
      <DialogDemo {...args} size="lg" triggerLabel="Large — 900px" footer={CancelConfirm} />
    </div>
  ),
};

export const WithoutActions: Story = {
  name: 'Without actions',
  parameters: {
    docs: {
      description: {
        story:
          'No `footer`, so no footer element is rendered at all. With nothing else focusable, ' +
          'focus falls to the **dialog itself** rather than to `<body>` — a user left on the ' +
          'body is stranded outside an inert page with nothing announced.',
      },
    },
  },
  args: { title: 'Saved' },
  render: (args) => (
    <DialogDemo {...args} triggerLabel="Show confirmation">
      Your changes have been saved.
    </DialogDemo>
  ),
};

export const NotDismissible: Story = {
  name: 'Not dismissible by the scrim',
  parameters: {
    docs: {
      description: {
        story:
          '`closeOnBackdropClick={false}` on the default tone, for a flow that must be resolved ' +
          'rather than escaped. Escape and the close control still work — a dialog with no way ' +
          'out at all is a trap, not a safeguard.',
      },
    },
  },
  args: { closeOnBackdropClick: false, title: 'Finish setting up' },
  render: (args) => (
    <DialogDemo {...args} triggerLabel="Continue setup" footer={<Button>Continue</Button>}>
      Clicking outside will not dismiss this.
    </DialogDemo>
  ),
};

/* ── Edge cases ───────────────────────────────────────────────────────────── */

export const LongTitle: Story = {
  name: 'Edge case — long title',
  parameters: {
    docs: {
      description: {
        story:
          'The title wraps and the close control stays where it belongs, because the header is ' +
          '`items-start` rather than centred: centring would drift the close down the block as ' +
          'the title grows. The accessible name of the close control grows with it too.',
      },
    },
  },
  args: {
    size: 'sm',
    title: 'Delete every file in this workspace, including the ones shared with other people?',
  },
  render: (args) => (
    <DialogDemo {...args} triggerLabel="Long title" footer={CancelConfirm}>
      This cannot be undone.
    </DialogDemo>
  ),
};

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Every control, on one dialog. `open` is driven by the trigger rather than by a control.',
      },
    },
  },
  render: (args) => <DialogDemo {...args} footer={CancelConfirm} />,
};
