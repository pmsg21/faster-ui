import {
  acceptedContrastSpec,
  CONTENT_DANGER_ON_WHITE,
  PAGE_STRUCTURE_RULES_NOT_APPLICABLE,
} from '../../../a11y.config';
import { checkA11y, checkA11yWithAcceptedContrast } from '../../../cypress/support/a11y';
import { Input } from './Input';
import type { InputSize } from './Input';

/**
 * The library's one accepted contrast exemption, narrowed to Input's error node. The
 * ratio, register row and reason come from the shared decision; only the blast radius is
 * local.
 */
const INPUT_ERROR_EXEMPTION = {
  ...CONTENT_DANGER_ON_WHITE,
  exemptSelector: '[data-slot="error"]',
};

/**
 * These specs assert what jsdom CANNOT: real computed geometry, real compiled CSS,
 * real `:hover` / `:focus-visible`, real key events, and axe's colour-contrast rules,
 * which need painted pixels. Anything answerable from the class string alone belongs
 * in Input.test.tsx.
 */

function mountOnSurface(node: React.ReactNode, theme: 'light' | 'dark' = 'light') {
  document.documentElement.dataset.theme = theme;
  cy.mount(<div className="bg-surface-base flex w-105 flex-col items-start gap-4 p-6">{node}</div>);
}

/**
 * Tab traversal needs a known starting point — a component test begins with focus
 * outside the application frame, so a bare `realPress('Tab')` lands nowhere. It also
 * sharpens the claim: the field is the NEXT stop in sequential focus order.
 */
function mountAfterSentinel(node: React.ReactNode, theme: 'light' | 'dark' = 'light') {
  mountOnSurface(
    <>
      <button type="button" data-testid="sentinel">
        Sentinel
      </button>
      {node}
    </>,
    theme
  );
  cy.findByTestId('sentinel').focus();
}

const SIZES: InputSize[] = ['sm', 'md', 'lg'];

const field = () => cy.get('[data-slot="field"]');

describe('Input — mounting and rendering', () => {
  it('mounts with its label associated', () => {
    mountOnSurface(<Input label="Email address" />);
    cy.findByLabelText('Email address').should('exist');
  });
});

describe('Input — the tokens actually resolve', () => {
  // jsdom has no CSS, so this is the only place the pipeline is proven end to end:
  // semantic token -> @theme -> compiled utility -> painted pixel.
  it('paints the resting border from line-subtle', () => {
    mountOnSurface(<Input label="Email" />);
    field().should('have.css', 'border-top-color', 'rgb(225, 225, 225)'); // #E1E1E1 neutral-300
  });

  it('paints the value with content-primary, one step darker than the design', () => {
    mountOnSurface(<Input label="Email" defaultValue="a@b.com" />);
    cy.findByLabelText('Email').should('have.css', 'color', 'rgb(31, 31, 31)'); // #1F1F1F
  });

  it('resolves the placeholder colour to content-secondary, not the drawn neutral-400', () => {
    // The design draws neutral-400 (#CACACA), which measures 1.64:1 on white. Both the
    // value and the placeholder shift one ramp step so the empty/filled distinction
    // survives at 16.48 and 8.72. See docs/design-fidelity.md.
    //
    // This asserts TWO narrower claims rather than one end-to-end one, and the reason
    // is a tool limitation rather than a choice: Chrome's
    // `getComputedStyle(el, '::placeholder')` returns the ORIGINATING element's colour
    // (16.48 here), not the pseudo-element's cascade, so the painted placeholder pixel
    // cannot be read from a component test. The emitted rule is correct —
    // `.placeholder\:text-content-secondary::placeholder { color: var(--color-content-secondary) }`
    // — and what is verifiable is that the control carries the class and that the token
    // behind it resolves. Recorded as a known gap; visual regression is what closes it.
    mountOnSurface(<Input label="Email" placeholder="you@example.com" />);

    cy.findByLabelText('Email').should('have.class', 'placeholder:text-content-secondary');

    field().should(($box) => {
      const resolved = window
        .getComputedStyle($box[0]!)
        .getPropertyValue('--color-content-secondary')
        .trim();
      expect(resolved, 'content-secondary resolves').to.equal('#4b4b4b');
    });
  });

  it('paints the invalid border from line-danger', () => {
    mountOnSurface(<Input label="Email" error="Enter a valid address" />);
    field().should('have.css', 'border-top-color', 'rgb(246, 76, 76)'); // #F64C4C danger-600
  });

  it('paints the disabled fill from the re-pointed surface-muted', () => {
    mountOnSurface(<Input label="Email" disabled />);
    // surface-muted moved neutral-200 -> neutral-50 when Input became its first
    // consumer; line-disabled already matched the drawn neutral-200 border.
    field().should('have.css', 'background-color', 'rgb(250, 250, 250)'); // #FAFAFA
    field().should('have.css', 'border-top-color', 'rgb(238, 238, 238)'); // #EEEEEE
  });

  it('re-points its surfaces in dark mode', () => {
    mountOnSurface(<Input label="Email" />, 'dark');
    field().should('have.css', 'background-color', 'rgb(31, 31, 31)'); // surface-raised, dark
    field().should('have.css', 'border-top-color', 'rgb(75, 75, 75)'); // line-subtle -> neutral-600
  });
});

