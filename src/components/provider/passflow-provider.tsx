import { FC, ReactNode, useMemo, useReducer } from "react";
import { PassflowContext, initialState, passflowReducer } from "@/context";
import { Passflow, PassflowConfig } from "@passflow/passflow-js-sdk";
import "@/styles/index.css";

type PassflowProviderProps = PassflowConfig & {
	children: ReactNode;
};

export const PassflowProvider: FC<PassflowProviderProps> = ({
	children,
	...config
}) => {
	const [state, dispatch] = useReducer(passflowReducer, {
		...initialState,
		...config,
	});

	const passflow = useMemo(() => new Passflow(state), [state]);
	const value = useMemo(
		() => ({ state, dispatch, passflow }),
		[state, dispatch, passflow],
	);

	return (
		<PassflowContext.Provider value={value}>
			{children}
		</PassflowContext.Provider>
	);
};
