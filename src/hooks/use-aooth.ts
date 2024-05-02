import { useContext } from "react";
import { AoothContext } from "@/context";
import { Aooth } from "@aooth/aooth-js-sdk";

export const useAooth = (): Aooth => {
  const context = useContext(AoothContext);
  if (!context) {
    throw new Error("useAuth must be used within an AoothProvider");
  }

  const { aooth } = context;

  return aooth;
};
