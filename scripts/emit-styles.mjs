import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Compiles the publishable stylesheet, then verifies the package manifest against
 * what is actually on disk.
 *
 * We ship REAL CSS — utilities included — so that `import
 * '@pmsg21/faster-ui/styles.css'` is sufficient on its own, in any project, with or
 * without Tailwind. An earlier version emitted only the token layer; that made the
 * documented import a lie, because a consumer would have received the CSS variables
 * and no `.bg-accent-solid` rule to use them.
 *
 * The compile runs through Tailwind's own CLI rather than a hand-rolled extractor:
 * finding class candidates in a bundle is exactly the job the official scanner does,
 * and a bespoke regex would silently drop whatever it failed to match.
 *
 * Note the shape of the manifest check below, because the first version of it was
 * useless: it copied to whatever path the manifest declared, then asserted that path
 * existed. That can never fail. The emit target is now FIXED, and verification is a
 * separate pass — so a `"./styles.css"` export pointing anywhere else fails the build
 * instead of silently dragging the output along with it.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(root, 'src/styles/dist.css');
const outDir = join(root, 'dist');
const EMITTED = 'dist/styles.css';

if (!existsSync(entry)) {
  throw new Error(`emit-styles: stylesheet entry not found at ${entry}`);
}
if (!existsSync(join(root, 'dist/index.js'))) {
  throw new Error(
    'emit-styles: dist/index.js is missing. The stylesheet is compiled by scanning the ' +
      'built bundle, so `vite build` has to run first.'
  );
}

mkdirSync(outDir, { recursive: true });

execFileSync(
  process.execPath,
  [
    join(root, 'node_modules/@tailwindcss/cli/dist/index.mjs'),
    '--input',
    entry,
    '--output',
    join(root, EMITTED),
  ],
  { cwd: root, stdio: 'inherit' }
);

// A compile that silently produced no utilities would still write a file and still
// pass every check below, so assert that the classes the components actually depend
// on came out the other side.
const emitted = readFileSync(join(root, EMITTED), 'utf8');
const MUST_CONTAIN = [
  '.bg-accent-solid',
  '.rounded-control',
  '.rounded-full',
  '--color-accent-solid',
  "[data-theme='dark']",
];
const missing = MUST_CONTAIN.filter((needle) => !emitted.includes(needle));
if (missing.length > 0) {
  throw new Error(
    `emit-styles: ${EMITTED} compiled but is missing ${missing.join(', ')} — the scan ` +
      'found no candidates, so consumers would get an empty stylesheet.'
  );
}
// Signatures unique to preflight. Deliberately NOT `*, ::before, ::after` — Tailwind
// emits that selector for its own `--tw-*` custom-property fallbacks, which are
// required by the utilities and have nothing to do with resetting the document.
const PREFLIGHT_MARKERS = ['abbr:where([title])', 'h1, h2, h3, h4, h5, h6', 'ol, ul, menu'];
const reset = PREFLIGHT_MARKERS.filter((marker) => emitted.includes(marker));
if (reset.length > 0) {
  throw new Error(
    `emit-styles: ${EMITTED} contains a global reset (${reset.join(', ')}). Preflight must ` +
      'stay out of the published stylesheet — see the comment in src/styles/dist.css.'
  );
}

console.log(`emit-styles: wrote ${EMITTED} (${statSync(join(root, EMITTED)).size} bytes)`);

// ── Verify the manifest against the filesystem ──────────────────────────────
// A subpath export that resolves to nothing is a package that installs, builds and
// type-checks, and only fails at a consumer's `@import`. Every declared target is
// checked, not just the CSS one.

const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const problems = [];

for (const [subpath, target] of Object.entries(manifest.exports ?? {})) {
  const targets = typeof target === 'string' ? { default: target } : target;
  for (const [condition, declared] of Object.entries(targets)) {
    if (typeof declared !== 'string' || !declared.startsWith('./dist/')) continue;
    const onDisk = join(root, declared);
    if (!existsSync(onDisk)) {
      problems.push(`  "${subpath}" (${condition}) declares ${declared}, which was not built`);
    } else if (statSync(onDisk).size === 0) {
      problems.push(`  "${subpath}" (${condition}) declares ${declared}, which is empty`);
    }
  }
}

if (problems.length > 0) {
  throw new Error(`package.json exports do not match the build output:\n${problems.join('\n')}`);
}

console.log(`emit-styles: every dist export in package.json resolves`);
