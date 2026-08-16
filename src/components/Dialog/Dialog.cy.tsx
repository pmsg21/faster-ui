import { useState } from 'react';

import { CONTENT_DANGER_ON_WHITE } from '../../../a11y.config';
import { checkA11y, checkA11yWithAcceptedContrast } from '../../../cypress/support/a11y';
import { Button } from '../Button';
import { Dialog } from './Dialog';
import type { DialogProps, DialogSize } from './Dialog';

/**
 * These specs assert what jsdom CANNOT — and for this component that is most of what
 * matters. `jest.setup.ts` shims `showModal`/`close` far enough to mount, which means
 * Jest sees `<dialog open>` (non-modal) and cannot tell it apart from a real modal.
 *
 * So modality, background inertness, focus movement, focus restoration, Escape,
 * `::backdrop`, the painted dark border, real geometry and axe's colour rules all live
 * here.
 *
 * The FIRST spec below is the one the rest depend on: it proves the browser's own
 * `showModal` is what is under test. Without it a green run here would be
 * indistinguishable from a run that exercised the shim, which is the exact shape that
 * has caught this repository three times (see docs/decisions.md).
 */

const SIZES: DialogSize[] = ['sm', 'md', 'lg'];

/** Card widths as drawn, per `Space` section. `size` changes the width and nothing else. */
const DRAWN_WIDTH: Record<DialogSize, number> = { sm: 400, md: 600, lg: 900 };

const card = () => cy.get('[data-slot="card"]');
const scrim = () => cy.get('[data-slot="scrim"]');

/**
 * A trigger plus a controlled dialog — the shape a consumer actually writes, and the
 * only shape in which focus restoration means anything: the browser returns focus to
 * whatever was focused before `showModal()`, so there has to be a real trigger to
 * return to.
 */
function DialogHarness({
  onOpenChange,
  ...props
}: Partial<DialogProps> & { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" data-testid="trigger" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <button type="button" data-testid="behind">
        Behind the dialog
      </button>
      <Dialog
        title="Delete file?"
        {...props}
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange?.(next);
        }}
      >
        {props.children ?? 'This cannot be undone.'}
      </Dialog>
    </>
  );
}

function mountHarness(props: Partial<DialogProps> = {}, theme: 'light' | 'dark' = 'light') {
  document.documentElement.dataset.theme = theme;
  cy.mount(
    <div className="bg-surface-base flex min-h-160 flex-col items-start gap-4 p-6">
      <DialogHarness {...props} />
    </div>
  );
}

const open = () => cy.findByTestId('trigger').click();

describe('Dialog — the harness itself', () => {
  it('is exercising the browser’s own showModal, not the Jest shim', () => {
    mountHarness();
    cy.window().then((win) => {
      // The shim in jest.setup.ts is a plain function body; the real one is native.
      // If this ever reads as JavaScript, every modality assertion below is measuring
      // a stub and reporting success.
      expect(
        win.HTMLDialogElement.prototype.showModal.toString(),
        'showModal must be the browser implementation'
      ).to.contain('native code');
    });
  });

  it('produces a genuinely modal dialog, not merely an open one', () => {
    mountHarness();
    open();
    // `:modal` matches ONLY a dialog opened with showModal() — an `<dialog open>` does
    // not match it. This is the difference the shim cannot fake, asserted directly
    // rather than inferred from behaviour.
    cy.get('dialog').should(($dialog) => {
      expect($dialog[0]!.matches(':modal'), 'dialog must be in the top layer').to.equal(true);
    });
  });
});

