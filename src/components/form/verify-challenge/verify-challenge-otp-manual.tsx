/* eslint-disable no-void */
/* eslint-disable complexity */
import { FC, useEffect, useState } from 'react';
import OtpInput from 'react-otp-input';
import { Button, Icon } from '@/components/ui';
import { Wrapper } from '../wrapper';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAooth, usePasswordlessComplete, useSignIn } from '@/hooks';
import { TimerButton } from './timer-button';
import {
  AoothPasswordlessResponse,
  AoothPasswordlessSignInCompletePayload,
  AoothPasswordlessSignInPayload,
  ChallengeType,
} from '@aooth/aooth-js-sdk';
import { cn, getUrlWithTokens, isValidUrl } from '@/utils';
import { VerifyChallengeSuccess } from './varify-challenge-success';

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
}) => {
  const aooth = useAooth();
  const navigate = useNavigate();
  const { fetch: refetch } = useSignIn();
  const { fetch: fetchPasswordlessComplete, fetchPasskey, isError, error } = usePasswordlessComplete();
  const [valueOTP, setValueOTP] = useState('');
  const [paramsError, setParamsError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [_, setSearchParams] = useSearchParams();

  const onChangeOTP = (value: string) => setValueOTP(value);

  const onClickResendHandler = async () => {
    if (type && identity && identityValue && challengeType) {
      const payload: AoothPasswordlessSignInPayload = {
        create_tenant: createTenant ?? false,
        challenge_type: challengeType as ChallengeType,
        redirect_url: successAuthRedirect,
        ...(identity === 'email' ? { email: identityValue } : { phone: identityValue }),
      };

      const refetchResponse = (await refetch(payload, type)) as AoothPasswordlessResponse;
      if (refetchResponse) {
        setSearchParams((params) => {
          params.set('challenge_id', refetchResponse.challenge_id);
          return params;
        });
      } else {
        setParamsError('Something went wrong. Please try again later.');
      }
    }
  };

  useEffect(() => {
    if (valueOTP.length === numInputs && challengeId) {
      const payload: AoothPasswordlessSignInCompletePayload = {
        challenge_id: challengeId,
        challenge_type: 'otp',
        otp: valueOTP,
      };
      const fetchData = async () => {
        const response =
          type === 'passwordless' ? await fetchPasswordlessComplete(payload) : await fetchPasskey(valueOTP, challengeId);
        if (response) {
          if (response.redirect_url) {
            if (!isValidUrl(response.redirect_url)) navigate(response.redirect_url);
            else window.location.href = await getUrlWithTokens(aooth, response.redirect_url);
          } else {
            setShowSuccessMessage(true);
          }
        } else {
          setParamsError('Something went wrong. Please try again later.');
        }
      };

      void fetchData();
    }
  }, [valueOTP, numInputs, fetchPasswordlessComplete, challengeId, successAuthRedirect, navigate, aooth, type, fetchPasskey]);

  if (isError && error) throw new Error(error);

  if (paramsError) throw new Error(paramsError);

  if (showSuccessMessage) return <VerifyChallengeSuccess />;

  return (
    <Wrapper
      title={`Verify your ${identity}`}
      subtitle={`We sent OTP code to your ${challengeTypeFullString[identity as keyof typeof challengeTypeFullString]}`}
      className='aooth-flex aooth-flex-col aooth-gap-[32px]'
    >
      <div
        className={`aooth-flex aooth-flex-col aooth-gap-[56px] aooth-p-[24px] aooth-pb-[56px]
          aooth-rounded-[6px] aooth-shadow-[0_4px_15px_0_rgba(0,0,0,0.09)]`}
      >
        {identityValue && (
          <Button
            size='big'
            type='button'
            variant='outlined'
            className='aooth-relative aooth-bg-Background aooth-border-none'
            withIcon
          >
            <Icon id={identity === 'email' ? 'mail' : 'phone'} type='general' size='small' />
            {identityValue}
            <Icon
              id='edit'
              type='general'
              size='small'
              className='aooth-absolute aooth-top-1/2 aooth-right-[12px] -aooth-translate-y-1/2'
            />
          </Button>
        )}
        <div id='otp-wrapper' className='aooth-flex aooth-flex-col aooth-items-center aooth-justify-center aooth-gap-[6px]'>
          <OtpInput
            value={valueOTP}
            onChange={onChangeOTP}
            numInputs={numInputs}
            shouldAutoFocus={shouldAutoFocus}
            skipDefaultStyles
            containerStyle='aooth-flex aooth-items-center aooth-justify-center aooth-gap-[10px]'
            inputStyle={cn('aooth-field-otp', isError && 'aooth-field--warning')}
            inputType='text'
            // eslint-disable-next-line react/jsx-props-no-spreading
            renderInput={(props) => <input {...props} />}
          />
          {isError && (
            <div className='aooth-flex aooth-items-center aooth-justify-center aooth-gap-[4px]'>
              <Icon size='small' id='warning' type='general' className='icon-warning' />
              <span className='aooth-text-caption-1-medium aooth-text-Warning'>{error}</span>
            </div>
          )}
        </div>
      </div>
      {type === 'passwordless' && (
        <p className='aooth-text-Grey-One aooth-text-body-2-medium aooth-text-center'>
          Don&apos;t receive a code?
          <TimerButton totalSecond={30} onClick={() => void onClickResendHandler()} />
        </p>
      )}
    </Wrapper>
  );
};
