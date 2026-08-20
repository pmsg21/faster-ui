import { ACCEPTED_CONTRAST_ATTRIBUTE, CONTENT_DANGER_ON_WHITE } from '../../../a11y.config';
import { checkA11y, checkA11yWithAcceptedContrast } from '../../../cypress/support/a11y';
import { Button } from './Button';
import type { ButtonSize, ButtonVariant } from './Button';

/**
 * The library's one accepted contrast exemption, narrowed to a marked wrapper. Only the
 * blast radius is local; the ratio, register row and reason are shared with Input's use
 * of the same decision.
 */
const BUTTON_DANGER_EXEMPTION = {
  ...CONTENT_DANGER_ON_WHITE,
  exemptSelector: `[${ACCEPTED_CONTRAST_ATTRIBUTE}]`,
};

/**
 * These specs deliberately assert what jsdom CANNOT: real computed geometry, real
 * compiled CSS, and real contrast. Anything checkable from the class string alone
 * belongs in Button.test.tsx — duplicating it here buys nothing and costs a
 * browser launch.
 */

/**
 * Mounts on a real surface so axe's colour-contrast rules have something to
 * measure. `items-start` matters: a flex row stretches its children by default,
 * which silently inflated every button to the height of the tallest one and made
 * the geometry assertions below measure the wrapper rather than the control.
 */
function mountOnSurface(node: React.ReactNode, theme: 'light' | 'dark' = 'light') {
  document.documentElement.dataset.theme = theme;
  cy.mount(<div className="bg-surface-base flex flex-wrap items-start gap-4 p-6">{node}</div>);
}

const SIZES: ButtonSize[] = ['sm', 'md', 'lg'];
const VARIANTS: ButtonVariant[] = ['primary', 'outline', 'ghost', 'link'];

