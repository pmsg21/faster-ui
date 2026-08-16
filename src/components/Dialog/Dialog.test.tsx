import { useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';

import { Button } from '../Button';
import { Dialog } from './Dialog';
import type { DialogProps, DialogSize } from './Dialog';

/**
 * ── WHAT THIS FILE DOES AND DOES NOT PROVE ──────────────────────────────────
 *
 * jsdom 20 implements no `<dialog>` modal behaviour, and `jest.setup.ts` shims
 * `showModal`/`close` only far enough to mount. Here, `showModal()` is
 * indistinguishable from `<dialog open>` — the non-modal form.
 *
 * So this suite asserts **roles, ARIA wiring, composition and which handler ran**.
 * It asserts nothing about modality, background inertness, focus movement, focus
 * restoration, Escape or `::backdrop`; all of those live in `Dialog.cy.tsx`, which
 * carries a harness check that fails if the shim is ever what is under test.
 *
 * Stating that here rather than only in the setup file is deliberate: the reader most
 * likely to over-trust a green run is the one reading these tests.
 */

const SIZES: DialogSize[] = ['sm', 'md', 'lg'];

function renderDialog(props: Partial<DialogProps> = {}) {
  const onOpenChange = jest.fn();
  const view = render(
    <Dialog open onOpenChange={onOpenChange} title="Delete file?" {...props}>
      {props.children ?? 'This cannot be undone.'}
    </Dialog>
  );
  return { ...view, onOpenChange };
}

const scrimOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="scrim"]')!;
const cardOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="card"]')!;

