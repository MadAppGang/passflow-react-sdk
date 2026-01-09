import { render as rtlRender } from '@testing-library/react';
import type { ReactElement } from 'react';

// Simple render that doesn't need context for basic tests
export function render(ui: ReactElement) {
  return rtlRender(ui);
}
