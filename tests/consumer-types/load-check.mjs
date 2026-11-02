// Loads the installed @passflow/react in plain Node, with no DOM, through both entry points:
// `require` (dist/index.cjs) and `import` (dist/index.es.js). 0.14.0 failed both ways: require()
// returned {}, and the ESM entry threw on load. Run from a consumer dir by run.mjs.
import { createRequire } from 'node:module';

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

let cjs;
let esm;
try {
  cjs = createRequire(import.meta.url)('@passflow/react');
} catch (error) {
  fail(`require('@passflow/react') threw: ${error?.stack ?? error}`);
}
try {
  esm = await import('@passflow/react');
} catch (error) {
  fail(`import('@passflow/react') threw: ${error?.stack ?? error}`);
}

const cjsKeys = Object.keys(cjs).sort();
const esmKeys = Object.keys(esm)
  .filter((key) => key !== 'default')
  .sort();
for (const name of ['PassflowProvider', 'PassflowFlow', 'FieldOtp', 'useAuth']) {
  if (cjs[name] == null) fail(`require: ${name} missing`);
  if (esm[name] == null) fail(`import: ${name} missing`);
}
const onlyCjs = cjsKeys.filter((key) => !esmKeys.includes(key));
const onlyEsm = esmKeys.filter((key) => !cjsKeys.includes(key));
if (onlyCjs.length || onlyEsm.length) fail(`entry points differ. only require: ${onlyCjs}; only import: ${onlyEsm}`);
console.log(`require and import both load, ${cjsKeys.length} exports each`);