describe('Dialog — rendering', () => {
  it('renders the title, body and footer', () => {
    renderDialog({ footer: <Button>Confirm</Button> });

    expect(screen.getByRole('heading', { name: 'Delete file?' })).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('omits the footer element entirely when no actions are supplied', () => {
    const { container } = renderDialog();
    expect(container.querySelector('[data-slot="footer"]')).toBeNull();
  });

  it.each(SIZES)('renders at every size (%s)', (size) => {
    const { container } = renderDialog({ size });
    expect(cardOf(container)).toBeInTheDocument();
  });

  it('does not open the underlying element when `open` is false', () => {
    const { container } = renderDialog({ open: false });
    expect(container.querySelector('dialog')!.open).toBe(false);
  });

  it('merges a consumer className onto the card, not the shell', () => {
    const { container } = renderDialog({ className: 'custom-card' });

    expect(cardOf(container)).toHaveClass('custom-card');
    expect(container.querySelector('dialog')).not.toHaveClass('custom-card');
  });
});

describe('Dialog — accessible name and description', () => {
  it('names the dialog from the visible title, by id rather than a duplicated label', () => {
    const { container } = renderDialog();
    const dialog = container.querySelector('dialog')!;
    const heading = screen.getByRole('heading', { name: 'Delete file?' });

    expect(dialog).toHaveAttribute('aria-labelledby', heading.id);
    // A duplicated aria-label is the failure mode this avoids: two sources of the
    // same words, free to drift apart.
    expect(dialog).not.toHaveAttribute('aria-label');
  });

  it('describes the dialog from the body', () => {
    const { container } = renderDialog();
    const dialog = container.querySelector('dialog')!;
    const body = container.querySelector('[data-slot="body"]')!;

    expect(dialog).toHaveAttribute('aria-describedby', body.id);
  });

  it('omits aria-describedby when there is no body', () => {
    const { container } = render(<Dialog open onOpenChange={jest.fn()} title="Nothing to say" />);
    // An empty string is still an attribute pointing at nothing — same reasoning as
    // Input's describedBy assembly.
    expect(container.querySelector('dialog')).not.toHaveAttribute('aria-describedby');
  });

  it('is a dialog by default and an alertdialog when the tone is warning', () => {
    const { container, rerender } = renderDialog();
    // `dialog` is the element's implicit role, so the attribute is absent rather
    // than spelled out.
    expect(container.querySelector('dialog')).not.toHaveAttribute('role');

    rerender(
      <Dialog open onOpenChange={jest.fn()} title="Delete file?" tone="warning">
        This cannot be undone.
      </Dialog>
    );
    expect(container.querySelector('dialog')).toHaveAttribute('role', 'alertdialog');
  });
});

describe('Dialog — the close control', () => {
  it('names what it closes, and takes an override', () => {
    const { rerender } = renderDialog();
    expect(screen.getByRole('button', { name: 'Close Delete file?' })).toBeInTheDocument();

    rerender(
      <Dialog
        open
        onOpenChange={jest.fn()}
        title="Delete file?"
        closeLabel="Dismiss without deleting"
      >
        This cannot be undone.
      </Dialog>
    );
    expect(screen.getByRole('button', { name: 'Dismiss without deleting' })).toBeInTheDocument();
  });

  it('requests a close when activated', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    expect(onOpenChange).toHaveBeenCalledTimes(0);
    await user.click(screen.getByRole('button', { name: 'Close Delete file?' }));
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('is reachable by keyboard', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();
    const close = screen.getByRole('button', { name: 'Close Delete file?' });

    close.focus();
    expect(onOpenChange).toHaveBeenCalledTimes(0);
    await user.keyboard('{Enter}');
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });
});

describe('Dialog — scrim dismissal', () => {
  it('closes on a click that both starts and ends on the scrim', async () => {
    const user = userEvent.setup();
    const { container, onOpenChange } = renderDialog();

    expect(onOpenChange).toHaveBeenCalledTimes(0);
    await user.click(scrimOf(container));
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not close on a click inside the card', async () => {
    const user = userEvent.setup();
    const { container, onOpenChange } = renderDialog();

    expect(onOpenChange).toHaveBeenCalledTimes(0);
    await user.click(cardOf(container));
    expect(onOpenChange).toHaveBeenCalledTimes(0);
  });

  it('does not close when a press begins inside the card and releases on the scrim', async () => {
    const user = userEvent.setup();
    const { container, onOpenChange } = renderDialog();

    // Selecting text and dragging past the edge of the card. Without tracking where
    // the press began, the click lands on the common ancestor and the user loses
    // their dialog for dragging too far.
    await user.pointer([
      { keys: '[MouseLeft>]', target: cardOf(container) },
      { keys: '[/MouseLeft]', target: scrimOf(container) },
    ]);
    expect(onOpenChange).toHaveBeenCalledTimes(0);
  });

  it('does not close on the scrim when the tone is warning', async () => {
    const user = userEvent.setup();
    const { container, onOpenChange } = renderDialog({ tone: 'warning' });

    expect(onOpenChange).toHaveBeenCalledTimes(0);
    await user.click(scrimOf(container));
    // "users need to acknowledge it to close dialog box" — the design's words.
    expect(onOpenChange).toHaveBeenCalledTimes(0);
  });

  it('honours an explicit closeOnBackdropClick in both directions', async () => {
    const user = userEvent.setup();

    const suppressed = renderDialog({ closeOnBackdropClick: false });
    await user.click(scrimOf(suppressed.container));
    expect(suppressed.onOpenChange).toHaveBeenCalledTimes(0);
    suppressed.unmount();

    const forced = renderDialog({ tone: 'warning', closeOnBackdropClick: true });
    expect(forced.onOpenChange).toHaveBeenCalledTimes(0);
    await user.click(scrimOf(forced.container));
    expect(forced.onOpenChange).toHaveBeenCalledTimes(1);
  });
});

describe('Dialog — the warning glyph is decorative, and that is load-bearing', () => {
  it('hides the glyph from the accessibility tree', () => {
    const { container } = renderDialog({ tone: 'warning' });
    const glyph = container.querySelector('[data-slot="icon"]')!;

    // THIS ASSERTION IS THE EXEMPTION. `content-warning` measures 1.87 on the dialog
    // surface and no step of the warning ramp clears 3:1, which is acceptable only
    // because SC 1.4.11 governs graphics *required to understand the content*. Expose
    // the glyph to assistive technology and it is no longer decorative, the criterion
    // applies, and the accepted exemption in a11y.config.ts becomes false.
    expect(glyph).toHaveAttribute('aria-hidden', 'true');
    // The meaning has to be somewhere, and it is in the text.
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('renders no glyph at the default tone', () => {
    const { container } = renderDialog();
    expect(container.querySelector('[data-slot="icon"]')).toBeNull();
  });
});

describe('Dialog — dividers re-space the dialog rather than adding rules', () => {
  it('moves the header and footer padding onto the divider rhythm', () => {
    const { container, rerender } = renderDialog({ footer: <Button>Save</Button> });
    const header = () => container.querySelector('[data-slot="header"]')!;
    const footer = () => container.querySelector('[data-slot="footer"]')!;

    // Basic: 24 top / 16 to the body, then 32 above the footer / 24 below.
    expect(header()).toHaveClass('pt-6', 'pb-4');
    expect(footer()).toHaveClass('pt-8', 'pb-6');
    expect(header()).not.toHaveClass('border-b');

    rerender(
      <Dialog
        open
        onOpenChange={jest.fn()}
        title="Delete file?"
        dividers
        footer={<Button>Save</Button>}
      >
        This cannot be undone.
      </Dialog>
    );

    // With divider: a uniform 16, and the rules are why the rhythm changes.
    expect(header()).toHaveClass('py-4', 'border-b');
    expect(footer()).toHaveClass('py-4', 'border-t');
    expect(header()).not.toHaveClass('pt-6');
  });
});

describe('Dialog — controlled open state', () => {
  it('opens and closes the underlying element as `open` changes', async () => {
    // `userEvent`, not a raw `.click()`. The element is opened from a passive effect,
    // and a bare DOM click is not wrapped in `act()`, so the effect has not run by the
    // time the assertion reads `dialog.open` — the test fails while the component is
    // correct. Worth a comment because the failure looks exactly like a real one.
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            open
          </button>
          <Dialog open={open} onOpenChange={setOpen} title="Delete file?">
            This cannot be undone.
          </Dialog>
        </>
      );
    }
    const { container } = render(<Harness />);
    const dialog = () => container.querySelector('dialog')!;

    expect(dialog().open).toBe(false);
    await user.click(screen.getByRole('button', { name: 'open' }));
    expect(dialog().open).toBe(true);
  });

  it('stays open when the consumer ignores the close request', async () => {
    const user = userEvent.setup();
    const { container, onOpenChange } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Close Delete file?' }));

    // onOpenChange is a REQUEST. A controlled dialog that closed itself would make
    // "are you sure?" impossible without inventing an API for it.
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(container.querySelector('dialog')!.open).toBe(true);
  });
});

describe('Dialog — the cancel handler', () => {
  // Escape ITSELF is not testable here — jsdom fires no `cancel` event, because it has
  // no modal behaviour to cancel. What is testable is the handler that event reaches,
  // by dispatching the event directly. That distinction is the whole point: this proves
  // the component's response is correct, and `Dialog.cy.tsx` proves the browser
  // actually delivers it.
  function fireCancel(dialog: HTMLDialogElement) {
    return dialog.dispatchEvent(new Event('cancel', { cancelable: true, bubbles: false }));
  }

  it('prevents the default close and requests one instead', () => {
    const { container, onOpenChange } = renderDialog();
    const dialog = container.querySelector('dialog')!;

    expect(onOpenChange).toHaveBeenCalledTimes(0);
    const notCancelled = fireCancel(dialog);

    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // preventDefault() was called, so dispatchEvent reports the event as cancelled.
    // Without it the browser closes a controlled dialog behind its owner's back and
    // the element and the prop disagree until the next render re-opens it.
    expect(notCancelled).toBe(false);
    expect(dialog.open).toBe(true);
  });
});

describe('Dialog — page scroll lock', () => {
  const rootOverflow = () => document.documentElement.style.overflow;

  it('locks while open and restores on close', () => {
    const { container, rerender } = renderDialog();

    expect(rootOverflow()).toBe('hidden');

    rerender(
      <Dialog open={false} onOpenChange={jest.fn()} title="Delete file?">
        This cannot be undone.
      </Dialog>
    );

    expect(rootOverflow()).toBe('');
    expect(container.querySelector('dialog')!.open).toBe(false);
  });

  it('restores the lock when unmounted while still open', () => {
    const { unmount } = renderDialog();
    expect(rootOverflow()).toBe('hidden');

    // The path that matters: a dialog removed by a route change rather than closed.
    // Without the cleanup the consumer's page is scroll-locked forever, and nothing
    // on screen explains why.
    unmount();
    expect(rootOverflow()).toBe('');
  });

  it('is ref-counted, so a nested dialog closing does not unlock the page', () => {
    const outer = renderDialog({ title: 'Outer' });
    const inner = renderDialog({ title: 'Inner' });
    expect(rootOverflow()).toBe('hidden');

    inner.unmount();
    expect(rootOverflow()).toBe('hidden');

    outer.unmount();
    expect(rootOverflow()).toBe('');
  });
});

describe('Dialog — initial focus', () => {
  it('accepts an explicit initial focus target', () => {
    function Harness() {
      const inputRef = useRef<HTMLInputElement>(null);
      return (
        <Dialog
          open
          onOpenChange={jest.fn()}
          title="Rename"
          initialFocusRef={inputRef}
          footer={<Button>Save</Button>}
        >
          <label>
            Name
            <input ref={inputRef} />
          </label>
        </Dialog>
      );
    }
    render(<Harness />);

    // Note the scope: this proves the component RESOLVES the target, not that the
    // browser's own focus behaviour was overridden — jsdom has none to override.
    // Dialog.cy.tsx asserts the real thing.
    expect(screen.getByLabelText('Name')).toHaveFocus();
  });

  it('skips the close control, which is first in DOM order', () => {
    renderDialog({ footer: <Button>Confirm</Button> });

    // The design puts the close in the title row, so it is the first focusable thing
    // in the dialog. Landing there tells a keyboard user only how to leave.
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Close Delete file?' })).not.toHaveFocus();
  });

  it('falls back to the dialog itself when nothing inside can take focus', () => {
    const { container } = render(
      <Dialog open onOpenChange={jest.fn()} title="Saved" closeLabel="Close">
        Your changes are safe.
      </Dialog>
    );

    // Not `<body>`. Focus landing on the body strands the user outside an inert page
    // with nothing announced — the same failure Input's clear control had, at a
    // larger scale. The dialog is focusable so the name and description are read.
    const dialog = container.querySelector('dialog')!;
    const close = screen.getByRole('button', { name: 'Close' });
    // The close control is skipped, so with no other candidate the dialog wins.
    expect(close).not.toHaveFocus();
    expect(dialog).toHaveFocus();
  });
});

describe('Dialog — accessibility', () => {
  it.each(SIZES)('has no axe violations (%s)', async (size) => {
    const { container } = renderDialog({ size, footer: <Button>Confirm</Button> });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations with dividers', async () => {
    const { container } = renderDialog({ dividers: true, footer: <Button>Save</Button> });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations at the warning tone', async () => {
    const { container } = renderDialog({
      tone: 'warning',
      footer: (
        <>
          <Button variant="ghost">Cancel</Button>
          <Button variant="outline" tone="danger">
            Delete
          </Button>
        </>
      ),
    });
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Dialog — edge cases', () => {
  it('handles a long title and long body without losing the close control', () => {
    const longTitle =
      'Delete every file in this workspace, including the ones shared with other people';
    renderDialog({
      title: longTitle,
      children: 'This cannot be undone. '.repeat(40),
    });

    expect(screen.getByRole('heading', { name: longTitle })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Close ${longTitle}` })).toBeInTheDocument();
  });
});
