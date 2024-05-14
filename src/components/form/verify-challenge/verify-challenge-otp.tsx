/* eslint-disable complexity */
import { FC, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AoothPasswordlessSignInCompletePayload, AoothPasswordlessSignInPayload } from '@aooth/aooth-js-sdk';
import OtpInput from 'react-otp-input';
import { Button, Icon } from '@/components/ui';
import { useAooth, usePasswordlessComplete, useSignIn } from '@/hooks';
import { Wrapper } from '../wrapper';
import { TimerButton } from './timer-button';
import '@/styles/index.css';
import { SuccessAuthRedirect } from '@/types';
import { cn, getUrlWithTokens, isValidUrl } from '@/utils';
import { size } from 'lodash';

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
}) => {
  const aooth = useAooth();
  const { fetch: refetch } = useSignIn();
  const { fetch, fetchPasskey, isError, error } = usePasswordlessComplete();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams({
    otp: '',
    app_id: '',
    challenge_id: '',
  });

  const appId = searchParams.get('app_id');
  const otp = searchParams.get('otp');
  const challengeId = searchParams.get('challenge_id');

  const [valueOTP, setValueOTP] = useState('');
  const [responseError, setResponseError] = useState<string | null>(null);
  const { state } = location as {
    state: {
      identity: 'email' | 'phone';
      identityValue: string;
      challengeId: string;
      passwordlessPayload: AoothPasswordlessSignInPayload;
      type: 'passwordless' | 'passkey';
    };
  };

  useEffect(() => {
    if (otp && otp.length === numInputs && challengeId) {
      void (async () => {
        const status = await fetchPasskey(otp, challengeId, appId ?? undefined);
        if (status) {
          if (!isValidUrl(successAuthRedirect)) navigate(successAuthRedirect);
          else window.location.href = await getUrlWithTokens(aooth, successAuthRedirect);
        } else {
          setResponseError('Invalid OTP code. Please try again.');
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state && state.challengeId && valueOTP.length === numInputs) {
      const payload: AoothPasswordlessSignInCompletePayload = {
        challenge_id: state.challengeId,
        challenge_type: 'otp',
        otp: valueOTP,
      };

      void (async () => {
        const status = await fetch(payload);
        if (status) {
          if (!isValidUrl(successAuthRedirect)) navigate(successAuthRedirect);
          else window.location.href = await getUrlWithTokens(aooth, successAuthRedirect);
        } else {
          setResponseError('Invalid OTP code. Please try again.');
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueOTP]);

  const challengeTypeFullString = {
    email: 'email address',
    phone: 'phone number',
  };

  const onChangeOTP = (value: string) => setValueOTP(value);

  const onClickEditHadler = () =>
    navigate(
      { pathname: signUpPath, search: window.location.search },
      {
        state: {
          identity: state.identity,
          challengeValue: state.identityValue,
        },
      },
    );

  // eslint-disable-next-line no-void
  const onClickResendHandler = () => void refetch(state.passwordlessPayload, 'passwordless');

  if (!state && isError && error) throw new Error(error);

  if (!state && (!otp || !challengeId || !appId))
    throw new Error('State (challenge id, otp, app id, email or phone) is not provided');

  if (responseError) throw new Error(responseError);

  if (!successAuthRedirect || size(successAuthRedirect) === 0) throw new Error('Success redirectTo url is not provided');

  if (state) {
    const { identity, identityValue } = state;
    return (
      <Wrapper
        title={`Verify your ${identity}`}
        subtitle={`We sent OTP code to your ${challengeTypeFullString[identity]}`}
        className='aooth-flex aooth-flex-col aooth-gap-[32px]'
      >
        <div
          className={`aooth-flex aooth-flex-col aooth-gap-[56px] aooth-p-[24px] aooth-pb-[56px] 
          aooth-rounded-[6px] aooth-shadow-[0_4px_15px_0_rgba(0,0,0,0.09)]`}
        >
          {state && (
            <Button
              size='big'
              type='button'
              variant='outlined'
              className='aooth-relative aooth-bg-Background aooth-border-none'
              withIcon
              onClick={onClickEditHadler}
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
          <div className='aooth-flex aooth-flex-col aooth-items-center aooth-justify-center aooth-gap-[6px]'>
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
        <p className='aooth-text-Grey-One aooth-text-body-2-medium aooth-text-center'>
          Don&apos;t receive a code?
          <TimerButton totalSecond={30} onClick={onClickResendHandler} />
        </p>
      </Wrapper>
    );
  }

  return null;
};
