# Implementation Plan: Passflow React SDK Refactoring

**Session**: dev-impl-20260109-190202-a24feab0
**Architecture Reference**: dev-arch-20260109-165618-496b7c83
**Approach**: Alternative 2 - Moderate Refactoring

---

## Phase 1: Foundation and Cleanup

### 1.1 Remove Unused Dependencies

**Dependencies to Remove**:
```bash
pnpm remove formik classnames querystringify @types/querystringify @storybook/react @storybook/react-vite @types/jest
```

**Verification**: All confirmed unused via grep search.

### 1.2 Fix useSignIn cleanup() Redundancy

**File**: `src/hooks/use-signin.ts`

**Current Issue** (lines 42-55):
```typescript
try {
  if (type === 'password') await passflow.signIn(payload);
  else if (type === 'passkey') {
    await passflow.passkeyAuthenticate(payload);
  } else {
    const passwordlessResponse = await passflow.passwordlessSignIn(payload);
    cleanup();  // Redundant - finally will run
    return passwordlessResponse;
  }
  cleanup();    // Redundant - finally will run
  return true;
} catch (e) {
  setIsError(true);
  const error = e as Error;
  setErrorMessage(error.message);
  cleanup();    // Redundant - finally will run
  return false;
} finally {
  cleanup();    // This always runs
}
```

**Fix**: Remove redundant cleanup() calls, keep only `finally` block:
```typescript
try {
  if (type === 'password') await passflow.signIn(payload);
  else if (type === 'passkey') {
    await passflow.passkeyAuthenticate(payload);
  } else {
    return await passflow.passwordlessSignIn(payload);
  }
  return true;
} catch (e) {
  setIsError(true);
  const error = e as Error;
  setErrorMessage(error.message);
  return false;
} finally {
  cleanup();
}
```

### 1.3 Add Testing Infrastructure

**Dependencies to Add**:
```bash
pnpm add -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom @vitest/coverage-v8
```

**Create vitest.config.ts**:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/index.ts',
        'src/test/**',
        'src/types/**',
        'src/styles/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

**Create src/test/setup.ts**:
```typescript
import '@testing-library/jest-dom/vitest';
```

**Update package.json scripts**:
```json
{
  "scripts": {
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Phase 2: Naming and Structure

### 2.1 Rename Typo Files

**Files to Rename**:
1. `src/components/form/verify-challenge/varify-challenge-success.tsx`
   → `src/components/form/verify-challenge/verify-challenge-success.tsx`

2. `src/components/form/verify-challenge/varify-challenge-otp-redirect.tsx`
   → `src/components/form/verify-challenge/verify-challenge-otp-redirect.tsx`

**Update Imports**: Update parent component imports after renaming.

### 2.2 Flatten Utils Directory Structure

**Files to Flatten** (move content from `<name>/index.ts` to `<name>.ts`):

| Current Path | New Path |
|--------------|----------|
| `src/utils/cn/index.ts` | `src/utils/cn.ts` |
| `src/utils/validate-url/index.ts` | `src/utils/validate-url.ts` |
| `src/utils/undefined-on-catch/index.ts` | `src/utils/undefined-on-catch.ts` |
| `src/utils/get-url-errors/index.ts` | `src/utils/get-url-errors.ts` |
| `src/utils/get-url-with-tokens/index.ts` | `src/utils/get-url-with-tokens.ts` |
| `src/utils/get-app-version/index.ts` | `src/utils/get-app-version.ts` |
| `src/utils/get-auth-methods/index.ts` | `src/utils/get-auth-methods.ts` |
| `src/utils/get-form-labels/index.ts` | `src/utils/get-form-labels.ts` |
| `src/utils/url-params/index.ts` | `src/utils/url-params.ts` |

**Keep as Directories** (multi-file):
- `src/utils/dayjs/` (has format.ts + index.ts)
- `src/utils/validation-schemas/` (may grow)

**Update src/utils/index.ts**:
Update re-exports to point to new flat files.

---

## Validation Checklist

After each phase:
- [ ] `pnpm install` succeeds
- [ ] `pnpm run build` succeeds
- [ ] `pnpm run lint` passes
- [ ] No TypeScript errors
- [ ] E2E tests still pass (optional - may skip for speed)

---

## Files to Modify Summary

**Phase 1**:
- `package.json` (remove deps, add deps, add scripts)
- `src/hooks/use-signin.ts` (fix cleanup)
- `vitest.config.ts` (new file)
- `src/test/setup.ts` (new file)

**Phase 2**:
- 2 files renamed in `verify-challenge/`
- 9 utils files flattened
- 9 empty directories removed
- `src/utils/index.ts` (update exports)
- Various files with import updates
