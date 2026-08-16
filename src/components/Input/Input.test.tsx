import { createRef, useState } from 'react';
import type { FormEvent } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';

import { Input } from './Input';
import type { InputSize } from './Input';

const SIZES: InputSize[] = ['sm', 'md', 'lg'];

/** The field box — the element that carries every visual state. */
function field() {
  return document.querySelector('[data-slot="field"]');
}

describe('Input — rendering', () => {
  it('associates the visible label with the control', () => {
    render(<Input label="Email address" />);
    // getByLabelText resolves through the accessibility tree, so this passes only if
    // htmlFor/id actually match — the association, not merely the presence of a label.
    expect(screen.getByLabelText('Email address')).toBe(screen.getByRole('textbox'));
  });

  it('generates a unique id per instance when none is supplied', () => {
    render(
      <>
        <Input label="First" />
        <Input label="Second" />
      </>
    );
    const first = screen.getByLabelText('First');
    const second = screen.getByLabelText('Second');
    expect(first.id).not.toBe('');
    expect(first.id).not.toBe(second.id);
  });

  it('honours a consumer-supplied id', () => {
    render(<Input label="Email" id="signup-email" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'signup-email');
  });

  it('renders prefix, suffix and icons', () => {
    render(
      <Input
        label="Amount"
        prefix="¥"
        suffix="CNY"
        startIcon={<svg data-testid="start" />}
        endIcon={<svg data-testid="end" />}
      />
    );
    expect(screen.getByText('¥')).toBeInTheDocument();
    expect(screen.getByText('CNY')).toBeInTheDocument();
    expect(screen.getByTestId('start')).toBeInTheDocument();
    expect(screen.getByTestId('end')).toBeInTheDocument();
  });

  it('hides decorative icons from the accessible name', () => {
    render(<Input label="Search" startIcon={<svg data-testid="glyph" />} />);
    // The name comes from the label alone; a glyph must not leak into it.
    expect(screen.getByRole('textbox')).toHaveAccessibleName('Search');
    expect(screen.getByTestId('glyph').closest('[data-slot="icon"]')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });

  it('lets a consumer className win over the component class', () => {
    render(<Input label="Email" className="w-64" />);
    // className lands on the root wrapper, which owns width.
    expect(screen.getByLabelText('Email').closest('.w-64')).toBeInTheDocument();
  });

  it('forwards a callback ref to the control itself, not the wrapper', () => {
    let node: HTMLInputElement | null = null;
    render(
      <Input
        label="Email"
        ref={(element) => {
          node = element;
        }}
      />
    );
    expect(node).toBeInstanceOf(HTMLInputElement);
  });

  it('forwards an object ref too', () => {
    // Both forms, because the component merges the consumer's ref with its own handle
    // (needed for focus restoration) and the merge has a branch per form. Testing only
    // the callback form leaves the object branch unexecuted — the commoner form in
    // consumer code, since `useRef` is what most people reach for.
    const ref = createRef<HTMLInputElement>();
    render(<Input label="Email" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toBe(screen.getByRole('textbox'));
  });
});

describe('Input — the label is not optional', () => {
  it('keeps a hidden label in the accessibility tree', () => {
    render(<Input label="Search products" labelHidden />);
    // Still reachable by its name — sr-only, never `display: none`, because a hidden
    // label is a label, not an absent one.
    expect(screen.getByLabelText('Search products')).toBeInTheDocument();
    expect(screen.getByText('Search products')).toHaveClass('sr-only');
  });

  it('does not treat a placeholder as a name', () => {
    render(<Input label="Email" placeholder="you@example.com" />);
    // A placeholder disappears on input (SC 3.3.2), so it must never be the name.
    expect(screen.getByRole('textbox')).toHaveAccessibleName('Email');
  });
});

describe('Input — sizes', () => {
  it.each([
    ['sm', 'min-h-6'],
    ['md', 'min-h-9'],
    ['lg', 'min-h-10'],
  ] as const)('applies the %s height', (size, heightClass) => {
    render(<Input label="Email" size={size} />);
    expect(field()).toHaveClass(heightClass);
  });

  it.each([
    ['sm', 'text-caption'],
    ['md', 'text-body'],
    ['lg', 'text-subtitle'],
  ] as const)('applies the %s type token to the field', (size, typeToken) => {
    render(<Input label="Email" size={size} />);
    expect(field()).toHaveClass(typeToken);
  });

  it('keeps help text at Body for both lg and md, and Caption only at sm', () => {
    // Extracted from the `space` section: the help-text scale does NOT track the field
    // scale. lg is Subtitle 16/24 in the field but Body 14/22 below it.
    const { unmount } = render(<Input label="Email" size="lg" hint="Large hint" />);
    expect(screen.getByText('Large hint')).toHaveClass('text-body');
    unmount();

    render(<Input label="Email" size="sm" hint="Small hint" />);
    expect(screen.getByText('Small hint')).toHaveClass('text-caption');
  });
});

describe('Input — hint and error wiring', () => {
  it('describes the field with the hint', () => {
    render(<Input label="Password" id="pw" hint="At least 8 characters" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'pw-hint');
    expect(screen.getByText('At least 8 characters')).toHaveAttribute('id', 'pw-hint');
  });

  it('lists the hint before the error, so the rule precedes the breach', () => {
    render(<Input label="Password" id="pw" hint="At least 8 characters" error="Too short" />);
    // Order is the assertion. Reversed, a screen reader announces the correction
    // before the thing being corrected.
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'pw-hint pw-error');
  });

  it('omits aria-describedby entirely when there is nothing to describe', () => {
    render(<Input label="Email" />);
    // Not an empty string: that is still a valid attribute pointing at nothing.
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-describedby');
  });

  it('marks the field invalid from the presence of an error alone', () => {
    render(<Input label="Email" error="Enter a valid address" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    expect(field()).toHaveAttribute('data-invalid', 'true');
  });

  it('is not invalid without an error', () => {
    render(<Input label="Email" />);
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
    expect(field()).not.toHaveAttribute('data-invalid');
  });

  it('mounts the alert region before there is an error to put in it', () => {
    // The reason the region is always present: screen readers announce a live
    // region's CONTENT CHANGES reliably, but vary on a region that appears
    // already-populated. Mounting up front removes the variance.
    render(<Input label="Email" id="em" />);
    const alert = document.getElementById('em-error');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toBeEmptyDOMElement();
  });

  it('puts the message into the existing region when an error appears', () => {
    const { rerender } = render(<Input label="Email" id="em" />);
    const before = document.getElementById('em-error');
    expect(before).toBeEmptyDOMElement();

    rerender(<Input label="Email" id="em" error="Enter a valid address" />);

    const after = document.getElementById('em-error');
    // Same node, new content — that is what makes the announcement reliable.
    expect(after).toBe(before);
    expect(after).toHaveTextContent('Enter a valid address');
  });
});

describe('Input — interaction', () => {
  it('reports every keystroke to onChange', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Input label="Email" onChange={onChange} />);

    expect(onChange).toHaveBeenCalledTimes(0);

    await user.type(screen.getByRole('textbox'), 'ab');

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('textbox')).toHaveValue('ab');
  });

  it('focuses the control when its label is clicked', async () => {
    const user = userEvent.setup();
    render(<Input label="Email address" />);

    expect(screen.getByRole('textbox')).not.toHaveFocus();

    await user.click(screen.getByText('Email address'));

    expect(screen.getByRole('textbox')).toHaveFocus();
  });
});

