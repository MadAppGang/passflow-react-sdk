import { useAppSettings } from '@/hooks';
import type { FC } from 'react';
import { Wrapper } from '../wrapper';

export const VerifyChallengeSuccess: FC = () => {
  const { currentStyles } = useAppSettings();

  return (
    <Wrapper iconId='logo' className='passflow-verify-challenge-success-wrapper' customCss={currentStyles?.custom_css}>
      <div className='passflow-verify-challenge-success-wrapper'>
        <div className='passflow-verify-challenge-success-container'>
          <p className='passflow-verify-challenge-success-text'>Successful verification!</p>
          <p className='passflow-verify-challenge-success-text-secondary'>But there is no redirect URL for further redirect.</p>
        </div>
      </div>
    </Wrapper>
  );
};
