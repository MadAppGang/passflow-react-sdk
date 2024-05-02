import { useContext } from 'react';
import { AoothContext } from '@/context';
import { Aooth } from '@aooth/aooth-sdk-js';

export type TuseAooth = () => Aooth;

export const useAooth: TuseAooth = () => {
  const context = useContext(AoothContext);
  if (!context) {
    throw new Error('useAuth must be used within an AoothProvider');
  }

  const { aooth } = context;

  return aooth;
};
