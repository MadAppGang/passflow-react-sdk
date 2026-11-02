import '@/styles/index.css';
import '@/utils/get-app-version';

export * from '@passflow/core';
export * from './components/flow';
export * from './components/form';
export type { PassflowUpgradeOptions, UpgradeProviderProps } from './components/provider';
export { PassflowProvider, UpgradeProvider } from './components/provider';
export * from './components/ui';
// Assurance upgrade (step-up): the context types and the free-function adapters.
export {
  INERT_UPGRADE_CONTEXT,
  UpgradeContext,
  type UpgradeContextValue,
  type UpgradeElevateOptions,
  type UpgradeErrorStatusKind,
  type UpgradeHookState,
  type UpgradePromptView,
  type UpgradeSettledState,
} from './context/upgrade-context';
export * from './hooks';
export { attachAuth, withAuth } from './utils/upgrade-auth';
