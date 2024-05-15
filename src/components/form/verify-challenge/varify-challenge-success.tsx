import { FC } from 'react';
import { Wrapper } from '../wrapper';

export const VerifyChallengeSuccess: FC = () => (
  <Wrapper iconId='logo'>
    <div className='aooth-flex aooth-flex-col aooth-items-center aooth-justify-start aooth-gap-[32px]'>
      <div className='aooth-flex aooth-flex-col aooth-items-center aooth-justify-start aooth-gap-[8px]'>
        <p className='aooth-text-title-2-bold aooth-text-Dark aooth-text-center'>Successful verification!</p>
        <p className='aooth-text-body-2-medium aooth-text-Grey-One'>But there is no redirect URL for further redirect.</p>
      </div>
    </div>
  </Wrapper>
);