describe('Input — hover and focus', () => {
  it('turns the border cyan on hover', () => {
    mountOnSurface(<Input label="Email" />);
    // Re-queried, not chained. Chaining reads the colour BEFORE the transition
    // settles, which passes or fails on machine speed rather than correctness.
    field().realHover();
    field().should('have.css', 'border-top-color', 'rgb(71, 207, 214)'); // #47CFD6 primary-500
  });

  it('carries focus with a neutral ring AND a cyan inner border', () => {
    mountAfterSentinel(<Input label="Email" />);

    cy.realPress('Tab');
    cy.findByLabelText('Email').should('have.focus');

    field().should(($box) => {
      const styles = window.getComputedStyle($box[0]!);
      // The cyan is what the design draws — decorative, 2.12:1 on white.
      expect(styles.borderTopColor, 'inner border').to.equal('rgb(21, 197, 206)');
      // The neutral ring is what satisfies SC 1.4.11, at 16.48:1.
      expect(styles.outlineColor, 'outline colour').to.equal('rgb(31, 31, 31)');
      expect(parseFloat(styles.outlineWidth), 'outline width').to.be.at.least(2);
      expect(parseFloat(styles.outlineOffset), 'outline offset').to.be.at.least(2);
    });
  });

  it('keeps the danger border while focused, so the error outranks the focus hue', () => {
    mountAfterSentinel(<Input label="Email" error="Enter a valid address" />);

    cy.realPress('Tab');
    cy.findByLabelText('Email').should('have.focus');

    field().should(($box) => {
      const styles = window.getComputedStyle($box[0]!);
      expect(styles.borderTopColor, 'border stays danger').to.equal('rgb(246, 76, 76)');
      // The ring still appears — focus visibility is never traded away.
      expect(styles.outlineColor, 'outline colour').to.equal('rgb(31, 31, 31)');
    });
  });

  it('inverts the focus ring in dark mode', () => {
    mountAfterSentinel(<Input label="Email" />, 'dark');

    cy.realPress('Tab');
    field().should(($box) => {
      // focus-strong re-points to neutral-50 in dark; cyan still cannot carry it.
      expect(window.getComputedStyle($box[0]!).outlineColor).to.equal('rgb(250, 250, 250)');
    });
  });

  it('does not ring the whole field when the clear control is focused', () => {
    // The field keys on `has-[input:focus-visible]`, NOT bare `:focus-visible` —
    // without the element qualifier, focusing the nested button would light up both.
    mountAfterSentinel(<Input label="Search" clearable defaultValue="shoes" onClear={() => {}} />);

    cy.realPress('Tab');
    cy.realPress('Tab');
    cy.findByRole('button', { name: 'Clear Search' }).should('have.focus');

    field().should(($box) => {
      expect(window.getComputedStyle($box[0]!).outlineStyle, 'field outline').to.equal('none');
    });
  });
});

describe('Input — geometry (SC 2.5.8 and the drawn heights)', () => {
  it('keeps the drawn field heights', () => {
    mountOnSurface(
      <>
        <Input label="sm" size="sm" />
        <Input label="md" size="md" />
        <Input label="lg" size="lg" />
      </>
    );
    const heights: Record<string, number> = { sm: 24, md: 36, lg: 40 };
    SIZES.forEach((size) => {
      cy.findByLabelText(size)
        .closest('[data-slot="field"]')
        .should(($box) =>
          expect($box[0]!.getBoundingClientRect().height, `${size} height`).to.equal(heights[size])
        );
    });
  });

  SIZES.forEach((size) => {
    it(`gives the clear control a 24px target at ${size}`, () => {
      // The glyph follows the drawn 16/14/12, but the TARGET is floored at 24 — a
      // 12px hit area would fail SC 2.5.8 outright. At sm that makes the button as
      // tall as the field, which is correct rather than an accident.
      mountOnSurface(
        <Input label="Search" size={size} clearable defaultValue="shoes" onClear={() => {}} />
      );
      cy.findByRole('button', { name: 'Clear Search' }).should(($button) => {
        const { width, height } = $button[0]!.getBoundingClientRect();
        expect(height, 'height').to.be.at.least(24);
        expect(width, 'width').to.be.at.least(24);
      });
    });
  });

  it('collapses the empty alert region to nothing', () => {
    // It is always mounted so `role="alert"` announces content changes reliably; it
    // must not cost an error-free field any vertical space for that.
    mountOnSurface(<Input label="Email" />);
    cy.get('[role="alert"]').should(($alert) =>
      expect($alert[0]!.getBoundingClientRect().height, 'empty alert height').to.equal(0)
    );
  });
});

