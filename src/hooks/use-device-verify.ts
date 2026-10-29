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
 *
 * When the app requires a second factor, the first ticket cannot approve: the
 * server refuses it. The page asks for the factor (`/oidc/device/second-factor`)
 * and approves with the ticket that answers, which records both.
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

/** A second factor the verification page can take. */
export type DeviceSecondFactorMethod = 'totp' | 'recovery_codes';

export type DeviceVerifyStatus =
  /** Asking the server what to render. */
  | 'loading'
  /** No code yet — show the entry form. */
  | 'code_entry'
  /** Info in hand; awaiting the user. */
  | 'ready'
  /** A call is in flight. */
  | 'working'
  /** A first factor proven; the app wants a second before anything can be approved. */
  | 'second_factor'
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
  /** Whether a first-factor ticket is waiting for its second factor. */
  isSecondFactorPending: boolean;
  /** The second factors the server takes, once a sign-in owes one. */
  secondFactorMethods: DeviceSecondFactorMethod[];
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
  /**
   * Prove the second factor. Approves too when the act that asked for it was
   * an approval (consent's tap, the passkey mode); otherwise lands on signed_in.
   */
  submitSecondFactor: (method: DeviceSecondFactorMethod, code: string) => Promise<void>;
  /** Clear a recoverable error so the user can try again. */
  clearError: () => void;
};

const DEVICE_ENDPOINTS = {
  info: '/oidc/device/info',
  authenticate: '/oidc/device/authenticate',
  approve: '/oidc/device/approve',
  passkeyStart: '/oidc/device/passkey/start',
  secondFactor: '/oidc/device/second-factor',
} as const;

/** What /oidc/device/authenticate answers with. */
type DeviceAuthenticateResponse = {
  approval_ticket: string;
  email?: string;
  /** The app requires a second factor; this ticket cannot approve until one is given. */
  second_factor_required?: boolean;
  second_factor_methods?: string[];
};

const SECOND_FACTOR_METHODS: readonly DeviceSecondFactorMethod[] = ['totp', 'recovery_codes'];

/** The factors the server offers that this page can take, in its order. */
const toSecondFactorMethods = (methods: string[] | undefined): DeviceSecondFactorMethod[] => {
  const known = (methods ?? []).filter((m): m is DeviceSecondFactorMethod =>
    SECOND_FACTOR_METHODS.includes(m as DeviceSecondFactorMethod),
  );
  return known.length > 0 ? known : ['totp'];
};

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

  /**
   * The first-factor ticket, while the app still wants a second. Kept apart
   * from ticketRef because it cannot approve, so isAuthenticated must not
   * claim a sign-in the approval would refuse.
   */
  const firstFactorTicketRef = useRef<string | null>(null);
  /** Whether the act that asked for the second factor was an approval. */
  const approveAfterSecondFactorRef = useRef(false);
  const [secondFactorMethods, setSecondFactorMethods] = useState<DeviceSecondFactorMethod[]>([]);

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
    setStatus(
      classified.type === 'mode_disabled'
        ? 'refused'
        : firstFactorTicketRef.current
          ? 'second_factor'
          : ticketRef.current
            ? 'signed_in'
            : 'ready',
    );
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
  /**
   * Hold the ticket an authentication earned. Returns true when the app wants
   * a second factor first, in which case the ticket cannot approve yet.
   */
  const holdTicket = useCallback((res: DeviceAuthenticateResponse): boolean => {
    if (res.second_factor_required) {
      firstFactorTicketRef.current = res.approval_ticket;
      ticketRef.current = null;
      if (activeRef.current) setSecondFactorMethods(toSecondFactorMethods(res.second_factor_methods));
      return true;
    }
    firstFactorTicketRef.current = null;
    ticketRef.current = res.approval_ticket;
    return false;
  }, []);

  const authenticatePassword = useCallback(
    async (emailValue: string, password: string): Promise<boolean> => {
      const res = await post<DeviceAuthenticateResponse>(DEVICE_ENDPOINTS.authenticate, {
        method: 'password',
        email: emailValue,
        password,
      });
      const owesSecondFactor = holdTicket(res);
      if (activeRef.current) setEmail(res.email ?? emailValue);
      return owesSecondFactor;
    },
    [post, holdTicket],
  );

  const authenticatePasskey = useCallback(async (): Promise<boolean> => {
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

    const res = await post<DeviceAuthenticateResponse>(DEVICE_ENDPOINTS.authenticate, {
      method: 'passkey',
      passkey_challenge_id: start.passkey_challenge_id,
      passkey_data: assertion,
    });
    const owesSecondFactor = holdTicket(res);
    if (activeRef.current) setEmail(res.email ?? null);
    return owesSecondFactor;
  }, [post, holdTicket]);

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
        const owesSecondFactor = await authenticatePassword(emailValue, password);
        if (!activeRef.current) return;
        approveAfterSecondFactorRef.current = false;
        setStatus(owesSecondFactor ? 'second_factor' : 'signed_in');
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
      const owesSecondFactor = await authenticatePasskey();
      if (!activeRef.current) return;
      approveAfterSecondFactorRef.current = false;
      setStatus(owesSecondFactor ? 'second_factor' : 'signed_in');
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
        if (!ticketRef.current && (await authenticatePassword(emailValue, password))) {
          approveAfterSecondFactorRef.current = true;
          if (activeRef.current) setStatus('second_factor');
          return;
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
      if (await authenticatePasskey()) {
        approveAfterSecondFactorRef.current = true;
        if (activeRef.current) setStatus('second_factor');
        return;
      }
      await approveWithTicket();
    } catch (err) {
      fail(err);
    }
  }, [authenticatePasskey, approveWithTicket, fail]);

  /**
   * The second factor, for a sign-in whose app requires one. The server checks
   * the code for the user the first ticket names and answers with a ticket
   * recording both factors, which is the one that can approve.
   *
   * It approves straight away when the act that asked for the factor was
   * itself an approval: consent's tap, or the passkey mode, which has none.
   */
  const submitSecondFactor = useCallback(
    async (method: DeviceSecondFactorMethod, code: string) => {
      setStatus('working');
      setError(null);
      try {
        const res = await post<{ approval_ticket: string }>(DEVICE_ENDPOINTS.secondFactor, {
          approval_ticket: firstFactorTicketRef.current,
          method,
          code,
        });
        ticketRef.current = res.approval_ticket;
        firstFactorTicketRef.current = null;
        if (approveAfterSecondFactorRef.current) {
          await approveWithTicket();
          return;
        }
        if (activeRef.current) setStatus('signed_in');
      } catch (err) {
        fail(err);
      }
    },
    [post, approveWithTicket, fail],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    status,
    info,
    error,
    email,
    isAuthenticated: ticketRef.current !== null,
    isSecondFactorPending: firstFactorTicketRef.current !== null,
    secondFactorMethods,
    submitCode,
    signInWithPassword,
    signInWithPasskey,
    approve,
    confirmWithPassword,
    confirmWithPasskey,
    submitSecondFactor,
    clearError,
  };
};
