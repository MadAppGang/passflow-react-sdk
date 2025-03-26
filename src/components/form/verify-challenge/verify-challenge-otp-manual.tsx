/* eslint-disable no-void */
/* eslint-disable complexity */
import { FC, useEffect, useState } from 'react';
import OtpInput from 'react-otp-input';
import { Button, Icon } from '@/components/ui';
import { Wrapper } from '../wrapper';
import { useNavigation, usePassflow, usePasswordlessComplete, useSignIn } from '@/hooks';
import { TimerButton } from './timer-button';
import {
  InternalStrategyChallenge,
  PassflowPasswordlessResponse,
  PassflowPasswordlessSignInCompletePayload,
  PassflowPasswordlessSignInPayload,
} from '@passflow/passflow-js-sdk';
import { cn, getUrlWithTokens, isValidUrl, useUrlParams } from '@/utils';
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
  signUpPath,
}) => {
  const passflow = usePassflow();
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
        const response = await fetchPasswordlessComplete(payload)
        if (response) {
          if (response.redirect_url) {
            if (!isValidUrl(response.redirect_url)) navigate({to: response.redirect_url});
            else window.location.href = await getUrlWithTokens(passflow, response.redirect_url);
          } else {
            setShowSuccessMessage(true);
          }
        }
      };

      void fetchData();
    }
  }, [
    valueOTP,
    numInputs,
    fetchPasswordlessComplete,
    challengeId,
    successAuthRedirect,
    navigate,
    passflow,
    type,
  ]);

  if (paramsError) throw new Error(paramsError);

  if (showSuccessMessage) return <VerifyChallengeSuccess />;

  const onClickNavigateBack = () => navigate({to: signUpPath});

  return (
    <Wrapper
      title={`Verify your ${identity}`}
      subtitle={`We sent OTP code to your ${challengeTypeFullString[identity as keyof typeof challengeTypeFullString]}`}
      className='passflow-flex passflow-flex-col passflow-gap-[32px]'
    >
      <div
        className={`passflow-flex passflow-flex-col passflow-gap-[56px] passflow-p-[24px] passflow-pb-[56px]
          passflow-rounded-[6px] passflow-shadow-[0_4px_15px_0_rgba(0,0,0,0.09)]`}
      >
        {identityValue && (
          <Button
            size='big'
            type='button'
            variant='outlined'
            className='passflow-relative passflow-bg-Background passflow-border-none'
            withIcon
            onClick={onClickNavigateBack}
          >
            <Icon id={identity === 'email' ? 'mail' : 'phone'} type='general' size='small' />
            {identityValue}
            <Icon
              id='edit'
              type='general'
              size='small'
              className='passflow-absolute passflow-top-1/2 passflow-right-[12px] -passflow-translate-y-1/2'
            />
          </Button>
        )}
        <div
          id='otp-wrapper'
          className='passflow-flex passflow-flex-col passflow-items-center passflow-justify-center passflow-gap-[6px]'
        >
          <OtpInput
            value={valueOTP}
            onChange={onChangeOTP}
            numInputs={numInputs}
            shouldAutoFocus={shouldAutoFocus}
            skipDefaultStyles
            containerStyle='passflow-flex passflow-items-center passflow-justify-center passflow-gap-[10px]'
            inputStyle={cn('passflow-field-otp', isError && 'passflow-field--warning')}
            inputType='text'
            // eslint-disable-next-line react/jsx-props-no-spreading
            renderInput={(props) => <input {...props} />}
          />
          {isError && (
            <div className='passflow-flex passflow-items-center passflow-justify-center passflow-gap-[4px]'>
              <Icon size='small' id='warning' type='general' className='icon-warning' />
              <span className='passflow-text-caption-1-medium passflow-text-Warning'>{error}</span>
            </div>
          )}
        </div>
      </div>
      {type === 'passwordless' && (
        <p className='passflow-text-Grey-One passflow-text-body-2-medium passflow-text-center'>
          Don&apos;t receive a code?
          <TimerButton totalSecond={30} onClick={() => void onClickResendHandler()} />
        </p>
      )}
    </Wrapper>
  );
};
