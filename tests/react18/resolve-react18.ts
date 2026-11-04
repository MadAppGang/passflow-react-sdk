// Vite aliases do not reach CommonJS. react-dom-18 require()s 'react' natively, and pnpm
// satisfies its peer with the project's React 19, so native resolution is redirected too.
import Module, { createRequire } from 'node:module';
import path from 'node:path';

type ResolveFilename = (this: unknown, request: string, ...rest: unknown[]) => string;
const nodeModule = Module as unknown as { _resolveFilename: ResolveFilename };

const fromRoot = createRequire(path.resolve(import.meta.dirname, '../../package.json'));
const resolveFilename = nodeModule._resolveFilename;

nodeModule._resolveFilename = function (request, ...rest) {
  const match = /^(react|react-dom)(\/.*)?$/.exec(request);
  if (match) return fromRoot.resolve(`${match[1]}-18${match[2] ?? ''}`);
  return resolveFilename.call(this, request, ...rest);
};
