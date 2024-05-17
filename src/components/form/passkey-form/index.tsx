/* eslint-disable jsx-a11y/label-has-associated-control */
import { ChangeEvent, FC, useEffect, useState } from 'react';
import { AoothPasskeyRegisterStartPayload, AoothPasskeySettings } from '@aooth/aooth-js-sdk';
import { useNavigate } from 'react-router-dom';
import { eq, get, size } from 'lodash';
import { Form, Formik, FormikHandlers } from 'formik';
import { Button, FieldPhone, FieldText, Icon } from '@/components/ui';
import { useAooth, useSignUp } from '@/hooks';
import { cn, emailRegex, getUrlWithTokens, isValidUrl, phoneNumberRegex, validationSingUpSchemas } from '@/utils';
import { SuccessAuthRedirect } from '@/types';
import { routes } from '@/context';

type TPasskeyForm = {
  passkeySettings: AoothPasskeySettings | null;
  successAuthRedirect: SuccessAuthRedirect;
  relyingPartyId?: string;
  createTenant?: boolean;
  verifyOTPPath?: string;
  verifyMagicLinkPath?: string;
};

const initialValues = {
  identity: '',
  phone: '',
};

export const PasskeyForm: FC<TPasskeyForm> = ({
  successAuthRedirect,
  passkeySettings,
  relyingPartyId = window.location.hostname,
  createTenant = false,
  verifyOTPPath = routes.verify_otp.path,
  verifyMagicLinkPath = routes.verify_magic_link.path,
}) => {
  const navigate = useNavigate();
  const { fetch, isError, error, reset, isLoading } = useSignUp();
  const aooth = useAooth();
  const [validationSchema, setValidationSchema] = useState<ReturnType<typeof validationSingUpSchemas> | null>(null);

  useEffect(() => {
    if (passkeySettings) {
      const { id_field: idField } = passkeySettings;
      const schema = validationSingUpSchemas(
        {
          identity: idField === 'phone' ? 'phone' : 'identity',
          challenge: 'none',
        },
        null,
      );
      setValidationSchema(schema);
    }
  }, [passkeySettings]);

  const onCustomChangeHandler = (handleChange: FormikHandlers['handleChange']) => (e: ChangeEvent<HTMLInputElement>) => {
    handleChange(e);
    if (isError) {
      reset();
    }
  };

  // eslint-disable-next-line complexity
  const onSubmitPasskeyHandler = async (values: typeof initialValues) => {
    const { identity, phone } = values;
    const isEmail = identity.match(emailRegex);
    const isPhone = phone.match(phoneNumberRegex);
    const payload = {
      ...(isEmail && { email: identity }),
      ...(!isEmail && size(identity) > 0 && { username: identity }),
      ...(isPhone && { phone }),
      relying_party_id: relyingPartyId,
      create_tenant: createTenant,
      redirect_url: successAuthRedirect,
    };

    const response = await fetch(payload as AoothPasskeyRegisterStartPayload, 'passkey');
    if (response && passkeySettings?.validation === 'none') {
      if (!isValidUrl(successAuthRedirect)) navigate(successAuthRedirect);
      else window.location.href = await getUrlWithTokens(aooth, successAuthRedirect);
    }

    const paramsState = {
      // eslint-disable-next-line no-nested-ternary
      identity: isEmail ? 'email' : isPhone ? 'phone' : 'username',
      identity_value: identity ?? phone,
      create_tenant: createTenant ? 'true' : 'false',
      challenge_type: 'otp',
      challenge_id: response as string,
      type: 'passkey',
    };

    const params = new URLSearchParams(window.location.search);

    Object.keys(paramsState).forEach((key) => params.set(key, paramsState[key as keyof typeof paramsState]));

    if (get(passkeySettings, 'validation', false) === 'otp' && response)
      navigate({
        pathname: verifyOTPPath ?? routes.verify_otp.path,
        search: params.toString(),
      });
    if (get(passkeySettings, 'validation', false) === 'magic_link' && response)
      navigate(
        {
          pathname: verifyMagicLinkPath ?? routes.verify_magic_link.path,
        },
        {
          state: {
            // eslint-disable-next-line no-nested-ternary
            identity: isEmail ? 'email' : isPhone ? 'phone' : 'username',
            identityValue: identity ?? phone,
            challengeId: response,
            type: 'passkey',
            passwordlessPayload: payload,
          },
        },
      );
  };

  const labelStyle = cn('aooth-text-caption-1-medium aooth-text-Grey-One', {
    'aooth-text-Warning': isError,
  });

  if (passkeySettings) {
    return (
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={onSubmitPasskeyHandler}
        enableReinitialize
        validateOnChange
      >
        {({ isValid, dirty, handleChange, handleBlur, values, setFieldValue }) => (
          <Form className='aooth-flex aooth-flex-col aooth-gap-[32px] aooth-mt-[32px]'>
            <div
              className={`aooth-flex aooth-flex-col aooth-gap-[24px] aooth-w-full aooth-p-[24px] 
                        aooth-rounded-[6px] aooth-shadow-[0_4px_15px_0_rgba(0,0,0,0.09)]`}
            >
              <div
                className={`group aooth-relative aooth-flex aooth-flex-col aooth-items-start 
                aooth-justify-center aooth-gap-[6px]`}
              >
                {eq(get(passkeySettings, 'id_field'), 'phone') && (
                  <>
                    <label htmlFor='phone' className={labelStyle}>
                      Phone
                    </label>
                    <FieldPhone
                      id='phone'
                      name='phone'
                      isError={isError}
                      value={values.phone}
                      setValue={setFieldValue}
                      onChange={onCustomChangeHandler(handleChange)}
                      onBlur={handleBlur}
                    />
                  </>
                )}
                {eq(get(passkeySettings, 'id_field'), 'email') && (
                  <>
                    <label htmlFor='email' className={labelStyle}>
                      Email
                    </label>
                    <FieldText
                      isError={isError}
                      id='identity'
                      type='text'
                      name='identity'
                      onChange={onCustomChangeHandler(handleChange)}
                    />
                  </>
                )}
                {isError && (
                  <div className='aooth-flex aooth-items-center aooth-justify-center aooth-gap-[4px]'>
                    <Icon size='small' id='warning' type='general' className='icon-warning' />
                    <span className='aooth-text-caption-1-medium aooth-text-Warning'>{error}</span>
                  </div>
                )}
              </div>
            </div>
            <div className='aooth-flex aooth-flex-col'>
              <Button
                size='big'
                variant='dark'
                type='submit'
                className='aooth-m-auto'
                withIcon
                disabled={!isValid || !dirty || isLoading}
              >
                <Icon id='key' size='small' type='general' className='icon-white' />
                Sign Up with a Passkey
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    );
  }

  return null;
};
