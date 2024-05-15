import { FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SuccessAuthRedirect } from '@/types';
import { VerifyChallengeOTPRedirect } from './varify-challenge-otp-redirect';
import { VerifyChallengeOTPManual } from './verify-challenge-otp-manual';
import '@/styles/index.css';

type TVerifyChallengeOTP = {
  successAuthRedirect: SuccessAuthRedirect;
  numInputs: number;
  shouldAutoFocus: boolean;
  signUpPath: string;
  createTenant?: boolean;
};

export const VerifyChallengeOTP: FC<TVerifyChallengeOTP> = ({
  successAuthRedirect,
  numInputs,
  shouldAutoFocus,
  signUpPath,
  createTenant = false,
}) => {
  const [searchParams] = useSearchParams({
    otp: '',
    app_id: '',
    challenge_id: '',
    identity: '',
    identity_value: '',
    challenge_type: '',
    type: '',
  });

  const appId = searchParams.get('app_id');
  const otp = searchParams.get('otp');
  const challengeId = searchParams.get('challenge_id');
  const identity = searchParams.get('identity');
  const identityValue = searchParams.get('identity_value');
  const challengeType = searchParams.get('challenge_type');
  const type = searchParams.get('type');

  if (type !== 'passwordless' && type !== 'passkey')
    return <VerifyChallengeOTPRedirect appId={appId} challengeId={challengeId} otp={otp} />;

  return (
    <VerifyChallengeOTPManual
      identity={identity}
      identityValue={identityValue}
      challengeType={challengeType}
      challengeId={challengeId}
      type={type}
      createTenant={createTenant}
      numInputs={numInputs}
      shouldAutoFocus={shouldAutoFocus}
      signUpPath={signUpPath}
      successAuthRedirect={successAuthRedirect}
    />
  );
};
