import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Compose class names so that **the consumer always wins**.
 *
 * `clsx` flattens the conditional / array / object forms; `twMerge` then resolves
 * Tailwind conflicts by keeping the LAST occurrence of a conflicting utility.
 * That ordering is the whole point: a component builds its own classes first and
 * spreads the consumer's `className` last, so `<Button className="rounded-full">`
 * overrides `rounded-control` instead of losing to it — or worse, emitting two
 * competing rules whose winner depends on stylesheet order.
 *
 * It is also what lets the Design Fidelity stories render the Figma-faithful
 * variants through `className` alone, with no escape-hatch props on the public
 * API (see docs/design-fidelity.md).
 */
export function cn(...inputs: ClassValue[]): string {
  // The tailwindcss plugin treats `clsx` as a class-bearing callee and reads this
  // rest parameter as if it were a literal class name. Here the argument is dynamic
  // by definition, so there is nothing to validate. The rule stays on everywhere
  // else, where it does real work — it catches a mistyped token inside a `cva`
  // variant map (`bg-acent-solid`).
  // eslint-disable-next-line tailwindcss/no-custom-classname
  return twMerge(clsx(inputs));
}
