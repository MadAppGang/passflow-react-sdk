import { useContext } from 'react';
import { PassflowContext } from '@/context';
import type { Passflow } from '@passflow/passflow-js-sdk';

export const usePassflow = (): Passflow => {
  const context = useContext(PassflowContext);
  if (!context) {
    throw new Error('useAuth must be used within an PassflowProvider');
  }

  const { passflow } = context;

  return passflow;
};
