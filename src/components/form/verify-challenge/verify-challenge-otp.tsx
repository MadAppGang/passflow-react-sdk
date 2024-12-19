/* eslint-disable complexity */
/* eslint-disable no-nested-ternary */
import { FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as Yup from 'yup';
import { SuccessAuthRedirect } from '@/types';
import { VerifyChallengeOTPRedirect } from './varify-challenge-otp-redirect';
import { VerifyChallengeOTPManual } from './verify-challenge-otp-manual';
import { usePassflow } from '@/hooks';

import '@/styles/index.css';

type TVerifyChallengeOTP = {
  successAuthRedirect: SuccessAuthRedirect;
  numInputs: number;
  shouldAutoFocus: boolean;
  signUpPath: string;
  createTenant?: boolean;
};

const searchParamsVerifyChallengeOtpSchema = Yup.object().shape({
  appId: Yup.string().required(),
  challengeId: Yup.string().required(),
  identity: Yup.string().oneOf(['email', 'phone']).required(),
  identityValue: Yup.string().required(),
  challengeType: Yup.string().required(),
  type: Yup.string().oneOf(['passwordless', 'passkey']).optional(),
  otp: Yup.string().optional(),
});

export const VerifyChallengeOTP: FC<TVerifyChallengeOTP> = ({
  successAuthRedirect,
  numInputs,
  shouldAutoFocus,
  signUpPath,
  createTenant = false,
}) => {
  const passflow = usePassflow();
  const [searchParams] = useSearchParams({
    otp: '',
    app_id: '',
    challenge_id: '',
    identity: '',
    identity_value: '',
    challenge_type: '',
    type: '',
  });

  const params = {
    otp: searchParams.get('otp'),
    appId: searchParams.get('app_id') || passflow.appId || null,
    challengeId: searchParams.get('challenge_id'),
    identity: searchParams.has('email') ? 'email' : searchParams.has('phone') ? 'phone' : null,
    identityValue: searchParams.has('email')
      ? searchParams.get('email')
      : searchParams.has('phone')
        ? searchParams.get('phone')
        : null,
    challengeType: searchParams.get('challenge_type'),
    type: searchParams.get('type'),
  };

  try {
    searchParamsVerifyChallengeOtpSchema.validateSync(params, { abortEarly: false });
  } catch (err) {
    throw new Error('Invalid search params');
  }

  const { appId, otp, challengeId, identity, identityValue, challengeType, type } = params;

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
