// Rewrites the declaration files that `tsc -p tsconfig.build.json` + tsc-alias emit into dist/src so that
// they resolve under moduleResolution node16 / nodenext, not only bundler:
// - every relative specifier gets its full path: './x' -> './x.js' when x.d.ts exists,
//   './x' -> './x/index.js' when x/index.d.ts exists (tsc keeps them as written in the sources);
// - side-effect imports (`import './style.css';`) are removed, as vite-plugin-dts did before: the CSS files
//   they name are not in dist/src (the bundle ships one dist/style.css), and keeping
//   `import './utils/get-app-version.js'` would newly expose its global `Window` augmentation to consumers.
// A relative specifier that matches no declaration file fails the build.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'src');

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const sideEffectImport = /^import\s+(['"])[^'"]+\1;?[ \t]*\r?\n/gm;
// `from '…'`, `import('…')` and `export * from '…'` all end in the quoted specifier matched here.
const specifier = /(\bfrom\s*|\bimport\s*\(\s*)(['"])(\.{1,2}\/[^'"]*|\.{1,2})\2/g;

const errors = [];
let files = 0;
let rewritten = 0;
let removed = 0;

for (const file of walk(root).filter((f) => f.endsWith('.d.ts'))) {
  const source = readFileSync(file, 'utf8');
  let output = source.replace(sideEffectImport, () => {
    removed++;
    return '';
  });
  output = output.replace(specifier, (match, lead, quote, spec) => {
    if (spec.endsWith('.js')) return match;
    const target = resolve(dirname(file), spec);
    let full;
    if (existsSync(`${target}.d.ts`)) full = `${spec}.js`;
    else if (existsSync(join(target, 'index.d.ts'))) full = `${spec.replace(/\/$/, '')}/index.js`;
    else {
      errors.push(`${relative(root, file)}: ${spec}`);
      return match;
    }
    rewritten++;
    return `${lead}${quote}${full}${quote}`;
  });
  if (output !== source) {
    writeFileSync(file, output);
    files++;
  }
}

if (errors.length > 0) {
  console.error(`fix-dts-specifiers: no declaration file for ${errors.length} specifier(s):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`fix-dts-specifiers: ${rewritten} specifiers completed, ${removed} side-effect imports removed, ${files} files`);
