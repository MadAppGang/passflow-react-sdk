import type { FC } from 'react';
import { Wrapper } from '../wrapper';

export const VerifyChallengeSuccess: FC = () => (
  <Wrapper iconId='logo'>
    <div className='passflow-flex passflow-flex-col passflow-items-center passflow-justify-start passflow-gap-[32px]'>
      <div className='passflow-flex passflow-flex-col passflow-items-center passflow-justify-start passflow-gap-[8px]'>
        <p className='passflow-text-title-2-bold passflow-text-Dark passflow-text-center'>Successful verification!</p>
        <p className='passflow-text-body-2-medium passflow-text-Grey-One'>But there is no redirect URL for further redirect.</p>
      </div>
    </div>
  </Wrapper>
);
