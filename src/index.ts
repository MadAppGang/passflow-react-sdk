import '@/styles/index.css';
import '@/utils/get-app-version';

export * from './components/flow';
export * from './components/form';
export * from './components/ui';
export { PassflowProvider, UpgradeProvider } from './components/provider';
export type { UpgradeProviderProps, PassflowUpgradeOptions } from './components/provider';
// Assurance upgrade (step-up): the context types and the free-function adapters.
export {
  UpgradeContext,
  INERT_UPGRADE_CONTEXT,
  type UpgradeContextValue,
  type UpgradeElevateOptions,
  type UpgradeErrorStatusKind,
  type UpgradeHookState,
  type UpgradePromptView,
  type UpgradeSettledState,
} from './context/upgrade-context';
export { withAuth, attachAuth } from './utils/upgrade-auth';
export * from './hooks';
export * from '@passflow/core';
