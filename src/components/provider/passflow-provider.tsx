import { FC, ReactNode, useCallback, useMemo, useReducer, useState } from "react";
import { NavigateFunction, NavigationContext, PassflowContext, defaultNavigate, initialState, passflowReducer } from "@/context";
import { Passflow, PassflowConfig } from "@passflow/passflow-js-sdk";
import "@/styles/index.css";

type RouterType = 'default' | 'react-router' | 'tanstack-router';

type PassflowProviderProps = PassflowConfig & {
	children: ReactNode;
	navigate?: NavigateFunction;
	router?: RouterType;
};

export const PassflowProvider: FC<PassflowProviderProps> = ({
	children,
	navigate: initialNavigate,
	router = 'default',
	...config
}) => {
	const [state, dispatch] = useReducer(passflowReducer, {
		...initialState,
		...config,
	});

	const [navigate, setNavigate] = useState<NavigateFunction>(() => {
		if (initialNavigate) {
			return initialNavigate;
		}
		return defaultNavigate;
	});

	const passflow = useMemo(() => new Passflow(state), [state]);
	const passflowValue = useMemo(
		() => ({ state, dispatch, passflow }),
		[state, dispatch, passflow],
	);
	
	const handleSetNavigate = useCallback((newNavigate: NavigateFunction | null) => {
		setNavigate(() => newNavigate || defaultNavigate);
	}, []);

	const navigationValue = useMemo(() => ({
		navigate,
		setNavigate: handleSetNavigate,
		router
	}), [navigate, handleSetNavigate, router]);

	return (
		<PassflowContext.Provider value={passflowValue}>
			<NavigationContext.Provider value={navigationValue}>
				{children}
			</NavigationContext.Provider>
		</PassflowContext.Provider>
	);
};
