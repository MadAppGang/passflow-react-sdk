import { TwoFactorRecoveryForm, TwoFactorVerifyForm } from '@/components/form/two-factor-verify';
import { useNavigation, usePassflow } from '@/hooks';
import type { SuccessAuthRedirect } from '@/types';
import { getUrlWithTokens, isValidUrl } from '@/utils';
import type { FC } from 'react';
import { useState } from 'react';

import '@/styles/index.css';

type TwoFactorVerifyFlowProps = {
	successAuthRedirect?: SuccessAuthRedirect;
};

export const TwoFactorVerifyFlow: FC<TwoFactorVerifyFlowProps> = ({ successAuthRedirect }) => {
	const [mode, setMode] = useState<'verify' | 'recovery'>('verify');
	const { navigate } = useNavigation();
	const passflow = usePassflow();

	const handleSuccess = async () => {
		if (successAuthRedirect) {
			if (!isValidUrl(successAuthRedirect)) {
				navigate({ to: successAuthRedirect });
			} else {
				window.location.href = await getUrlWithTokens(passflow, successAuthRedirect);
			}
		}
	};

	const handleUseRecovery = () => {
		setMode('recovery');
	};

	const handleBackToVerify = () => {
		setMode('verify');
	};

	return (
		<>
			{mode === 'verify' ? (
				<TwoFactorVerifyForm onSuccess={handleSuccess} onUseRecovery={handleUseRecovery} />
			) : (
				<TwoFactorRecoveryForm onSuccess={handleSuccess} onBack={handleBackToVerify} />
			)}
		</>
	);
};