describe('Dialog — focus', () => {
  it('moves focus into the dialog, skipping the close control', () => {
    mountHarness({ footer: <Button>Confirm</Button> });
    cy.findByTestId('trigger').focus();
    cy.focused().should('have.attr', 'data-testid', 'trigger');

    open();
    cy.focused().should('have.text', 'Confirm');
  });

  it('falls back to the dialog itself rather than to <body>', () => {
    mountHarness();
    open();
    // Focus on <body> would strand a keyboard user outside an inert page with nothing
    // announced — the same failure Input's clear control had, at a larger scale.
    cy.focused().should('match', 'dialog');
  });

  it('returns focus to the trigger on close', () => {
    mountHarness({ footer: <Button>Confirm</Button> });
    open();
    cy.focused().should('have.text', 'Confirm');

    cy.realPress('Escape');
    cy.focused().should('have.attr', 'data-testid', 'trigger');
  });

  /**
   * Tab traversal stays within the dialog's own stops, and never reaches the page.
   *
   * **What this deliberately does not assert, and why.** The full wrap-around — Tab from
   * the LAST stop returning to the first — cannot be tested here. A Cypress component
   * test mounts into an iframe, and `showModal()` makes only its OWN document inert; the
   * parent document is not, so Tab past the end of the ring leaves the frame and the
   * AUT's `activeElement` becomes `<body>`. Measured, not assumed: from the close
   * control, Tab reaches the body link, then Confirm, then `<BODY>`.
   *
   * That is the harness being unable to express the claim rather than the claim being
   * false — in a real top-level document the ring wraps. Recorded in CLAUDE.md
   * known-gaps rather than papered over, because a limitation nobody wrote down is
   * indistinguishable from one nobody noticed. What IS asserted is the thing that
   * actually goes wrong in the wild: the background is unreachable (see the inertness
   * spec below, which fails against a non-modal dialog).
   */
  it('moves Tab through the dialog’s own stops without reaching the page behind', () => {
    mountHarness({
      footer: <Button>Confirm</Button>,
      children: (
        <a href="#anchor" data-testid="body-link">
          a link in the body
        </a>
      ),
    });
    open();

    cy.get('[data-slot="close"]').focus();
    // One step short of the end of the ring — see the note above.
    ['body-link', 'Confirm'].forEach((expected) => {
      cy.realPress('Tab');
      cy.focused().should(($node) => {
        expect($node.closest('dialog').length, 'focus must stay inside the dialog').to.equal(1);
        expect($node.attr('data-testid') ?? $node.text()).to.equal(expected);
      });
    });
  });

  it('makes the page behind genuinely inert, not merely covered', () => {
    mountHarness();
    open();

    // The discriminating assertion, and it was arrived at by provocation rather than by
    // design. The first version of this test checked that a point over the background
    // button hit the scrim instead — which PASSED against the Jest shim, because a
    // non-modal `<dialog open>` still renders a full-viewport scrim on top. It was
    // measuring z-order and reporting inertness.
    //
    // Asking the element to take focus cannot be faked by covering it: the browser
    // refuses focus to inert content, and nothing else in this component would stop it.
    cy.findByTestId('behind').then(($node) => {
      $node[0]!.focus();
      cy.focused().should(($focused) => {
        expect(
          $focused.attr('data-testid'),
          'a modal must refuse focus to the page behind it'
        ).to.not.equal('behind');
      });
    });
  });
});

describe('Dialog — dismissal', () => {
  it('dismisses on Escape', () => {
    const onOpenChange = cy.stub().as('onOpenChange');
    mountHarness({ onOpenChange });
    open();
    // The trigger sets state directly, so the dialog has requested nothing yet. Pinning
    // the before-state matters more than usual here: `not.been.called` is already true
    // before the test does anything, so without the Escape below it would pass on a
    // component that never wired `cancel` at all.
    cy.get('@onOpenChange').should('not.have.been.called');
    cy.get('dialog').should('have.attr', 'open');

    cy.realPress('Escape');
    cy.get('@onOpenChange').should('have.been.calledOnceWith', false);
    cy.get('dialog').should('not.have.attr', 'open');
  });

  it('dismisses on a scrim click but not on a card click', () => {
    mountHarness({ footer: <Button>Confirm</Button> });
    open();

    card().click('top');
    cy.get('dialog').should('have.attr', 'open');

    // A real click at the far corner of the viewport cover, which is the scrim.
    scrim().click(5, 5);
    cy.get('dialog').should('not.have.attr', 'open');
  });

  it('does not dismiss on the scrim at the warning tone', () => {
    mountHarness({ tone: 'warning' });
    open();

    scrim().click(5, 5);
    // "users need to acknowledge it to close dialog box" — the page prose.
    cy.get('dialog').should('have.attr', 'open');
    // Escape still works: the APG keeps it on alertdialog.
    cy.realPress('Escape');
    cy.get('dialog').should('not.have.attr', 'open');
  });
});

