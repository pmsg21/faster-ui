import { Button } from './Button';
import type { ButtonSize, ButtonVariant } from './Button';

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

/**
 * Page-level rules that cannot apply to a component mounted in isolation — there
 * is no page here to have a main landmark or an h1. Everything else stays on,
 * including colour-contrast, which is the reason to run axe in a real browser.
 */
const PAGE_RULES_NOT_APPLICABLE = {
  rules: {
    'landmark-one-main': { enabled: false },
    'page-has-heading-one': { enabled: false },
  },
};

const SIZES: ButtonSize[] = ['sm', 'md', 'lg'];
const VARIANTS: ButtonVariant[] = ['primary', 'outline', 'ghost', 'link'];

/** Runs axe and prints the offending rules and nodes to the CI log, not just a count. */
function checkA11y(options: Record<string, unknown> = PAGE_RULES_NOT_APPLICABLE) {
  cy.injectAxe();
  cy.checkA11y(undefined, options, (violations) => {
    cy.task('logA11yViolations', violations, { log: false });
  });
}

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
    cy.findByRole('button').should('have.css', 'background-color', 'rgb(21, 197, 206)'); // #15C5CE
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
    cy.findByRole('button').should('have.css', 'background-color', 'rgb(21, 197, 206)');
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
 * SCOPE NOTE. Cypress's `.type('{enter}')` dispatches synthetic key events, which
 * do NOT trigger a button's native activation behaviour — no click follows, and a
 * focused button does not swallow Space. So key-level ACTIVATION is asserted in
 * Button.test.tsx, where `user-event` models it correctly, and this file asserts
 * what a real browser adds: that focus lands, that a real click reaches the
 * handler, and that a disabled control is reachable but inert.
 *
 * Getting true key-level activation (and a real Tab traversal) here needs
 * `cypress-real-events`, which drives the browser through CDP. That is a
 * dependency decision, not something to slip in — flagged, not assumed.
 */
describe('Button — keyboard and pointer in a real browser', () => {
  it('takes focus and reaches the handler on a real click', () => {
    const onClick = cy.stub().as('onClick');
    mountOnSurface(<Button onClick={onClick}>Save</Button>);

    cy.get('@onClick').should('have.callCount', 0);
    cy.findByRole('button').focus().should('have.focus');
    cy.findByRole('button').click();
    cy.get('@onClick').should('have.callCount', 1);
  });

  it('is focusable while disabled, and stays inert', () => {
    const onClick = cy.stub().as('onClick');
    mountOnSurface(
      <Button disabled onClick={onClick}>
        Save
      </Button>
    );

    cy.findByRole('button').focus().should('have.focus');
    cy.get('@onClick').should('have.callCount', 0);
    cy.findByRole('button').click();
    cy.get('@onClick').should('have.callCount', 0);
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

describe('Button — focus indicator', () => {
  it('paints a visible neutral outline when focused', () => {
    mountOnSurface(<Button>Save</Button>);
    cy.findByRole('button')
      .focus()
      .should(($button) => {
        const styles = window.getComputedStyle($button[0]!);
        // Neutral, not cyan: the brand ring measures 1.88–2.12 against SC 1.4.11's 3.0.
        expect(styles.outlineColor, 'outline colour').to.equal('rgb(31, 31, 31)');
        expect(parseFloat(styles.outlineWidth), 'outline width').to.be.at.least(2);
        expect(parseFloat(styles.outlineOffset), 'outline offset').to.be.at.least(2);
      });
  });
});

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

  it('flags only the recorded danger exemption on the non-solid variants', () => {
    // axe independently confirms the number we computed: `content-danger`
    // (danger-700) on white is 4.21, under the 4.5 AA bar. That exemption is
    // deliberate and recorded — red carries meaning on a destructive control, and
    // danger-700 is the darkest step the ramp offers (docs/design-fidelity.md, row 4).
    //
    // colour-contrast is disabled HERE ONLY, and the exemption does not go
    // unwatched: the contrast contract pins it at 4.21 and fails if it drifts in
    // either direction, which is the more precise instrument.
    mountOnSurface(
      <>
        {(['outline', 'ghost', 'link'] as const).map((variant) => (
          <Button key={variant} variant={variant} tone="danger">
            {variant}
          </Button>
        ))}
      </>
    );
    checkA11y({
      rules: {
        ...PAGE_RULES_NOT_APPLICABLE.rules,
        'color-contrast': { enabled: false },
      },
    });
  });

  it('has no violations while loading', () => {
    mountOnSurface(<Button loading>Save</Button>);
    checkA11y();
  });
});
