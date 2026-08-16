import type { FormEvent } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';

import { Button } from './Button';
import type { ButtonSize, ButtonTone, ButtonVariant } from './Button';

const VARIANTS: ButtonVariant[] = ['primary', 'outline', 'ghost', 'link'];
const TONES: ButtonTone[] = ['accent', 'danger'];
const SIZES: ButtonSize[] = ['sm', 'md', 'lg'];

describe('Button — rendering', () => {
  it('renders a button element with its label', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('forwards a ref to the underlying element', () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<Button ref={ref}>Save</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('lets a consumer className win over the component class', () => {
    render(<Button className="rounded-full">Save</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('rounded-full');
    expect(button).not.toHaveClass('rounded-control');
  });

  it('passes arbitrary button attributes through', () => {
    render(<Button data-testid="cta">Save</Button>);
    expect(screen.getByTestId('cta')).toBeInTheDocument();
  });
});

describe('Button — variants, tones and sizes', () => {
  it.each(VARIANTS)('renders the %s variant', (variant) => {
    render(<Button variant={variant}>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it.each(TONES)('renders the %s tone', (tone) => {
    render(<Button tone={tone}>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it.each(SIZES)('renders the %s size', (size) => {
    render(<Button size={size}>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders every variant × tone × size combination', () => {
    for (const variant of VARIANTS) {
      for (const tone of TONES) {
        for (const size of SIZES) {
          const { unmount } = render(
            <Button variant={variant} tone={tone} size={size}>
              Save
            </Button>
          );
          expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
          unmount();
        }
      }
    }
  });

  it.each([
    ['sm', 'text-caption'],
    ['md', 'text-body'],
    ['lg', 'text-subtitle'],
  ] as const)('keeps the %s type token alongside the tone colour', (size, typeToken) => {
    // Regression: tailwind-merge read the type scale and the text colour as one
    // group and dropped the size from every button. See src/lib/cn.ts.
    render(<Button size={size}>Save</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass(typeToken);
    expect(button).toHaveClass('text-content-on-accent');
  });

  it('underlines the link variant in every state, not only on hover', () => {
    // SC 1.4.1: the source distinguishes a link by colour alone. A hover-only
    // underline is still colour-only at rest, which is where the rule applies.
    render(<Button variant="link">Read more</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('underline');
    expect(button.className).not.toMatch(/hover:underline/);
  });
});

describe('Button — type attribute', () => {
  it('defaults to type="button" so it cannot submit a form by accident', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('still allows an explicit submit', () => {
    render(<Button type="submit">Save</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });
});

describe('Button — interaction', () => {
  it('calls onClick when activated', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Save</Button>);

    expect(onClick).toHaveBeenCalledTimes(0);

    await user.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('activates on Enter and on Space', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Save</Button>);

    expect(onClick).toHaveBeenCalledTimes(0);

    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);

    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('submits its form when type="submit"', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn((event: FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit">Save</Button>
      </form>
    );

    expect(onSubmit).toHaveBeenCalledTimes(0);

    await user.click(screen.getByRole('button'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('Button — disabled', () => {
  it('uses aria-disabled and never the native attribute', () => {
    render(<Button disabled>Save</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    // The native attribute would remove the control from the tab order, so a
    // keyboard or screen-reader user could never discover it exists.
    expect(button).not.toBeDisabled();
  });

  it('stays reachable by keyboard', async () => {
    const user = userEvent.setup();
    render(<Button disabled>Save</Button>);

    expect(screen.getByRole('button')).not.toHaveFocus();

    await user.tab();

    expect(screen.getByRole('button')).toHaveFocus();
  });

  it('suppresses onClick', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>
    );

    expect(onClick).toHaveBeenCalledTimes(0);

    await user.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(0);
  });

  it('does not submit its form even as type="submit"', async () => {
    // aria-disabled does not stop a submit button submitting; only
    // preventDefault does. This is the regression this test exists for.
    const user = userEvent.setup();
    const onSubmit = jest.fn((event: FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit" disabled>
          Save
        </Button>
      </form>
    );

    expect(onSubmit).toHaveBeenCalledTimes(0);

    await user.click(screen.getByRole('button'));

    expect(onSubmit).toHaveBeenCalledTimes(0);
  });

  it('suppresses activation by keyboard too, key by key', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>
    );

    expect(onClick).toHaveBeenCalledTimes(0);

    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(0);

    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(0);
  });
});

describe('Button — loading', () => {
  it('announces itself with aria-busy', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('gives the spinner a text alternative', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button', { name: /Loading/ })).toBeInTheDocument();
  });

  it('accepts a custom loading label', () => {
    render(
      <Button loading loadingLabel="Saving changes">
        Save
      </Button>
    );
    expect(screen.getByRole('button', { name: /Saving changes/ })).toBeInTheDocument();
  });

  it('blocks activation while loading', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>
    );

    expect(onClick).toHaveBeenCalledTimes(0);

    await user.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(0);
  });

  it('respects prefers-reduced-motion via a motion-safe animation', () => {
    // The spin is opt-in on motion preference rather than unconditional; a
    // media query cannot be asserted in jsdom, so the guard is the variant.
    const { container } = render(<Button loading>Save</Button>);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('motion-safe:animate-spin');
    expect(svg?.getAttribute('class')).not.toMatch(/(^|\s)animate-spin/);
  });
});

describe('Button — icons', () => {
  it('hides a start icon from the accessible name', () => {
    render(<Button startIcon={<svg data-testid="icon" />}>Save</Button>);
    expect(screen.getByRole('button')).toHaveAccessibleName('Save');
    expect(screen.getByTestId('icon').closest('[data-slot=icon]')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });

  it('hides an end icon from the accessible name', () => {
    render(<Button endIcon={<svg data-testid="icon" />}>Save</Button>);
    expect(screen.getByRole('button')).toHaveAccessibleName('Save');
    expect(screen.getByTestId('icon').closest('[data-slot=icon]')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });

  it('replaces the start icon with the spinner while loading', () => {
    render(
      <Button loading startIcon={<svg data-testid="icon" />}>
        Save
      </Button>
    );
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
  });
});

describe('Button — accessibility', () => {
  it.each(VARIANTS)('has no axe violations (%s)', async (variant) => {
    const { container } = render(<Button variant={variant}>Save</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });

  it.each(TONES)('has no axe violations (%s tone)', async (tone) => {
    const { container } = render(<Button tone={tone}>Save</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations when disabled', async () => {
    const { container } = render(<Button disabled>Save</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations when loading', async () => {
    const { container } = render(<Button loading>Save</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations with icons', async () => {
    const { container } = render(
      <Button startIcon={<svg />} endIcon={<svg />}>
        Save
      </Button>
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
