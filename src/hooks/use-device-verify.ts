import type { DeviceError } from '@/types/device-errors';
import { DeviceApiError, classifyDeviceError } from '@/utils';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The RFC 8628 verification flow, as a hook.
 *
 * ── The one rule the whole thing is built around ────────────────────────────
 * Signing in and approving are TWO ACTS, and this hook keeps them two. Proving
 * who you are (`/oidc/device/authenticate`) yields an approval ticket and
 * NOTHING else — no tokens, no session. Approving (`/oidc/device/approve`) is
 * what releases tokens to the waiting terminal, and it needs that ticket.
 *
 * The gap between them is not ceremony, it is RFC 8628 §5.4: an attacker can
 * start a device grant and walk a victim into approving it (STORM-2372). They
 * know the user_code — they created it — and the page is public, so they can
 * read its CSRF token too. Neither can be the authority for approval. Only the
 * ticket, held in this hook's memory and bound to the browser that actually
 * authenticated, can be.
 *
 * So: never collapse authenticate+approve into one call "for convenience".
 * Mode 1 puts both behind one TAP (see confirmWithPassword) — that is a UI
 * affordance and is fine, because the human still looked at the code first.
 * Mode 3 skips the tap entirely, which it earns by using an origin-bound
 * passkey; see the note on confirmWithPasskey.
 */

/** The UI the server resolved for this challenge. A closed set — the client does not choose. */
export type DeviceUIMode = 'consent' | 'full_login' | 'passkey';

/** What GET /oidc/device/info hands the page to render itself. */
export type DeviceVerifyInfo = {
  mode: DeviceUIMode;
  /** Absent for `passkey` mode, by design — see device_page.go. */
  user_code?: string;
  app_name: string;
  csrf_token: string;
  methods: {
    password: boolean;
    passkey: boolean;
  };
};

export type DeviceVerifyStatus =
  /** Asking the server what to render. */
  | 'loading'
  /** No code yet — show the entry form. */
  | 'code_entry'
  /** Info in hand; awaiting the user. */
  | 'ready'
  /** A call is in flight. */
  | 'working'
  /** Identity proven, ticket held, not yet approved. */
  | 'signed_in'
  /** Approved. The terminal has its tokens. */
  | 'done'
  /** The mode is switched off. Terminal, and nothing approvable is rendered. */
  | 'refused'
  /** Terminal failure — bad/expired code, dead app. */
  | 'failed';

export type UseDeviceVerifyProps = {
  status: DeviceVerifyStatus;
  info: DeviceVerifyInfo | null;
  error: DeviceError | null;
  /** The email that authenticated, once one has. */
  email: string | null;
  /** Whether an approval ticket is held. */
  isAuthenticated: boolean;
  /** Re-run the info lookup for a code typed by hand. */
  submitCode: (code: string) => void;
  /** Prove identity with a password. Does NOT approve. */
  signInWithPassword: (email: string, password: string) => Promise<void>;
  /** Prove identity with a passkey. Does NOT approve. */
  signInWithPasskey: () => Promise<void>;
  /** Approve, using the ticket already held. */
  approve: () => Promise<void>;
  /** One tap: prove identity if needed, then approve. */
  confirmWithPassword: (email: string, password: string) => Promise<void>;
  /** Passkey ceremony then approve, with no tap in between. */
  confirmWithPasskey: () => Promise<void>;
  /** Clear a recoverable error so the user can try again. */
  clearError: () => void;
};

const DEVICE_ENDPOINTS = {
  info: '/oidc/device/info',
  authenticate: '/oidc/device/authenticate',
  approve: '/oidc/device/approve',
  passkeyStart: '/oidc/device/passkey/start',
} as const;

/** Read `user_code` off the URL — the QR encodes verification_uri_complete. */
const readUserCodeFromURL = (): string => new URLSearchParams(window.location.search).get('user_code') ?? '';

/**
 * Parse a device endpoint's response, turning any failure into a DeviceApiError
 * that carries the server's stable `reason`.
 */
