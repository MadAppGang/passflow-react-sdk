// Mirrors dist/src/**/*.d.ts as *.d.cts for the CommonJS entry (exports["."].require.types).
// The package is "type": "module", so TypeScript reads every .d.ts in it as an ES module. A CommonJS
// consumer (module node16 / nodenext) needs declarations that describe dist/index.cjs as CommonJS, and
// those must be .d.cts files whose relative specifiers name .cjs files. Runs after fix-dts-specifiers.mjs,
// so every relative specifier already ends in .js.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'src');

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const specifier = /(\bfrom\s*|\bimport\s*\(\s*)(['"])(\.{1,2}\/[^'"]*)\2/g;

const errors = [];
let files = 0;

for (const file of walk(root).filter((f) => f.endsWith('.d.ts'))) {
  const output = readFileSync(file, 'utf8').replace(specifier, (match, lead, quote, spec) => {
    if (!spec.endsWith('.js') || !existsSync(resolve(dirname(file), spec.replace(/\.js$/, '.d.ts')))) {
      errors.push(`${relative(root, file)}: ${spec}`);
      return match;
    }
    return `${lead}${quote}${spec.replace(/\.js$/, '.cjs')}${quote}`;
  });
  writeFileSync(file.replace(/\.d\.ts$/, '.d.cts'), output);
  files++;
}

if (errors.length > 0) {
  console.error(`emit-cts-types: unexpected relative specifier(s):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`emit-cts-types: ${files} .d.cts files`);