describe('Input — disabled uses the native attribute', () => {
  it('renders the native attribute, not aria-disabled', () => {
    render(<Input label="Email" disabled />);
    const control = screen.getByRole('textbox');
    // Deliberately the opposite of Button. See the component JSDoc: under
    // aria-disabled the value would still submit, which is a data bug.
    expect(control).toBeDisabled();
    expect(control).not.toHaveAttribute('aria-disabled');
  });

  it('excludes the value from form submission', async () => {
    // This is the whole reason for the asymmetry with Button, so it is asserted
    // rather than left as a comment.
    const user = userEvent.setup();
    const seen: string[] = [];
    function onSubmit(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      seen.push(...[...new FormData(event.currentTarget).keys()]);
    }
    render(
      <form onSubmit={onSubmit}>
        <Input label="Email" name="email" defaultValue="a@b.com" disabled />
        <button type="submit">Save</button>
      </form>
    );

    expect(seen).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(seen).toEqual([]);
  });

  it('submits the value when not disabled', async () => {
    // The counterpart, so the test above cannot pass because submission is broken.
    const user = userEvent.setup();
    const seen: string[] = [];
    function onSubmit(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      seen.push(...[...new FormData(event.currentTarget).keys()]);
    }
    render(
      <form onSubmit={onSubmit}>
        <Input label="Email" name="email" defaultValue="a@b.com" />
        <button type="submit">Save</button>
      </form>
    );

    expect(seen).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(seen).toEqual(['email']);
  });

  it('marks the field box disabled so affixes can dim with it', () => {
    render(<Input label="Amount" prefix="¥" disabled />);
    expect(field()).toHaveAttribute('data-disabled', 'true');
  });
});