describe('Button — mounting and rendering', () => {
  it('mounts and shows its label', () => {
    mountOnSurface(<Button>Save</Button>);
    cy.findByRole('button', { name: 'Save' }).should('be.visible');
  });

  it('renders every variant', () => {
    mountOnSurface(
      <>
        {VARIANTS.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
      </>
    );
    VARIANTS.forEach((variant) => {
      cy.findByRole('button', { name: variant }).should('be.visible');
    });
  });
});

describe('Button — the tokens actually resolve', () => {
  // jsdom has no CSS, so this is the only place the token pipeline is proven
  // end to end: semantic token -> @theme -> compiled utility -> painted pixel.
  it('paints the primary fill from the accent token', () => {
    mountOnSurface(<Button>Save</Button>);
    cy.findByRole('button').should('have.css', 'background-color', 'rgb(0, 171, 182)'); // #15C5CE
  });

  it('paints the label with the dark on-accent token, not white', () => {
    // The headline design-fidelity decision: white measures 2.12 on this fill.
    mountOnSurface(<Button>Save</Button>);
    cy.findByRole('button').should('have.css', 'color', 'rgb(31, 31, 31)'); // #1F1F1F
  });

  it('paints the danger fill from the danger token', () => {
    mountOnSurface(<Button tone="danger">Delete</Button>);
    cy.findByRole('button').should('have.css', 'background-color', 'rgb(246, 76, 76)'); // #F64C4C
  });

  it('re-points the surface in dark mode without changing the brand fill', () => {
    mountOnSurface(<Button>Save</Button>, 'dark');
    // Brand fills are mode-independent — cyan is cyan.
    cy.findByRole('button').should('have.css', 'background-color', 'rgb(0, 171, 182)');
  });

  it('underlines the link variant at rest', () => {
    mountOnSurface(<Button variant="link">Read more</Button>);
    cy.findByRole('button')
      .should('have.css', 'text-decoration-line', 'underline')
      .and('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
  });
});

describe('Button — touch targets (SC 2.5.8)', () => {
  // The floor is a GATE, not a doc: `sm` sits exactly on 24px with no margin, so
  // a border, a scale tweak or browser rounding would drop it below unnoticed.
  SIZES.forEach((size) => {
    it(`meets the 24px minimum at ${size}`, () => {
      mountOnSurface(<Button size={size}>Save</Button>);
      cy.findByRole('button').should(($button) => {
        const { height, width } = $button[0]!.getBoundingClientRect();
        expect(height, 'height').to.be.at.least(24);
        expect(width, 'width').to.be.at.least(24);
      });
    });

    it(`meets the 24px minimum at ${size} for the link variant`, () => {
      // The source draws these at 18 / 22 / 24 — but a Figma frame height is the
      // text's bounding box, not a target spec. Link has no background, so the
      // floor is invisible.
      mountOnSurface(
        <Button variant="link" size={size}>
          Read more
        </Button>
      );
      cy.findByRole('button').should(($button) => {
        expect($button[0]!.getBoundingClientRect().height).to.be.at.least(24);
      });
    });
  });

  it('keeps the drawn heights for the boxed sizes', () => {
    mountOnSurface(
      <>
        <Button size="sm">sm</Button>
        <Button size="md">md</Button>
        <Button size="lg">lg</Button>
      </>
    );
    cy.findByRole('button', { name: 'sm' }).should(($button) =>
      expect($button[0]!.getBoundingClientRect().height).to.equal(24)
    );
    cy.findByRole('button', { name: 'md' }).should(($button) =>
      expect($button[0]!.getBoundingClientRect().height).to.equal(36)
    );
    cy.findByRole('button', { name: 'lg' }).should(($button) =>
      expect($button[0]!.getBoundingClientRect().height).to.equal(40)
    );
  });

  it('honours the min-width from the source', () => {
    mountOnSurface(<Button size="lg">Hi</Button>);
    cy.findByRole('button').should(($button) =>
      expect($button[0]!.getBoundingClientRect().width).to.equal(106)
    );
  });

  it('keeps the link label optically centred, with and without an icon', () => {
    // A min-height that pushes the text off-centre would be a visible change,
    // which is exactly what this fix claims not to be.
    mountOnSurface(
      <>
        <Button variant="link" size="sm">
          Plain
        </Button>
        <Button variant="link" size="sm" startIcon={<svg viewBox="0 0 24 24" />}>
          Iconed
        </Button>
      </>
    );
    ['Plain', 'Iconed'].forEach((label) => {
      cy.findByRole('button', { name: label }).should(($button) => {
        const styles = window.getComputedStyle($button[0]!);
        // Centred by flex alignment with symmetric padding, so the extra height
        // is distributed evenly rather than pushing the label off-axis.
        expect(styles.alignItems, 'align-items').to.equal('center');
        expect(styles.paddingTop, 'padding-top').to.equal(styles.paddingBottom);
        expect($button[0]!.getBoundingClientRect().height, 'height').to.be.at.least(24);
      });
    });
  });
});

/**
 * Real keyboard, driven through CDP by `cypress-real-events`. Cypress's own
 * `.type('{enter}')` dispatches synthetic events that never trigger a control's
 * native behaviour, so it cannot answer any of the questions below: whether Tab
 * actually reaches the control, whether Enter activates it, or whether the button
 * swallows Space instead of scrolling the page.
 *
 * Jest covers the same activation through `user-event`. That is not duplication —
 * `user-event` models the browser's behaviour, and this proves the browser agrees.
 */
describe('Button — real keyboard operation', () => {
  /**
   * Tab traversal has to start somewhere known. In a component test the document
   * begins with focus outside the application frame, so a bare `realPress('Tab')`
   * lands nowhere. Focusing this sentinel first makes the traversal deterministic —
   * and turns the assertion into the sharper claim: the button is the NEXT stop in
   * sequential focus order, not merely focusable in isolation.
   */
  function mountAfterSentinel(node: React.ReactNode) {
    mountOnSurface(
      <>
        <button type="button" data-testid="sentinel">
          Sentinel
        </button>
        {node}
      </>
    );
    cy.findByTestId('sentinel').focus();
  }

  const subject = () => cy.findByRole('button', { name: 'Save' });

  it('is the next stop in tab order', () => {
    mountAfterSentinel(<Button>Save</Button>);

    subject().should('not.have.focus');
    cy.realPress('Tab');
    subject().should('have.focus');
  });

  it('activates on Enter', () => {
    const onClick = cy.stub().as('onClick');
    mountAfterSentinel(<Button onClick={onClick}>Save</Button>);

    cy.get('@onClick').should('have.callCount', 0);
    cy.realPress('Tab');
    subject().should('have.focus');
    cy.realPress('Enter');
    cy.get('@onClick').should('have.callCount', 1);
  });

  it('activates on Space', () => {
    const onClick = cy.stub().as('onClick');
    mountAfterSentinel(<Button onClick={onClick}>Save</Button>);

    cy.get('@onClick').should('have.callCount', 0);
    cy.realPress('Tab');
    subject().should('have.focus');
    cy.realPress('Space');
    cy.get('@onClick').should('have.callCount', 1);
  });

  it('swallows Space instead of scrolling the page', () => {
    // A focused button consumes Space; if it did not, activating it would scroll
    // the page under the user. Only a real key event can show this — synthetic
    // events never reach the browser's default action.
    mountAfterSentinel(
      <div style={{ height: '250vh' }}>
        <Button>Save</Button>
      </div>
    );

    cy.window().its('scrollY').should('equal', 0);
    cy.realPress('Tab');
    subject().should('have.focus');
    cy.realPress('Space');
    cy.window().its('scrollY').should('equal', 0);
  });

  it('stays in tab order while disabled, and inert under real keys', () => {
    // The whole point of aria-disabled over the native attribute: the control stays
    // in the tab order, so a keyboard user can find it and hear why it is disabled.
    // The native attribute would make this test impossible to write.
    const onClick = cy.stub().as('onClick');
    mountAfterSentinel(
      <Button disabled onClick={onClick}>
        Save
      </Button>
    );

    cy.get('@onClick').should('have.callCount', 0);
    cy.realPress('Tab');
    subject().should('have.focus');

    cy.realPress('Enter');
    cy.get('@onClick').should('have.callCount', 0);

    cy.realPress('Space');
    cy.get('@onClick').should('have.callCount', 0);
  });

  it('paints a visible neutral ring on keyboard focus', () => {
    mountAfterSentinel(<Button>Save</Button>);

    cy.realPress('Tab');
    subject().should(($button) => {
      const styles = window.getComputedStyle($button[0]!);
      // Neutral, not cyan: the brand ring measures 1.88–2.12 against SC 1.4.11's 3.0.
      expect(styles.outlineColor, 'outline colour').to.equal('rgb(31, 31, 31)');
      expect(parseFloat(styles.outlineWidth), 'outline width').to.be.at.least(2);
      expect(parseFloat(styles.outlineOffset), 'outline offset').to.be.at.least(2);
    });
  });

  it('does not show the focus ring on a pointer press', () => {
    // The ring is bound to :focus-visible, not :focus — which is why a mouse user
    // does not get a ring on every click, while a keyboard user always does.
    //
    // The click has to land on a control that was NOT already keyboard-focused:
    // :focus-visible is evaluated when focus MOVES, so clicking an element that
    // already has a keyboard-derived ring leaves the ring in place. That is correct
    // browser behaviour, and it is what made the first version of this test fail.
    mountOnSurface(<Button>Save</Button>);

    subject().realClick();
    subject().should(($button) => {
      // Focused, but without the ring — the state the distinction exists for.
      expect($button[0]!.ownerDocument.activeElement, 'focused').to.equal($button[0]!);
      expect(parseFloat(window.getComputedStyle($button[0]!).outlineWidth)).to.be.lessThan(2);
    });
  });

  it('does not submit its form when disabled', () => {
    const onSubmit = cy.stub().as('onSubmit');
    mountOnSurface(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Button type="submit" disabled>
          Save
        </Button>
      </form>
    );

    cy.get('@onSubmit').should('have.callCount', 0);
    cy.findByRole('button').click();
    cy.get('@onSubmit').should('have.callCount', 0);
  });
});

// The former `Button — focus indicator` describe lived here. It asserted the ring's
// colour, width and offset after a PROGRAMMATIC `.focus()`, and it passed only
// because earlier specs had left the browser in keyboard modality — add a real
// pointer press before it and it goes red, because `:focus-visible` correctly does
// not match a programmatic focus. Every one of its three assertions now runs in
// "paints a visible neutral ring on keyboard focus" above, after a real Tab. Nothing
// was dropped; the test was moved to where its premise is actually true.

describe('Button — accessibility in a real browser', () => {
  // axe's colour-contrast rules need painted pixels, so this is the one place
  // they can actually run. jsdom reports them as incomplete.
  it('has no violations across the variants (light)', () => {
    mountOnSurface(
      <>
        {VARIANTS.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
      </>
    );
    checkA11y();
  });

  it('has no violations across the variants (dark)', () => {
    mountOnSurface(
      <>
        {VARIANTS.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
      </>,
      'dark'
    );
    checkA11y();
  });

  it('has no violations for the danger SOLID variant', () => {
    // The solid danger button clears AA at 4.75 with the dark label.
    mountOnSurface(
      <Button tone="danger" variant="primary">
        Delete
      </Button>
    );
    checkA11y();
  });

  it('accepts the recorded danger exemption on the non-solid variants', () => {
    // `content-danger` (danger-700) on white is 4.21, under the 4.5 AA bar — row 4 of
    // docs/design-fidelity.md. The rule stays ENABLED and is narrowed to the marked
    // region, so any other contrast failure among these buttons is still reported. The
    // ratio, row and reason come from the shared decision in a11y.config.ts.
    mountOnSurface(
      <div data-a11y-accepted-contrast className="flex flex-wrap items-start gap-4">
        {(['outline', 'ghost', 'link'] as const).map((variant) => (
          <Button key={variant} variant={variant} tone="danger">
            {variant}
          </Button>
        ))}
      </div>
    );
    checkA11yWithAcceptedContrast(BUTTON_DANGER_EXEMPTION);
  });

  it('has no violations while loading', () => {
    mountOnSurface(<Button loading>Save</Button>);
    checkA11y();
  });
});
