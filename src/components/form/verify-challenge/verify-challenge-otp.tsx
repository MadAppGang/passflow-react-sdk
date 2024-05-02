import { FC, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AoothPasswordlessSignInCompletePayload,
  AoothPasswordlessSignInPayload,
  AoothValidatePayload,
} from '@aooth/aooth-sdk-js';
import OtpInput from 'react-otp-input';
import { Button, Icon } from '@/components/ui';
import { usePasswordlessComplete, useSignIn } from '@/hooks';
import { Wrapper } from '../wrapper';
import { TimerButton } from './timer-button';
import '@/styles/index.css';
import { SuccessAuthRedirect } from '@/types';
import { cn, getUrlWithTokens, isValidUrl } from '@/utils';
import { concatScopes, defaultScopes } from '@/constants';

type TVerifyChallengeOTP = {
  successAuthRedirect: SuccessAuthRedirect;
  numInputs: number;
  shouldAutoFocus: boolean;
  signUpPath: string;
  scopes?: string[];
  createTenant?: boolean;
};

export const VerifyChallengeOTP: FC<TVerifyChallengeOTP> = ({
  successAuthRedirect,
  numInputs,
  shouldAutoFocus,
  signUpPath,
  scopes = defaultScopes,
  createTenant,
}) => {
  const { fetch: refetch } = useSignIn();
  const { fetch, fetchPasskey, isError, error, reset } = usePasswordlessComplete();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams({ otp: '', appId: '', chId: '', email: '' });
  const otp = searchParams.get('otp');
  const challengeId = searchParams.get('chId');
  const email = searchParams.get('email');

  const [valueOTP, setValueOTP] = useState(otp ?? '');
  const { state } = location as {
    state: {
      identity: 'email' | 'phone';
      identityValue: string;
      passwordlessPayload: AoothPasswordlessSignInPayload;
      type: 'passwordless' | 'passkey';
    };
  };

  useEffect(() => {
    if ((otp && challengeId) || valueOTP.length === numInputs) {
      let payload: AoothPasswordlessSignInCompletePayload | AoothValidatePayload;
      if (state) {
        payload = {
          create_tenant: createTenant,
          challenge_type: 'otp',
          otp: valueOTP,
          scopes: concatScopes(scopes),
          ...(state.identity === 'email' ? { email: state.identityValue } : { phone: state.identityValue }),
        };
      } else {
        payload = {
          create_tenant: createTenant,
          challenge_type: 'magic_link',
          otp: valueOTP,
          scopes: concatScopes(scopes),
          ...(email ? { email } : { phone: '' }),
        };
      }

      void (async () => {
        const status = state.type === 'passwordless' ? await fetch(payload) : await fetchPasskey(valueOTP, challengeId ?? '');
        if (status) {
          if (!isValidUrl(successAuthRedirect)) navigate(successAuthRedirect);
          else window.location.href = getUrlWithTokens(successAuthRedirect);
        }
      })();
    }
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueOTP, numInputs, state, scopes]);

  const challengeTypeFullString = {
    email: 'email address',
    phone: 'phone number',
  };

  const onChangeOTP = (value: string) => setValueOTP(value);

  const onClickEditHadler = () =>
    navigate(
      { pathname: signUpPath, search: window.location.search },
      { state: { identity: state.identity, challengeValue: state.identityValue } },
    );

  // eslint-disable-next-line no-void
  const onClickResendHandler = () => void refetch(state.passwordlessPayload, 'passwordless');

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

  const localSearchParam = new URLSearchParams(window.location.search);
  localSearchParam.delete('chId');

  return <Navigate to={{ pathname: signUpPath, search: localSearchParam.toString() }} replace />;
};

VerifyChallengeOTP.defaultProps = { createTenant: false, scopes: defaultScopes };
