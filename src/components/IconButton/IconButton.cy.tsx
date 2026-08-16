import type { ButtonSize } from '../Button';
import { IconButton } from './IconButton';
import type { IconButtonVariant } from './IconButton';

/**
 * As with Button, this file asserts only what jsdom cannot: real geometry and real
 * contrast. The behavioural surface is covered in IconButton.test.tsx, and the
 * behaviour itself is Button's — IconButton composes it rather than restating it.
 */

function mountOnSurface(node: React.ReactNode, theme: 'light' | 'dark' = 'light') {
  document.documentElement.dataset.theme = theme;
  cy.mount(<div className="bg-surface-base flex flex-wrap items-start gap-4 p-6">{node}</div>);
}

const PAGE_RULES_NOT_APPLICABLE = {
  rules: {
    'landmark-one-main': { enabled: false },
    'page-has-heading-one': { enabled: false },
  },
};

function checkA11y() {
  cy.injectAxe();
  cy.checkA11y(undefined, PAGE_RULES_NOT_APPLICABLE, (violations) => {
    cy.task('logA11yViolations', violations, { log: false });
  });
}

const SIZES: ButtonSize[] = ['sm', 'md', 'lg'];
const VARIANTS: IconButtonVariant[] = ['primary', 'outline', 'ghost'];
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

describe('IconButton — mounting', () => {
  it('mounts and is named by aria-label', () => {
    mountOnSurface(<IconButton aria-label="Add item" icon={<PlusIcon />} />);
    cy.findByRole('button', { name: 'Add item' }).should('be.visible');
  });

  it('renders every variant', () => {
    mountOnSurface(
      <>
        {VARIANTS.map((variant) => (
          <IconButton key={variant} variant={variant} aria-label={variant} icon={<PlusIcon />} />
        ))}
      </>
    );
    VARIANTS.forEach((variant) => {
      cy.findByRole('button', { name: variant }).should('be.visible');
    });
  });
});

describe('IconButton — geometry', () => {
  // The square classes are appended over Button's boxed ones and resolved by
  // twMerge. Only a browser can prove the resolution actually produced a square:
  // in jsdom a broken merge still "has" both classes.
  const EXPECTED_SIDE: Record<ButtonSize, number> = { sm: 24, md: 36, lg: 40 };

  SIZES.forEach((size) => {
    it(`is exactly square at ${size}`, () => {
      mountOnSurface(<IconButton size={size} aria-label="Add item" icon={<PlusIcon />} />);
      cy.findByRole('button').should(($button) => {
        const { width, height } = $button[0]!.getBoundingClientRect();
        expect(width, 'width').to.equal(EXPECTED_SIDE[size]);
        expect(height, 'height').to.equal(EXPECTED_SIDE[size]);
      });
    });

    it(`meets the 24px target minimum at ${size}`, () => {
      // `sm` sits exactly on the SC 2.5.8 floor with no margin, which is why this
      // is a gate: a border or a scale tweak would drop it below unnoticed.
      mountOnSurface(<IconButton size={size} aria-label="Add item" icon={<PlusIcon />} />);
      cy.findByRole('button').should(($button) => {
        const { width, height } = $button[0]!.getBoundingClientRect();
        expect(Math.min(width, height)).to.be.at.least(24);
      });
    });
  });

  it('is fully rounded by default, as the source draws it', () => {
    mountOnSurface(<IconButton aria-label="Add item" icon={<PlusIcon />} />);
    cy.findByRole('button').should(($button) => {
      const radius = parseFloat(window.getComputedStyle($button[0]!).borderTopLeftRadius);
      const { height } = $button[0]!.getBoundingClientRect();
      // A circle, not a rounded square: the source specifies 100px on a 40px box.
      expect(radius).to.be.at.least(height / 2);
    });
  });

  it('takes a 4px corner when square, and stays square', () => {
    // Only a browser can tell "the class is present" from "the corner is 4px and
    // the box is still 36×36" — a broken merge would leave both radii declared.
    mountOnSurface(<IconButton shape="square" aria-label="Add item" icon={<PlusIcon />} />);
    cy.findByRole('button').should(($button) => {
      const radius = parseFloat(window.getComputedStyle($button[0]!).borderTopLeftRadius);
      const { width, height } = $button[0]!.getBoundingClientRect();
      expect(radius, 'corner radius').to.equal(4);
      expect(width, 'width').to.equal(36);
      expect(height, 'height').to.equal(36);
    });
  });
});

describe('IconButton — outline interacts like ghost, not like a labelled outline', () => {
  // Extracted from the icon sets themselves (15:20596 / 20590 / 20584 / 20578)
  // after the labelled behaviour was inherited by mistake. Only a browser can
  // check a :hover rule, so this is the one place the difference is verifiable.
  const NEUTRAL_300 = 'rgb(225, 225, 225)';
  const NEUTRAL_100 = 'rgb(245, 245, 245)';

  it('keeps a neutral border and washes the fill on hover', () => {
    mountOnSurface(<IconButton variant="outline" aria-label="Add item" icon={<PlusIcon />} />);
    cy.findByRole('button').realHover();
    // Asserted on a fresh query rather than chained off `realHover`: the element
    // carries `transition-colors`, so the first read catches the starting value.
    // A re-queried `should` retries until the transition settles.
    cy.findByRole('button').should('have.css', 'background-color', NEUTRAL_100);
    cy.findByRole('button').should('have.css', 'border-top-color', NEUTRAL_300);
  });

  it('keeps the border neutral at rest too', () => {
    mountOnSurface(<IconButton variant="outline" aria-label="Add item" icon={<PlusIcon />} />);
    cy.findByRole('button')
      .should('have.css', 'border-top-color', NEUTRAL_300)
      .and('have.css', 'background-color', 'rgb(255, 255, 255)');
  });
});

describe('IconButton — accessibility in a real browser', () => {
  it('has no violations across the variants (light)', () => {
    mountOnSurface(
      <>
        {VARIANTS.map((variant) => (
          <IconButton key={variant} variant={variant} aria-label={variant} icon={<PlusIcon />} />
        ))}
      </>
    );
    checkA11y();
  });

  it('has no violations across the variants (dark)', () => {
    mountOnSurface(
      <>
        {VARIANTS.map((variant) => (
          <IconButton key={variant} variant={variant} aria-label={variant} icon={<PlusIcon />} />
        ))}
      </>,
      'dark'
    );
    checkA11y();
  });

  it('has no violations while loading', () => {
    mountOnSurface(<IconButton loading aria-label="Add item" icon={<PlusIcon />} />);
    checkA11y();
  });
});
