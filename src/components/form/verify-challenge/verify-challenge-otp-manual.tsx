import type {
  InternalStrategyChallenge,
  PassflowPasswordlessResponse,
  PassflowPasswordlessSignInCompletePayload,
  PassflowPasswordlessSignInPayload,
} from '@passflow/core';
/* eslint-disable no-void */
/* eslint-disable complexity */
import { type FC, useEffect, useId, useState } from 'react';
import { SignInEndingScreen } from '@/components/form/signed-in';
import { Button, FieldOtp, Icon } from '@/components/ui';
import { useAppSettings, useNavigation, usePasswordlessComplete, useSignIn, useSignInEnding } from '@/hooks';
import { useSecondFactorRoute } from '@/hooks/use-second-factor-route';
import { useUrlParams } from '@/utils';
import { Wrapper } from '../wrapper';
import { TimerButton } from './timer-button';

import '@/styles/index.css';

type VerifyChallengeOTPManualProps = {
  identity: string | null;
  identityValue: string | null;
  challengeType: string | null;
  challengeId: string | null;
  type: 'passwordless' | 'passkey' | null;
  numInputs: number;
  shouldAutoFocus: boolean;
  signUpPath: string;
  successAuthRedirect?: string;
  twoFactorVerifyPath?: string;
};

const challengeTypeFullString = {
  email: 'email address',
  phone: 'phone number',
};

export const VerifyChallengeOTPManual: FC<VerifyChallengeOTPManualProps> = ({
  identity,
  identityValue,
  challengeType,
  challengeId,
  type,
  numInputs,
  shouldAutoFocus,
  successAuthRedirect,
  signUpPath,
  twoFactorVerifyPath,
}) => {
  const routeToSecondFactor = useSecondFactorRoute(twoFactorVerifyPath);
  const { createTenantForNewUser, currentStyles, loginAppTheme } = useAppSettings();
  const { navigate } = useNavigation();
  const { fetch: refetch } = useSignIn();
  const { fetch: fetchPasswordlessComplete, isError, error } = usePasswordlessComplete();
  const [valueOTP, setValueOTP] = useState('');
  const [paramsError, setParamsError] = useState<string | null>(null);
  const { ending, retry, finishSignIn } = useSignInEnding();
  const { get, set } = useUrlParams();
  const otpId = useId();
  const otpErrorId = `${otpId}-error`;

  const onChangeOTP = (value: string) => setValueOTP(value);

  const onClickResendHandler = async () => {
    if (type && identity && identityValue && challengeType) {
      const inviteToken = get('invite_token');
      const payload: PassflowPasswordlessSignInPayload = {
        create_tenant: createTenantForNewUser,
        challenge_type: challengeType as InternalStrategyChallenge,
        redirect_url: successAuthRedirect ?? '',
        ...(identity === 'email' ? { email: identityValue } : { phone: identityValue }),
        ...(inviteToken ? { invite_token: inviteToken } : {}),
      };

      const refetchResponse = (await refetch(payload, type)) as PassflowPasswordlessResponse;
      if (refetchResponse) {
        set({ challenge_id: refetchResponse.challenge_id });
      } else {
        setParamsError('Something went wrong. Please try again later.');
      }
    }
  };

  useEffect(() => {
    if (valueOTP.length === numInputs && challengeId) {
      const payload: PassflowPasswordlessSignInCompletePayload = {
        challenge_id: challengeId,
        challenge_type: 'otp',
        otp: valueOTP,
      };
      const fetchData = async () => {
        const response = await fetchPasswordlessComplete(payload);
        if (response) {
          // The code completed the first factor only: no tokens yet.
          if (routeToSecondFactor()) return;
          await finishSignIn(response.redirect_url);
        }
      };
      void fetchData();
    }
  }, [valueOTP, numInputs, fetchPasswordlessComplete, challengeId]);

  if (paramsError) throw new Error(paramsError);

  if (ending !== 'none') return <SignInEndingScreen ending={ending} onRetry={retry} />;

  const onClickNavigateBack = () => navigate({ to: signUpPath });

  return (
    <Wrapper
      title={`Verify your ${identity}`}
      subtitle={`We sent OTP code to your ${challengeTypeFullString[identity as keyof typeof challengeTypeFullString]}`}
      className='passflow-verify-otp'
      customCss={currentStyles?.custom_css}
      customLogo={currentStyles?.logo_url}
      removeBranding={loginAppTheme?.remove_passflow_logo}
    >
      <div className='passflow-verify-otp-container'>
        {identityValue && (
          <Button
            size='big'
            type='button'
            variant='outlined'
            className='passflow-verify-otp-button'
            withIcon
            onClick={onClickNavigateBack}
          >
            <Icon id={identity === 'email' ? 'mail' : 'phone'} type='general' size='small' />
            {identityValue}
            <Icon id='edit' type='general' size='small' className='passflow-verify-otp-button-icon' />
          </Button>
        )}
        <div id='otp-wrapper' className='passflow-verify-otp-wrapper'>
          <FieldOtp
            id={otpId}
            name='otp'
            length={numInputs}
            value={valueOTP}
            onChange={onChangeOTP}
            state={isError ? 'error' : 'default'}
            label='Verification code'
            describedBy={isError ? otpErrorId : undefined}
            autoFocus={shouldAutoFocus}
          />
          {isError && (
            <div className='passflow-verify-otp-error'>
              <Icon size='small' id='warning' type='general' className='icon-warning' />
              <span id={otpErrorId} className='passflow-verify-otp-error-text'>
                {error}
              </span>
            </div>
          )}
        </div>
      </div>
      {type === 'passwordless' && (
        <p className='passflow-verify-otp-resend'>
          Don&apos;t receive a code?
          <TimerButton totalSecond={30} onClick={() => void onClickResendHandler()} />
        </p>
      )}
    </Wrapper>
  );
};