describe('Dialog — page scroll lock', () => {
  it('locks the page while open and restores it on close, without shifting the layout', () => {
    mountHarness({ footer: <Button>Confirm</Button> });

    cy.document().then((doc) => {
      const before = doc.documentElement.getBoundingClientRect().width;
      cy.wrap(before).as('widthBefore');
    });

    open();
    cy.document().should((doc) => {
      expect(doc.documentElement.style.overflow).to.equal('hidden');
    });
    // Removing the scrollbar reflows the page by its width unless the gutter is paid
    // back — a visible jump on every open, and the kind of thing only found by eye.
    cy.get('@widthBefore').then((before) => {
      cy.document().should((doc) => {
        expect(doc.documentElement.getBoundingClientRect().width).to.equal(before);
      });
    });

    cy.realPress('Escape');
    cy.document().should((doc) => {
      expect(doc.documentElement.style.overflow).to.equal('');
    });
  });
});

describe('Dialog — geometry, from the Space sections', () => {
  SIZES.forEach((size) => {
    it(`is ${DRAWN_WIDTH[size]}px wide at ${size}, with size-invariant padding`, () => {
      mountHarness({ size, footer: <Button>Confirm</Button> });
      open();

      card().should(($node) => {
        // Asserted against the drawn pixels, not against the class name — `max-w-100`
        // is Tailwind's spacing scale and says nothing legible about 400px.
        expect($node[0]!.getBoundingClientRect().width).to.equal(DRAWN_WIDTH[size]);
      });

      // 24px horizontal padding at EVERY size — the single most useful thing the four
      // Space sections say, and the one a reader assuming a uniform scale gets wrong.
      cy.get('[data-slot="header"]').should(($node) => {
        const style = getComputedStyle($node[0]!);
        expect(style.paddingLeft).to.equal('24px');
        expect(style.paddingRight).to.equal('24px');
        expect(style.paddingTop).to.equal('24px');
        expect(style.paddingBottom).to.equal('16px');
      });
      cy.get('[data-slot="footer"]').should(($node) => {
        const style = getComputedStyle($node[0]!);
        expect(style.paddingTop).to.equal('32px');
        expect(style.paddingBottom).to.equal('24px');
      });
    });
  });

  it('re-spaces to a uniform 16 when dividers are on', () => {
    mountHarness({ dividers: true, footer: <Button>Save</Button> });
    open();

    cy.get('[data-slot="header"]').should(($node) => {
      const style = getComputedStyle($node[0]!);
      expect(style.paddingTop).to.equal('16px');
      expect(style.paddingBottom).to.equal('16px');
      expect(style.borderBottomWidth).to.equal('1px');
    });
    cy.get('[data-slot="footer"]').should(($node) => {
      const style = getComputedStyle($node[0]!);
      expect(style.paddingTop).to.equal('16px');
      expect(style.paddingBottom).to.equal('16px');
      expect(style.borderTopWidth).to.equal('1px');
    });
  });

  it('floors the close target at 24x24 for SC 2.5.8 though the glyph is 14', () => {
    mountHarness();
    open();
    cy.get('[data-slot="close"]').should(($node) => {
      const rect = $node[0]!.getBoundingClientRect();
      expect(rect.width).to.be.at.least(24);
      expect(rect.height).to.be.at.least(24);
    });
  });
});

describe('Dialog — painted colour', () => {
  it('paints the scrim from the token, not from ::backdrop', () => {
    mountHarness();
    open();
    // The whole reason the scrim is a real element: on Safari 15.4–17.3 and Firefox
    // 98–119 a custom property is invisible inside ::backdrop, so `var(--color-scrim)`
    // there would fall back to transparent — a modal with no scrim at all.
    scrim().should(($node) => {
      expect(getComputedStyle($node[0]!).backgroundColor).to.equal('rgba(0, 0, 0, 0.3)');
    });
  });

  it('carries an invisible border in light and a load-bearing one in dark', () => {
    mountHarness({}, 'light');
    open();
    card().should(($node) => {
      // White on the white card, exactly as Figma draws. Present, but doing nothing.
      expect(getComputedStyle($node[0]!).borderTopColor).to.equal('rgb(255, 255, 255)');
      expect(getComputedStyle($node[0]!).borderTopWidth).to.equal('1px');
    });
  });

  it('paints the dark border at neutral-500, the only thing separating it from the page', () => {
    mountHarness({}, 'dark');
    open();
    card().should(($node) => {
      const style = getComputedStyle($node[0]!);
      // #8E8E8E. `line-subtle` (neutral-600, #4B4B4B) would measure 1.89 against the
      // page and fail SC 1.4.11; this measures 5.03. In dark, surface-base, -raised and
      // -overlay all resolve to #1F1F1F and elevation-4 over that is 1.045:1, so this
      // border is the entire separation.
      expect(style.borderTopColor).to.equal('rgb(142, 142, 142)');
      expect(style.backgroundColor).to.equal('rgb(31, 31, 31)');
    });
  });
});

