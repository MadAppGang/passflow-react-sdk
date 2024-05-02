import { useCallback, useState } from "react";
import {
  AoothPasskeyAuthenticateStartPayload,
  AoothPasswordlessSignInPayload,
  AoothSignInPayload,
} from "@aooth/aooth-js-sdk";
import { useAooth } from "./use-aooth";

export type TuseSignIn = () => {
  fetch: (
    payload:
      | AoothPasskeyAuthenticateStartPayload
      | AoothSignInPayload
      | AoothPasswordlessSignInPayload,
    type: "passkey" | "password" | "passwordless"
  ) => Promise<boolean>;
  isLoading: boolean;
  isError: boolean;
  error: string;
  reset: () => void;
};

export const useSignIn: TuseSignIn = () => {
  const aooth = useAooth();
  const [errorMessage, setErrorMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(
    async (
      payload:
        | AoothPasskeyAuthenticateStartPayload
        | AoothSignInPayload
        | AoothPasswordlessSignInPayload,
      type: "passkey" | "password" | "passwordless"
    ): Promise<boolean> => {
      try {
        setIsLoading(true);
        if (type === "password")
          await aooth.signIn(payload as AoothSignInPayload);
        else if (type === "passkey")
          await aooth.passkeyAuthenticate(
            payload as AoothPasskeyAuthenticateStartPayload
          );
        else
          await aooth.passwordlessSignIn(
            payload as AoothPasswordlessSignInPayload
          );
        setIsLoading(false);
        return true;
      } catch (e) {
        setIsLoading(false);
        setIsError(true);
        const error = e as Error;
        setErrorMessage(error.message);
        return false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const reset = () => {
    setIsError(false);
    setErrorMessage("");
    setIsLoading(false);
  };

  return { fetch, isLoading, isError, error: errorMessage, reset } as const;
};
