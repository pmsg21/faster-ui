import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * `tailwind-merge` resolves conflicts from a built-in map of Tailwind's DEFAULT
 * scale. Our semantic tokens are not in it, and unknown classes are guessed at —
 * which fails in both directions:
 *
 *  - `text-body` (a font size) and `text-content-primary` (a colour) were read as
 *    the same group, so the size was silently dropped from every button.
 *  - `rounded-control` was not recognised as a radius at all, so a consumer's
 *    `rounded-full` did not override it — both survived and stylesheet order
 *    decided the winner.
 *
 * The second one matters beyond tidiness: "a consumer's `className` wins" is a
 * rule of this design system, and the Design Fidelity stories rely on it to
 * render the Figma-faithful variants through `className` alone, with no
 * escape-hatch props (see docs/design-fidelity.md).
 *
 * So the merger is taught our scales. Any NEW token in an ambiguous namespace —
 * `text-*` above all, where colour and font size collide — has to be added here.
 * `cn.test.ts` pins the behaviour so a missing entry fails a test rather than
 * quietly deleting a class at runtime.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // The type scale (docs/tokens.md). Without this, every one of these reads
      // as a text COLOUR and annihilates the real colour class, or vice versa.
      'font-size': [{ text: ['h1', 'h2', 'h3', 'title', 'subtitle', 'body', 'caption'] }],
      // The radius scale.
      rounded: [{ rounded: ['control'] }],
    },
  },
});

/**
 * Compose class names so that **the consumer always wins**.
 *
 * `clsx` flattens the conditional / array / object forms; `twMerge` then resolves
 * Tailwind conflicts by keeping the LAST occurrence of a conflicting utility.
 * That ordering is the whole point: a component builds its own classes first and
 * spreads the consumer's `className` last, so `<Button className="rounded-full">`
 * overrides `rounded-control` instead of losing to it — or worse, emitting two
 * competing rules whose winner depends on stylesheet order.
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
