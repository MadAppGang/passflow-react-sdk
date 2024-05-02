/* eslint-disable jsx-a11y/label-has-associated-control */
import { ChangeEvent, FC } from "react";
import { Form, Formik, FormikHandlers } from "formik";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button, FieldPhone, FieldText, Icon, Link } from "@/components/ui";
import { Wrapper } from "../wrapper";
import { useAppSettings, useForgotPassword } from "@/hooks";
import {
  cn,
  emailRegex,
  phoneNumberRegex,
  validationForgotPasswordSchema,
} from "@/utils";
import { routes } from "@/context";
import "@/styles/index.css";
import { PreferIdentity } from "@/types";
import { AoothSendPasswordResetEmailPayload } from "@aooth/aooth-js-sdk";

const initialValues = {
  identity: "",
  phone: "",
};

type TForgotPassword = {
  signInPath?: string;
  forgotPasswordSuccessPath?: string;
};

export const ForgotPassword: FC<TForgotPassword> = ({
  signInPath,
  forgotPasswordSuccessPath = routes.forgot_password_success.path,
}) => {
  useAppSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = location as {
    state: {
      identity: PreferIdentity;
    };
  };
  const { fetch, error, isError, isLoading, reset } = useForgotPassword();

  const onSubmitHanlder = async (values: typeof initialValues) => {
    const { identity, phone } = values;
    const isEmail = identity.match(emailRegex);
    const isPhone = phone.match(phoneNumberRegex);
    const payload = {
      ...(isEmail && { email: identity }),
      ...(isPhone && { phone: phone.replace("+", "") }),
      ...(!isEmail && !isPhone && { username: identity }),
    } as AoothSendPasswordResetEmailPayload;

    const status = await fetch(payload);
    if (status)
      navigate(
        { pathname: forgotPasswordSuccessPath, search: window.location.search },
        { state: payload }
      );
  };

  const onCustomChangeHandler =
    (handleChange: FormikHandlers["handleChange"]) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      handleChange(e);
      if (isError) {
        reset();
      }
    };

  const labelStyle = cn("aooth-text-caption-1-medium aooth-text-Grey-One", {
    "aooth-text-Warning": isError,
  });

  if (!state)
    return (
      <Navigate
        to={{
          pathname: signInPath ?? routes.signin.path,
          search: window.location.search,
        }}
        replace
      />
    );

  const currentSubtitle =
    state.identity === "identity"
      ? "Enter the email address you used when you joined and we’ll send you instructions to reset your password."
      : "Enter the mobile phone number you used when you joined and we’ll send you the reset link.";

  const currentSubscriptions =
    state.identity === "identity"
      ? "For security reasons, we do NOT store your password. So rest assured that we will never send your password via email."
      : "For security reasons, we do NOT store your password. So rest assured that we will never send your password via SMS.";

  return (
    <Wrapper title="Forgot password?" subtitle={currentSubtitle}>
      <span className="aooth-flex aooth-mt-[8px] aooth-text-body-2-medium aooth-text-Grey-One aooth-text-center">
        {currentSubscriptions}
      </span>
      <Formik
        initialValues={initialValues}
        validationSchema={validationForgotPasswordSchema(state.identity)}
        onSubmit={onSubmitHanlder}
        validateOnChange
        enableReinitialize
        validateOnMount
      >
        {({
          values,
          isValid,
          dirty,
          handleChange,
          handleBlur,
          setFieldValue,
        }) => (
          <Form className="aooth-flex aooth-flex-col aooth-gap-[32px] aooth-mt-[32px]">
            <div
              className={`aooth-flex aooth-flex-col aooth-gap-[24px] aooth-p-[24px] aooth-rounded-[6px] 
              aooth-shadow-[0_4px_15px_0_rgba(0,0,0,0.09)]`}
            >
              <div
                className={`group aooth-relative aooth-flex aooth-flex-col aooth-items-start 
                aooth-justify-center aooth-gap-[6px]`}
              >
                {state.identity === "identity" && (
                  <>
                    <div className="aooth-w-full aooth-flex aooth-items-center aooth-justify-between">
                      <label htmlFor="identity" className={labelStyle}>
                        Email
                      </label>
                    </div>
                    <FieldText
                      isError={isError}
                      id="identity"
                      name="identity"
                      onChange={onCustomChangeHandler(handleChange)}
                      onBlur={handleBlur}
                    />
                  </>
                )}
                {state.identity === "phone" && (
                  <>
                    <div className="aooth-w-full aooth-flex aooth-items-center aooth-justify-between">
                      <label htmlFor="phone" className={labelStyle}>
                        Phone
                      </label>
                    </div>
                    <FieldPhone
                      id="phone"
                      name="phone"
                      isError={isError}
                      value={values.phone}
                      setValue={setFieldValue}
                      onChange={onCustomChangeHandler(handleChange)}
                      onBlur={handleBlur}
                    />
                  </>
                )}
                {isError && (
                  <div className="aooth-flex aooth-items-center aooth-justify-center aooth-gap-[4px]">
                    <Icon
                      size="small"
                      id="warning"
                      type="general"
                      className="icon-warning"
                    />
                    <span className="aooth-text-caption-1-medium aooth-text-Warning">
                      {error}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="aooth-flex aooth-flex-col aooth-gap-[24px]">
              <Button
                size="big"
                variant="primary"
                type="submit"
                disabled={!isValid || !dirty || isLoading}
                className="aooth-m-auto"
              >
                Send reset instructions
              </Button>
              <p className="aooth-text-Grey-One aooth-text-body-2-medium aooth-text-center">
                Remember your password?{" "}
                <Link
                  to={signInPath ?? routes.signin.path}
                  className="aooth-text-Primary aooth-text-body-2-semiBold"
                >
                  Sign In
                </Link>{" "}
              </p>
            </div>
          </Form>
        )}
      </Formik>
    </Wrapper>
  );
};

ForgotPassword.defaultProps = {
  signInPath: routes.signin.path,
  forgotPasswordSuccessPath: routes.forgot_password_success.path,
};