describe('Dialog — overflow is runtime, not a variant', () => {
  it('scrolls the body while the header and footer stay put', () => {
    mountHarness({
      footer: <Button>Confirm</Button>,
      children: (
        <>
          {Array.from({ length: 40 }, (_, index) => (
            <p key={index}>Some contents…</p>
          ))}
        </>
      ),
    });
    open();

    cy.get('[data-slot="body"]').should(($node) => {
      const body = $node[0]!;
      expect(body.scrollHeight, 'the body must actually overflow').to.be.greaterThan(
        body.clientHeight
      );
      expect(getComputedStyle(body).overflowY).to.equal('auto');
    });

    cy.get('[data-slot="header"]').then(($header) => {
      const before = $header[0]!.getBoundingClientRect().top;
      cy.get('[data-slot="body"]').scrollTo('bottom');
      cy.get('[data-slot="header"]').should(($after) => {
        // The scroll boundary is the body alone — the title and the actions are what a
        // user needs kept in view while reading a long dialog.
        expect($after[0]!.getBoundingClientRect().top).to.equal(before);
      });
    });
  });

  it('hugs its content when there is little of it', () => {
    mountHarness({ footer: <Button>Confirm</Button> });
    open();
    // The drawn Scrollable frame is a fixed 400px tall, but its prose makes scrolling
    // conditional on overflow — so a short dialog is short, and the fixed height is a
    // canvas artefact rather than a specification.
    card().should(($node) => {
      expect($node[0]!.getBoundingClientRect().height).to.be.lessThan(300);
    });
  });
});

describe('Dialog — accessibility', () => {
  SIZES.forEach((size) => {
    it(`has no axe violations (${size}, light)`, () => {
      mountHarness({ size, footer: <Button>Confirm</Button> });
      open();
      checkA11y();
    });
  });

  it('has no axe violations in dark mode', () => {
    mountHarness({ footer: <Button>Confirm</Button> }, 'dark');
    open();
    checkA11y();
  });

  it('has no axe violations with dividers', () => {
    mountHarness({ dividers: true, footer: <Button>Save</Button> });
    open();
    checkA11y();
  });

  /**
   * The warning glyph needs NO contrast exemption, and this is the spec that proves it
   * rather than asserting it.
   *
   * `content-warning` measures 1.87 on the dialog surface — a real number, pinned by the
   * contrast contract and recorded in docs/accessibility.md. But axe's `color-contrast`
   * rule evaluates **text**, and the glyph is an `aria-hidden` SVG with none. Narrowing
   * the rule around it would declare an axe exemption for something axe never reports:
   * an exemption that hides nothing, inflating the count while protecting no one. That
   * is the same dilution a stale exemption causes, which is why the number lives in the
   * token contract instead.
   *
   * So this runs the PLAIN check with a neutral footer, and passing IS the claim.
   */
  it('has no axe violations at the warning tone — the glyph needs no exemption', () => {
    mountHarness({ tone: 'warning', footer: <Button variant="ghost">Acknowledge</Button> });
    open();
    checkA11y();
  });

  /**
   * The warning dialog as the design actually draws it — with the destructive `Delete`.
   *
   * This one DOES carry an exemption, and it is worth being precise about whose: the
   * offending node is the button label, `content-danger` at 4.21 on white, which is the
   * library's existing register-row-4 decision. It is not the glyph, and it is not new.
   * Establishing that took measuring — the first version of this spec assumed the
   * warning tone was clean and the failure named a `<button>`.
   */
  it('carries only the existing danger-label exemption when the action is destructive', () => {
    mountHarness({
      tone: 'warning',
      footer: (
        <>
          <Button variant="ghost">Cancel</Button>
          <Button variant="outline" tone="danger" data-testid="destructive">
            Delete
          </Button>
        </>
      ),
    });
    open();
    checkA11yWithAcceptedContrast({
      ...CONTENT_DANGER_ON_WHITE,
      exemptSelector: '[data-testid="destructive"]',
    });
  });
});