describe('Input — real keyboard operation', () => {
  it('is the next stop in sequential focus order', () => {
    mountAfterSentinel(<Input label="Email" />);

    cy.findByLabelText('Email').should('not.have.focus');
    cy.realPress('Tab');
    cy.findByLabelText('Email').should('have.focus');
  });

  it('reaches the clear control on the next Tab, and leaves cleanly on Shift+Tab', () => {
    mountAfterSentinel(<Input label="Search" clearable defaultValue="shoes" onClear={() => {}} />);

    cy.realPress('Tab');
    cy.findByLabelText('Search').should('have.focus');

    cy.realPress('Tab');
    cy.findByRole('button', { name: 'Clear Search' }).should('have.focus');

    // Backwards out of the nested control lands on the field, not past it.
    cy.realPress(['Shift', 'Tab']);
    cy.findByLabelText('Search').should('have.focus');

    cy.realPress(['Shift', 'Tab']);
    cy.findByTestId('sentinel').should('have.focus');
  });

  it('skips a disabled field entirely', () => {
    // The native attribute removes it from the tab order — the deliberate difference
    // from Button, where aria-disabled keeps the control discoverable.
    mountAfterSentinel(
      <>
        <Input label="Email" disabled />
        <button type="button" data-testid="after">
          After
        </button>
      </>
    );

    cy.realPress('Tab');
    cy.findByTestId('after').should('have.focus');
  });

  it('restores focus to the field after clearing by keyboard', () => {
    mountAfterSentinel(<Input label="Search" clearable defaultValue="shoes" onClear={() => {}} />);

    cy.realPress('Tab');
    cy.realPress('Tab');
    cy.findByRole('button', { name: 'Clear Search' }).should('have.focus');

    cy.realPress('Enter');

    // The button unmounts on activation. Without a deliberate move, focus falls to
    // <body> and a keyboard user is stranded mid-form.
    cy.findByLabelText('Search').should('have.focus');
    cy.findByLabelText('Search').should('have.value', '');
    cy.findByRole('button', { name: 'Clear Search' }).should('not.exist');
  });

  it('types into the field for real', () => {
    mountAfterSentinel(<Input label="Email" />);
    cy.realPress('Tab');
    cy.realType('a@b.com');
    cy.findByLabelText('Email').should('have.value', 'a@b.com');
  });
});

describe('Input — accessibility in a real browser', () => {
  SIZES.forEach((size) => {
    it(`has no violations at ${size} (light)`, () => {
      mountOnSurface(<Input label="Email address" size={size} hint="We never share it." />);
      checkA11y();
    });
  });

  it('has no violations in dark mode', () => {
    mountOnSurface(<Input label="Email address" hint="We never share it." />, 'dark');
    checkA11y();
  });

  it('has no violations with a hidden label', () => {
    mountOnSurface(<Input label="Search products" labelHidden placeholder="Search" />);
    checkA11y();
  });

  it('has no violations when disabled', () => {
    mountOnSurface(<Input label="Email address" disabled defaultValue="a@b.com" />);
    checkA11y();
  });

  it('has no violations with every slot filled', () => {
    mountOnSurface(
      <Input
        label="Amount"
        prefix="¥"
        suffix="CNY"
        startIcon={<svg viewBox="0 0 16 16" />}
        clearable
        defaultValue="100"
        onClear={() => {}}
      />
    );
    checkA11y();
  });

  it('accepts the recorded danger exemption on an errored field', () => {
    // `content-danger` (danger-700) on white is 4.21, under the 4.5 AA bar — the exemption
    // recorded as row 4 of docs/design-fidelity.md. It is narrowed to the error node
    // rather than switching `color-contrast` off, so everything else here is still checked.
    mountOnSurface(<Input label="Email address" error="Enter a valid email address" />);
    checkA11yWithAcceptedContrast(INPUT_ERROR_EXEMPTION);
  });

  it('still reports a DIFFERENT contrast failure in the same mount', () => {
    // The provocation that makes the test above worth anything. If narrowing the rule had
    // effectively disabled it, this would pass silently and the exemption would be an
    // illusion — the strongest-looking option while being the weakest.
    mountOnSurface(
      <>
        <Input label="Email address" error="Enter a valid email address" />
        <p className="text-[#CACACA]">Unmarked low-contrast text — must still be caught</p>
      </>
    );

    cy.injectAxe();
    cy.configureAxe(acceptedContrastSpec(INPUT_ERROR_EXEMPTION));

    const reported: string[] = [];
    cy.checkA11y(
      undefined,
      PAGE_STRUCTURE_RULES_NOT_APPLICABLE,
      (violations) => {
        reported.push(...violations.map((violation) => violation.id));
      },
      // Do not throw — this spec asserts that a violation IS reported.
      true
    );

    cy.then(() => {
      expect(reported, 'color-contrast is still enabled').to.include('color-contrast');
    });
  });
});
