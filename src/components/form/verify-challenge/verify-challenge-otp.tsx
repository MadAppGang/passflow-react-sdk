import type { SuccessAuthRedirect } from '@/types';
/* eslint-disable complexity */
/* eslint-disable no-nested-ternary */
import type { FC } from 'react';
import * as Yup from 'yup';
import { VerifyChallengeOTPManual } from './verify-challenge-otp-manual';
import { VerifyChallengeOTPRedirect } from './verify-challenge-otp-redirect';

import '@/styles/index.css';
import { useUrlParams } from '@/utils';

type TVerifyChallengeOTP = {
  numInputs: number;
  shouldAutoFocus: boolean;
  signUpPath: string;
  successAuthRedirect?: SuccessAuthRedirect;
};

const redirectSearchParamsVerifyChallengeOtpSchema = Yup.object().shape({
  appId: Yup.string().required(),
  challengeId: Yup.string().required(),
  otp: Yup.string().optional(),
});

const searchParamsVerifyChallengeOtpSchema = Yup.object().shape({
  challengeId: Yup.string().required(),
  identity: Yup.string().oneOf(['email', 'phone']).required(),
  identityValue: Yup.string().required(),
  challengeType: Yup.string().required(),
  type: Yup.string().oneOf(['passwordless', 'passkey']).optional(),
});

export const VerifyChallengeOTP: FC<TVerifyChallengeOTP> = ({
  successAuthRedirect,
  numInputs,
  shouldAutoFocus,
  signUpPath,
}) => {
  const { get } = useUrlParams({
    otp: '',
    app_id: '',
    challenge_id: '',
    identity: '',
    identity_value: '',
    challenge_type: '',
    type: '',
  });

  const typeChallenge = get('type');

  if (typeChallenge !== 'passwordless' && typeChallenge !== 'passkey') {
    const redirectParams = {
      appId: get('app_id'),
      challengeId: get('challenge_id'),
      otp: get('otp'),
    };

    try {
      redirectSearchParamsVerifyChallengeOtpSchema.validateSync(redirectParams, { abortEarly: false });
    } catch (err) {
      throw new Error('Invalid search params');
    }

    const { appId, otp, challengeId } = redirectParams;

    return <VerifyChallengeOTPRedirect appId={appId} challengeId={challengeId} otp={otp} />;
  }

  const params = {
    challengeId: get('challenge_id'),
    identity: get('email') ? 'email' : get('phone') ? 'phone' : null,
    identityValue: get('email') ? get('email') : get('phone') ? get('phone') : null,
    challengeType: get('challenge_type'),
    type: get('type'),
  };

  try {
    searchParamsVerifyChallengeOtpSchema.validateSync(params, { abortEarly: false });
  } catch (err) {
    throw new Error('Invalid search params');
  }

  const { challengeId, identity, identityValue, challengeType, type } = params;

  if (!type) throw new Error('Invalid type params');

  return (
    <VerifyChallengeOTPManual
      identity={identity}
      identityValue={identityValue}
      challengeType={challengeType}
      challengeId={challengeId}
      type={type as 'passwordless' | 'passkey'}
      numInputs={numInputs}
      shouldAutoFocus={shouldAutoFocus}
      signUpPath={signUpPath}
      successAuthRedirect={successAuthRedirect}
    />
  );
};
