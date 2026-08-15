import { cn } from './cn';

// These are regression tests, not unit-test box-ticking. Both cases below were
// live bugs found by the first component test: tailwind-merge only knows
// Tailwind's default scale, and it guesses at everything else — silently, at
// runtime, by deleting a class.
describe('cn — custom scales are known to the merger', () => {
  it('keeps a type-scale size alongside a text colour', () => {
    // The bug: `text-body` (font size) and `text-content-primary` (colour) were
    // read as one group, so every button lost its size.
    const result = cn('text-body', 'text-content-primary');
    expect(result).toContain('text-body');
    expect(result).toContain('text-content-primary');
  });

  it('still collapses two competing type-scale sizes', () => {
    expect(cn('text-body', 'text-caption')).toBe('text-caption');
  });

  it('still collapses two competing text colours', () => {
    expect(cn('text-content-primary', 'text-content-danger')).toBe('text-content-danger');
  });

  it('lets a consumer radius override the token radius', () => {
    // The bug: `rounded-control` was not recognised as a radius, so both classes
    // survived and stylesheet order picked the winner.
    expect(cn('rounded-control', 'rounded-full')).toBe('rounded-full');
  });

  it('lets the token radius override a default-scale radius', () => {
    expect(cn('rounded-sm', 'rounded-control')).toBe('rounded-control');
  });
});

describe('cn — composition', () => {
  it('keeps the last of two conflicting utilities', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('resolves semantic background tokens against each other', () => {
    expect(cn('bg-accent-solid', 'bg-danger-solid')).toBe('bg-danger-solid');
  });

  it('flattens conditional and array forms', () => {
    const isCompact: boolean = false;
    const result = cn('flex', ['gap-1', isCompact && 'px-1'], {
      'font-medium': true,
      underline: false,
    });
    expect(result).toBe('flex gap-1 font-medium');
  });

  it('ignores nullish input', () => {
    expect(cn(undefined, null, 'flex')).toBe('flex');
  });
});
