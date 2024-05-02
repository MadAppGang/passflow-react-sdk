import { FC, ReactNode, useReducer } from "react";
import { AoothContext, aoothReducer, initialState } from "@/context";
import { Aooth } from "@aooth/aooth-js-sdk";
import "@/styles/index.css";

type TAoothProvider = {
  appId: string | undefined;
  aoothUrl: string | undefined;
  children: ReactNode;
};

export const AoothProvider: FC<TAoothProvider> = ({
  appId,
  aoothUrl,
  children,
}) => {
  const [state, dispatch] = useReducer(aoothReducer, {
    ...initialState,
    appId: appId ?? "",
    aoothUrl: aoothUrl ?? "",
  });

  const aooth = new Aooth({ appId: state.appId, url: state.aoothUrl });

  // eslint-disable-next-line react/jsx-no-constructed-context-values
  const value = { state, dispatch, aooth };

  return (
    <AoothContext.Provider value={value}>{children}</AoothContext.Provider>
  );
};
