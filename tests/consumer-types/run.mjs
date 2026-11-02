#!/usr/bin/env node
// Consumer type check of a packed @passflow/react tarball.
//
//   node tests/consumer-types/run.mjs <passflow-react-x.y.z.tgz> [--work <dir>]
//
// For each variant in legs.json (React/router/@types pins), installs the tarball into <work>/<variant> with
// pnpm (scripts disabled, the repo's release-age policy copied in), copies src/ and the tsconfigs there, and
// type-checks every config (bundler, node16, nodenext) with every TypeScript leg. Then runs the pinned
// @arethetypeswrong/cli on the tarball. Exits 1 if any check fails.
//
// The work dir must be outside this repo's pnpm workspace; the default is <os tmpdir>/passflow-consumer-types.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const legs = JSON.parse(readFileSync(join(here, 'legs.json'), 'utf8'));

const args = process.argv.slice(2);
const workFlag = args.indexOf('--work');
const work = resolve(workFlag >= 0 ? args[workFlag + 1] : join(tmpdir(), 'passflow-consumer-types'));
const tarball = args.find((a, i) => !a.startsWith('--') && (workFlag < 0 || i !== workFlag + 1));
if (!tarball || !existsSync(tarball)) {
  console.error('usage: node tests/consumer-types/run.mjs <passflow-react-x.y.z.tgz> [--work <dir>]');
  process.exit(2);
}
const tgz = resolve(tarball);
const packageManager = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8')).packageManager;

const run = (cmd, cmdArgs, cwd) => {
  const r = spawnSync(cmd, cmdArgs, { cwd, encoding: 'utf8', env: { ...process.env, CI: 'true' } });
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() };
};

const results = [];
const record = (name, r) => {
  results.push({ name, ok: r.ok });
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!r.ok) console.log(r.out.replace(/^/gm, '      '));
};

let attwDir;
for (const [variant, deps] of Object.entries(legs.variants)) {
  const dir = join(work, variant);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'package.json'),
    `${JSON.stringify(
      {
        name: `consumer-types-${variant}`,
        private: true,
        type: 'module',
        packageManager,
        dependencies: { '@passflow/react': `file:${tgz}`, ...deps, ...legs.tools },
      },
      null,
      2,
    )}\n`,
  );
  // Same supply-chain policy as the repo (minimum release age, first-party excludes).
  cpSync(join(repo, 'pnpm-workspace.yaml'), join(dir, 'pnpm-workspace.yaml'));
  for (const name of readdirSync(here)) {
    if (name === 'src' || /^tsconfig\..*\.json$/.test(name)) cpSync(join(here, name), join(dir, name), { recursive: true });
  }

  const install = run('pnpm', ['install', '--ignore-scripts'], dir);
  record(`${variant}: install`, install);
  if (!install.ok) continue;
  attwDir ??= dir;

  for (const [tsVersion, tsPackage] of Object.entries(legs.typescript)) {
    const tsc = join(dir, 'node_modules', tsPackage, 'bin', 'tsc');
    for (const config of legs.configs) {
      record(`${variant}: TS ${tsVersion} ${config}`, run(process.execPath, [tsc, '-p', `tsconfig.${config}.json`], dir));
    }
  }
}

if (attwDir) {
  const attw = join(attwDir, 'node_modules', '@arethetypeswrong', 'cli', 'dist', 'index.js');
  const attwArgs = [attw, tgz, '--format', 'table-flipped', ...(legs.attw?.args ?? [])];
  record(`attw ${basename(tgz)} ${(legs.attw?.args ?? []).join(' ')}`.trim(), run(process.execPath, attwArgs, attwDir));
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length > 0 ? 1 : 0);
