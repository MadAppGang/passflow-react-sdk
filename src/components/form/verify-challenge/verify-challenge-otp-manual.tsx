import { Button, Icon } from '@/components/ui';
import { useAppSettings, useNavigation, usePassflow, usePasswordlessComplete, useSignIn } from '@/hooks';
import { cn, getUrlWithTokens, isValidUrl, useUrlParams } from '@/utils';
import type {
  InternalStrategyChallenge,
  PassflowPasswordlessResponse,
  PassflowPasswordlessSignInCompletePayload,
  PassflowPasswordlessSignInPayload,
} from '@passflow/passflow-js-sdk';
/* eslint-disable no-void */
/* eslint-disable complexity */
import React, { type FC, useEffect, useState } from 'react';
import OtpInput from 'react-otp-input';
import { Wrapper } from '../wrapper';
import { TimerButton } from './timer-button';
import { VerifyChallengeSuccess } from './varify-challenge-success';

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
  successAuthRedirect: string;
  createTenant?: boolean;
};

const challengeTypeFullString = {
  email: 'email address',
  phone: 'phone number',
};

export const VerifyChallengeOTPManual: FC<VerifyChallengeOTPManualProps> = ({
  identity,
  identityValue,
  createTenant,
  challengeType,
  challengeId,
  type,
  numInputs,
  shouldAutoFocus,
  successAuthRedirect,
  signUpPath,
}) => {
  const passflow = usePassflow();
  const { currentStyles, loginAppTheme } = useAppSettings();
  const { navigate } = useNavigation();
  const { fetch: refetch } = useSignIn();
  const { fetch: fetchPasswordlessComplete, isError, error } = usePasswordlessComplete();
  const [valueOTP, setValueOTP] = useState('');
  const [paramsError, setParamsError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const { set } = useUrlParams();

  const onChangeOTP = (value: string) => setValueOTP(value);

  const onClickResendHandler = async () => {
    if (type && identity && identityValue && challengeType) {
      const payload: PassflowPasswordlessSignInPayload = {
        create_tenant: createTenant ?? false,
        challenge_type: challengeType as InternalStrategyChallenge,
        redirect_url: successAuthRedirect,
        ...(identity === 'email' ? { email: identityValue } : { phone: identityValue }),
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
          if (response.redirect_url) {
            if (!isValidUrl(response.redirect_url)) navigate({ to: response.redirect_url });
            else window.location.href = await getUrlWithTokens(passflow, response.redirect_url);
          } else {
            setShowSuccessMessage(true);
          }
        }
      };
      void fetchData();
    }
  }, [valueOTP, numInputs, fetchPasswordlessComplete, challengeId, navigate, passflow]);

  if (paramsError) throw new Error(paramsError);

  if (showSuccessMessage) return <VerifyChallengeSuccess />;

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
          <OtpInput
            value={valueOTP}
            onChange={onChangeOTP}
            numInputs={numInputs}
            shouldAutoFocus={shouldAutoFocus}
            skipDefaultStyles
            containerStyle='passflow-verify-otp-inputs'
            inputStyle={cn('passflow-field-otp', isError && 'passflow-field--warning')}
            inputType='text'
            renderInput={(props) => <input {...props} />}
          />
          {isError && (
            <div className='passflow-verify-otp-error'>
              <Icon size='small' id='warning' type='general' className='icon-warning' />
              <span className='passflow-verify-otp-error-text'>{error}</span>
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