describe('Input — clear control', () => {
  function Controlled({ onClear }: { onClear: () => void }) {
    const [value, setValue] = useState('hello');
    return (
      <Input
        label="Search products"
        value={value}
        clearable
        onChange={(event) => setValue(event.target.value)}
        onClear={() => {
          setValue('');
          onClear();
        }}
      />
    );
  }

  it('is absent while there is nothing to clear', () => {
    render(<Input label="Search" clearable onClear={jest.fn()} />);
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
  });

  it('appears once the field holds a value', async () => {
    const user = userEvent.setup();
    render(<Input label="Search" clearable onClear={jest.fn()} />);

    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();

    await user.type(screen.getByRole('textbox'), 'a');

    expect(screen.getByRole('button', { name: 'Clear Search' })).toBeInTheDocument();
  });

  it('names what it clears, not merely "Clear"', () => {
    render(<Input label="Email address" clearable defaultValue="a@b.com" onClear={jest.fn()} />);
    // "Clear" alone identifies nothing in a form of six fields.
    expect(screen.getByRole('button', { name: 'Clear Email address' })).toBeInTheDocument();
  });

  it('accepts an explicit clearLabel', () => {
    render(
      <Input
        label="Q"
        clearable
        defaultValue="x"
        clearLabel="Clear the product search"
        onClear={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Clear the product search' })).toBeInTheDocument();
  });

  it('calls onClear and empties a controlled field', async () => {
    const user = userEvent.setup();
    const onClear = jest.fn();
    render(<Controlled onClear={onClear} />);

    expect(onClear).toHaveBeenCalledTimes(0);
    expect(screen.getByRole('textbox')).toHaveValue('hello');

    await user.click(screen.getByRole('button', { name: 'Clear Search products' }));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('empties an uncontrolled field itself', async () => {
    const user = userEvent.setup();
    render(<Input label="Search" clearable onClear={jest.fn()} />);
    const control = screen.getByRole('textbox');

    await user.type(control, 'shoes');
    expect(control).toHaveValue('shoes');

    await user.click(screen.getByRole('button', { name: 'Clear Search' }));

    // An uncontrolled field has no prop to re-render from, so the component owns it.
    expect(control).toHaveValue('');
  });

  it('returns focus to the control after clearing', async () => {
    const user = userEvent.setup();
    render(<Input label="Search" clearable onClear={jest.fn()} />);
    const control = screen.getByRole('textbox');

    await user.type(control, 'shoes');
    await user.click(screen.getByRole('button', { name: 'Clear Search' }));

    // The button unmounts the instant the value empties. Without a deliberate move,
    // focus falls to <body> and the user is stranded mid-form.
    expect(control).toHaveFocus();
    expect(document.body).not.toHaveFocus();
  });

  it('is not rendered on a disabled field', () => {
    render(<Input label="Search" clearable defaultValue="shoes" disabled onClear={jest.fn()} />);
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
  });

  it('does not submit the form it sits in', async () => {
    // A bare <button> inside a form submits it. Same trap Button guards with an
    // explicit type, and it matters more here because the control is nested.
    const user = userEvent.setup();
    const onSubmit = jest.fn((event: FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Input label="Search" clearable defaultValue="shoes" onClear={jest.fn()} />
      </form>
    );

    expect(onSubmit).toHaveBeenCalledTimes(0);

    await user.click(screen.getByRole('button', { name: 'Clear Search' }));

    expect(onSubmit).toHaveBeenCalledTimes(0);
  });

  it('places the clear control after the field and before a trailing icon', () => {
    render(
      <Input
        label="Search"
        clearable
        defaultValue="shoes"
        endIcon={<svg data-testid="end" />}
        onClear={jest.fn()}
      />
    );
    const slots = [...(field()?.children ?? [])];
    const controlIndex = slots.findIndex((node) => node.tagName === 'INPUT');
    const clearIndex = slots.findIndex((node) => node.getAttribute('data-slot') === 'clear');
    const iconIndex = slots.findIndex((node) => node.getAttribute('data-slot') === 'icon');

    // DOM order is tab order. It also matches what the design draws: clear at
    // right-38px, trailing icon at right-12px.
    expect(controlIndex).toBeLessThan(clearIndex);
    expect(clearIndex).toBeLessThan(iconIndex);
  });

  it('reaches the clear control by keyboard, immediately after the field', async () => {
    const user = userEvent.setup();
    render(<Input label="Search" clearable defaultValue="shoes" onClear={jest.fn()} />);

    expect(screen.getByRole('textbox')).not.toHaveFocus();

    await user.tab();
    expect(screen.getByRole('textbox')).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Clear Search' })).toHaveFocus();
  });
});

describe('Input — accessibility', () => {
  it.each(SIZES)('has no axe violations (%s)', async (size) => {
    const { container } = render(<Input label="Email address" size={size} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations with a hidden label', async () => {
    const { container } = render(<Input label="Search products" labelHidden />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations with hint and error', async () => {
    const { container } = render(
      <Input label="Password" hint="At least 8 characters" error="Too short" />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations when disabled', async () => {
    const { container } = render(<Input label="Email" disabled />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations with every slot filled', async () => {
    const { container } = render(
      <Input
        label="Amount"
        prefix="¥"
        suffix="CNY"
        startIcon={<svg />}
        endIcon={<svg />}
        clearable
        defaultValue="100"
        onClear={jest.fn()}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Input — edge cases', () => {
  it('renders a long label without dropping the association', () => {
    const long = 'Enter the email address associated with your account so we can send a reset link';
    render(<Input label={long} />);
    expect(screen.getByLabelText(long)).toBeInTheDocument();
  });

  it('renders a long error message', () => {
    const long = 'That address is already registered. Sign in instead, or use a different address.';
    render(<Input label="Email" error={long} />);
    expect(screen.getByRole('alert')).toHaveTextContent(long);
  });
});
