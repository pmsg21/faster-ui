import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';

import type { ButtonSize } from '../Button';
import { IconButton } from './IconButton';
import type { IconButtonVariant } from './IconButton';

const VARIANTS: IconButtonVariant[] = ['primary', 'outline', 'ghost'];
const SIZES: ButtonSize[] = ['sm', 'md', 'lg'];

const PlusIcon = () => <svg data-testid="icon" viewBox="0 0 24 24" />;

describe('IconButton — rendering', () => {
  it('takes its accessible name from aria-label', () => {
    render(<IconButton aria-label="Add item" icon={<PlusIcon />} />);
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
  });

  it('hides the glyph from the accessible name', () => {
    render(<IconButton aria-label="Add item" icon={<PlusIcon />} />);
    expect(screen.getByRole('button')).toHaveAccessibleName('Add item');
    expect(screen.getByTestId('icon').closest('[data-slot=icon]')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });

  it('forwards a ref to the underlying element', () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<IconButton ref={ref} aria-label="Add item" icon={<PlusIcon />} />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it.each(VARIANTS)('renders the %s variant', (variant) => {
    render(<IconButton variant={variant} aria-label="Add item" icon={<PlusIcon />} />);
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
  });

  it.each(SIZES)('renders the %s size', (size) => {
    render(<IconButton size={size} aria-label="Add item" icon={<PlusIcon />} />);
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
  });
});

describe('IconButton — shape (the Figma Fillet axis)', () => {
  // The design carries this as prose plus an instance override, not as a variant
  // property, so an extraction that walks only the component set misses it — which
  // is exactly what happened. See docs/decisions.md.
  it('is round by default, matching what the component set draws', () => {
    render(<IconButton aria-label="Add item" icon={<PlusIcon />} />);
    expect(screen.getByRole('button')).toHaveClass('rounded-full');
  });

  it('takes the square corner when asked', () => {
    render(<IconButton shape="square" aria-label="Add item" icon={<PlusIcon />} />);
    const button = screen.getByRole('button');
    // The same radius Button uses — no token was invented for this.
    expect(button).toHaveClass('rounded-control');
    expect(button).not.toHaveClass('rounded-full');
  });

  it.each(SIZES)('keeps the square corner at %s', (size) => {
    render(<IconButton shape="square" size={size} aria-label="Add item" icon={<PlusIcon />} />);
    expect(screen.getByRole('button')).toHaveClass('rounded-control');
  });

  it('stays square-footprinted in both shapes', () => {
    // Shape changes the corner, never the box: a square-cornered icon button is
    // still 36×36, not a wide pill.
    for (const shape of ['round', 'square'] as const) {
      const { unmount } = render(
        <IconButton shape={shape} aria-label="Add item" icon={<PlusIcon />} />
      );
      expect(screen.getByRole('button')).toHaveClass('size-9');
      unmount();
    }
  });
});

describe('IconButton — geometry comes from the shared matrix', () => {
  it('overrides the boxed radius, padding and min-width', () => {
    // The square classes are appended after Button's own and resolved by twMerge.
    // If that resolution ever broke, the control would render as a wide pill.
    render(<IconButton aria-label="Add item" icon={<PlusIcon />} />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('rounded-full');
    expect(button).not.toHaveClass('rounded-control');
    expect(button).toHaveClass('size-9');
    expect(button).not.toHaveClass('min-w-[6.125rem]');
    expect(button).not.toHaveClass('px-2');
  });

  it('still lets a consumer className win', () => {
    render(<IconButton aria-label="Add item" icon={<PlusIcon />} className="rounded-control" />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('rounded-control');
    expect(button).not.toHaveClass('rounded-full');
  });
});

describe('IconButton — behaviour is shared with Button, not reimplemented', () => {
  it('defaults to type="button"', () => {
    render(<IconButton aria-label="Add item" icon={<PlusIcon />} />);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('calls onClick when activated', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<IconButton aria-label="Add item" icon={<PlusIcon />} onClick={onClick} />);

    expect(onClick).toHaveBeenCalledTimes(0);

    await user.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('uses aria-disabled, stays focusable, and blocks activation', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<IconButton disabled aria-label="Add item" icon={<PlusIcon />} onClick={onClick} />);
    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
    expect(onClick).toHaveBeenCalledTimes(0);

    await user.tab();
    expect(button).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(0);

    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(0);
  });

  it('announces and blocks while loading', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<IconButton loading aria-label="Add item" icon={<PlusIcon />} onClick={onClick} />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    expect(onClick).toHaveBeenCalledTimes(0);

    await user.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(0);
  });

  it('swaps the glyph for the spinner while loading', () => {
    render(<IconButton loading aria-label="Add item" icon={<PlusIcon />} />);
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
  });
});

describe('IconButton — accessibility', () => {
  it.each(VARIANTS)('has no axe violations (%s)', async (variant) => {
    const { container } = render(
      <IconButton variant={variant} aria-label="Add item" icon={<PlusIcon />} />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations when disabled', async () => {
    const { container } = render(<IconButton disabled aria-label="Add item" icon={<PlusIcon />} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations when loading', async () => {
    const { container } = render(<IconButton loading aria-label="Add item" icon={<PlusIcon />} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
