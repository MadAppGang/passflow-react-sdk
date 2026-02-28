import type { CLIAuthCompleteRequest, CLIAuthStatusResponse } from '@passflow/core';
import { useCallback, useEffect, useState } from 'react';

export type CLIAuthState = 'loading' | 'pending' | 'authenticating' | 'completed' | 'expired' | 'error';

export type UseCLIAuthProps = {
  authenticate: () => Promise<void>;
  state: CLIAuthState;
  error: string | null;
  expiresAt: string | null;
};

export const useCLIAuth = (sessionId: string): UseCLIAuthProps => {
  const [state, setState] = useState<CLIAuthState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Record<string, unknown> | null>(null);

  // Get server URL from window location (same-origin)
  const serverUrl = window.location.origin;

  // Fetch CLI auth status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`${serverUrl}/cli/auth/status/${sessionId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch CLI auth status: ${response.statusText}`);
      }

      const data: CLIAuthStatusResponse = await response.json();

      setExpiresAt(data.expires_at || null);

      switch (data.status) {
        case 'pending':
          setState('pending');
          setChallenge(data.challenge || null);
          break;
        case 'completed':
          setState('completed');
          break;
        case 'expired':
          setState('expired');
          setError('This authentication session has expired. Please start a new one from your terminal.');
          break;
        case 'failed':
          setState('error');
          setError(data.error || 'Authentication failed');
          break;
      }
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to load authentication status');
    }
  }, [sessionId, serverUrl]);

  // Authenticate with WebAuthn
  const authenticate = useCallback(async () => {
    if (!challenge) {
      setError('No challenge available for authentication');
      return;
    }

    setState('authenticating');
    setError(null);

    try {
      // Import startAuthentication dynamically to avoid bundling issues
      const { startAuthentication } = await import('@simplewebauthn/browser');

      // Step 1: Start WebAuthn authentication
      // The challenge from the server is wrapped in { publicKey: { ... } }
      // but startAuthentication expects the inner PublicKeyCredentialRequestOptionsJSON directly
      const optionsJSON = (challenge as Record<string, unknown>).publicKey || challenge;
      const webauthnResponse = await startAuthentication({ optionsJSON: optionsJSON as never });

      // Step 2: Complete passkey authentication to get tokens
      const completeResponse = await fetch(`${serverUrl}/auth/passkey/authenticate/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webauthnResponse),
      });

      if (!completeResponse.ok) {
        throw new Error(`Passkey authentication failed: ${completeResponse.statusText}`);
      }

      const authData = await completeResponse.json();

      if (!authData.access_token || !authData.refresh_token) {
        throw new Error('Invalid authentication response: missing tokens');
      }

      // Step 3: Complete CLI auth by sending tokens to server
      const cliCompleteRequest: CLIAuthCompleteRequest = {
        session_id: sessionId,
        access_token: authData.access_token,
        refresh_token: authData.refresh_token,
        user_id: authData.user_id,
        expires_in: authData.expires_in,
      };

      const cliCompleteResponse = await fetch(`${serverUrl}/cli/auth/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cliCompleteRequest),
      });

      if (!cliCompleteResponse.ok) {
        throw new Error(`CLI authentication completion failed: ${cliCompleteResponse.statusText}`);
      }

      setState('completed');
    } catch (err) {
      setState('error');
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Authentication was cancelled or not allowed');
        } else {
          setError(err.message);
        }
      } else {
        setError('Authentication failed');
      }
    }
  }, [challenge, sessionId, serverUrl]);

  // Fetch status on mount
  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  return {
    authenticate,
    state,
    error,
    expiresAt,
  };
};
