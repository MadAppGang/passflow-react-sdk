import { FC } from "react";
import { AoothUserPasskey } from "@aooth/aooth-js-sdk";
import { Icon } from "../ui";
import { FORMATS } from "@/constants";
import { formatDateToString, usedFieldString } from "@/utils";

type TPasskeyList = {
  data: AoothUserPasskey[];
  renderActions: (id: string, name: string | null) => JSX.Element;
};

export const PasskeyList: FC<TPasskeyList> = ({ data, renderActions }) => {
  const lastUsedString = (lastUsed: Date | string) => {
    const usedField = usedFieldString(lastUsed, "last_used");
    if (usedField === "default")
      return formatDateToString(lastUsed, FORMATS.fullMonthDayYear);
    return usedField;
  };

  return (
    <ul
      className={`aooth-flex aooth-flex-col aooth-gap-[24px] aooth-max-w-[384px] aooth-w-full aooth-p-[24px] 
      aooth-rounded-[6px] aooth-shadow-[0_4px_15px_0_rgba(0,0,0,0.09)] aooth-mt-[32px]`}
    >
      {data.map(
        ({ id, name, enrolled_at: enrolledAt, last_used: lastUsed }) => (
          <li
            key={id}
            className="aooth-flex aooth-gap-[16px] aooth-items-start aooth-justify-start"
          >
            <Icon type="general" id="passkey" size="large" />
            <div className="aooth-flex aooth-flex-col aooth-items-start aooth-justify-start aooth-gap-[2px]">
              <p className="aooth-text-title-3-medium aooth-text-Dark-Three">
                {name ?? "Passkey"}
              </p>
              <p className="aooth-text-body-2-medium aooth-text-Grey-Six">
                Created:{" "}
                {formatDateToString(enrolledAt, FORMATS.fullMonthDayYear)}
              </p>
              <p className="aooth-text-body-2-medium aooth-text-Grey-Six">
                Last used: {lastUsedString(lastUsed)}
              </p>
            </div>
            {renderActions(id, name)}
          </li>
        )
      )}
    </ul>
  );
};