const parseDeviceResponse = async <T>(res: Response): Promise<T> => {
  const body: unknown = await res.json().catch(() => ({}));
  const data = (body ?? {}) as Record<string, unknown>;

  if (!res.ok) {
    throw new DeviceApiError({
      reason: typeof data.reason === 'string' ? data.reason : '',
      code: typeof data.error === 'string' ? data.error : '',
      status: res.status,
      description: typeof data.error_description === 'string' ? data.error_description : '',
    });
  }
  return data as T;
};

export const useDeviceVerify = (): UseDeviceVerifyProps => {
  const [status, setStatus] = useState<DeviceVerifyStatus>('loading');
  const [info, setInfo] = useState<DeviceVerifyInfo | null>(null);
  const [error, setError] = useState<DeviceError | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [userCode, setUserCode] = useState<string>(() => readUserCodeFromURL());

  /**
   * The approval ticket. A ref, not state: it is an authorization handle, so it
   * must be readable synchronously by the call that follows the one that earned
   * it. `confirmWithPassword` authenticates and approves back-to-back within a
   * single event; a state read there would still be null, and the approve would
   * be refused for no reason a user could understand.
   */
  const ticketRef = useRef<string | null>(null);

  /** Guards against setting state after unmount, and against double-fires. */
  const activeRef = useRef(true);
  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const csrf = info?.csrf_token ?? '';

  /**
   * Every back-channel POST: same-origin, JSON, the challenge's CSRF token, and
   * the user_code that scopes it.
   */
  const post = useCallback(
    async <T>(path: string, body: Record<string, unknown>): Promise<T> => {
      const res = await fetch(path, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Passflow-CSRF': csrf,
        },
        body: JSON.stringify({ ...body, user_code: userCode }),
      });
      return parseDeviceResponse<T>(res);
    },
    [csrf, userCode],
  );

  /**
   * Record a failure: classified for the user, logged in full for us.
   *
   * This is the ONLY place a failure becomes user-visible, which is what makes
   * "no technical string reaches the screen" checkable rather than aspirational.
   */
  const fail = useCallback((err: unknown, terminal: DeviceVerifyStatus | null = null) => {
    const classified = classifyDeviceError(err);
    // The detail the user must never read, kept exactly where a developer will
    // look for it first.
    if (classified.detail) {
      console.error('[passflow] device verification:', classified.detail, err);
    }
    if (!activeRef.current) return;
    setError(classified);
    if (terminal) {
      setStatus(terminal);
      return;
    }
    setStatus(classified.type === 'mode_disabled' ? 'refused' : ticketRef.current ? 'signed_in' : 'ready');
  }, []);

  // ── Load what to render ───────────────────────────────────────────────────
  const loadInfo = useCallback(async (code: string) => {
    if (!code) {
      setStatus('code_entry');
      setError(null);
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const res = await fetch(`${DEVICE_ENDPOINTS.info}?user_code=${encodeURIComponent(code)}`, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      const data = await parseDeviceResponse<DeviceVerifyInfo>(res);
      if (!activeRef.current) return;
      setInfo(data);
      setStatus('ready');
    } catch (err) {
      const classified = classifyDeviceError(err);
      if (classified.detail) {
        console.error('[passflow] device verification:', classified.detail, err);
      }
      if (!activeRef.current) return;

      // `code_required` is not a failure — it is the code entry form.
      if (classified.type === 'code_required') {
        setError(null);
        setStatus('code_entry');
        return;
      }
      setError(classified);
      // A disabled mode gets its own terminal state so the page can render a
      // refusal with NOTHING approvable on it. A bad or dead code lands on the
      // entry form, where the remedy (type it again) actually lives.
      setStatus(classified.type === 'mode_disabled' ? 'refused' : 'failed');
    }
  }, []);

  useEffect(() => {
    void loadInfo(userCode);
  }, [loadInfo, userCode]);

  const submitCode = useCallback((code: string) => {
    setUserCode(code.trim());
  }, []);

  // ── Prove identity. Yields a ticket; approves nothing. ────────────────────
  const authenticatePassword = useCallback(
    async (emailValue: string, password: string): Promise<void> => {
      const res = await post<{ approval_ticket: string; email?: string }>(DEVICE_ENDPOINTS.authenticate, {
        method: 'password',
        email: emailValue,
        password,
      });
      ticketRef.current = res.approval_ticket;
      if (!activeRef.current) return;
      setEmail(res.email ?? emailValue);
    },
    [post],
  );

  const authenticatePasskey = useCallback(async (): Promise<void> => {
    // Thrown as a DOMException so it travels the same road as every real
    // WebAuthn failure and lands on the same classified copy — rather than
    // becoming a second, parallel way for this page to describe a passkey
    // problem, which is how the copy drifts.
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      throw new DOMException('this browser does not implement PublicKeyCredential', 'NotSupportedError');
    }

    const start = await post<{ passkey_challenge_id: string; publicKey: unknown }>(DEVICE_ENDPOINTS.passkeyStart, {});

    // The SDK's existing WebAuthn primitive, not a hand-rolled base64url dance.
    // @simplewebauthn/browser v13 takes the server's JSON options as-is.
    const { startAuthentication } = await import('@simplewebauthn/browser');
    const assertion = await startAuthentication({ optionsJSON: start.publicKey as never });

    const res = await post<{ approval_ticket: string; email?: string }>(DEVICE_ENDPOINTS.authenticate, {
      method: 'passkey',
      passkey_challenge_id: start.passkey_challenge_id,
      passkey_data: assertion,
    });
    ticketRef.current = res.approval_ticket;
    if (!activeRef.current) return;
    setEmail(res.email ?? null);
  }, [post]);

  // ── The act that releases tokens ──────────────────────────────────────────
  const approveWithTicket = useCallback(async (): Promise<void> => {
    await post(DEVICE_ENDPOINTS.approve, { approval_ticket: ticketRef.current });
    if (!activeRef.current) return;
    setStatus('done');
  }, [post]);

  const signInWithPassword = useCallback(
    async (emailValue: string, password: string) => {
      setStatus('working');
      setError(null);
      try {
        await authenticatePassword(emailValue, password);
        if (!activeRef.current) return;
        setStatus('signed_in');
      } catch (err) {
        fail(err);
      }
    },
    [authenticatePassword, fail],
  );

  const signInWithPasskey = useCallback(async () => {
    setStatus('working');
    setError(null);
    try {
      await authenticatePasskey();
      if (!activeRef.current) return;
      setStatus('signed_in');
    } catch (err) {
      fail(err);
    }
  }, [authenticatePasskey, fail]);

  const approve = useCallback(async () => {
    setStatus('working');
    setError(null);
    try {
      await approveWithTicket();
    } catch (err) {
      fail(err);
    }
  }, [approveWithTicket, fail]);

  /**
   * Mode 1's single tap: prove identity if we have not already, then approve.
   *
   * Two calls behind one button is the affordance; it is NOT a collapse of the
   * §5.4 check. The check is that a human read the code and chose to proceed,
   * and that is exactly what the tap is.
   */
  const confirmWithPassword = useCallback(
    async (emailValue: string, password: string) => {
      setStatus('working');
      setError(null);
      try {
        if (!ticketRef.current) {
          await authenticatePassword(emailValue, password);
        }
        await approveWithTicket();
      } catch (err) {
        fail(err);
      }
    },
    [authenticatePassword, approveWithTicket, fail],
  );

  /**
   * Passkey then approve, with nothing in between.
   *
   * For Mode 3 this runs on load, with no user gesture, and both halves of that
   * are deliberate:
   *  - WebAuthn L3's get() carries no transient-activation requirement (unlike
   *    create()), so firing on load is legal. The phone's own biometric prompt
   *    IS the interaction; a button first would add a step that protects nothing.
   *  - No §5.4 confirm follows, because a passkey is origin-bound: the
   *    authenticator scopes the assertion to this origin, so it cannot be
   *    produced on an attacker's page or replayed to one. There is no phished
   *    approval to catch and so nothing for the human to compare.
   */
  const confirmWithPasskey = useCallback(async () => {
    setStatus('working');
    setError(null);
    try {
      await authenticatePasskey();
      await approveWithTicket();
    } catch (err) {
      fail(err);
    }
  }, [authenticatePasskey, approveWithTicket, fail]);

  const clearError = useCallback(() => setError(null), []);

  return {
    status,
    info,
    error,
    email,
    isAuthenticated: ticketRef.current !== null,
    submitCode,
    signInWithPassword,
    signInWithPasskey,
    approve,
    confirmWithPassword,
    confirmWithPasskey,
    clearError,
  };
};
