// Dev only (not in the package): the provider mounted as the hosted login app mounts it, for the Playwright check in a
// real browser. The app id comes from the URL or nowhere, and the API is same-origin, so a landing with no `appid` runs
// exactly as it does there. Keep it in step with login-app/src/App.tsx in the server repo. The one addition is `router=hash`,
// which runs the same flow on a hash router, as a host may mount it.
import { PassflowFlow } from '@/components/flow';
import type { HandOff } from '@/context';
import { handOffScopes, withScope } from '@/utils/hand-off';
import { PassflowProvider } from './components/provider';

const params = new URLSearchParams(window.location.search);
const onHashRouter = params.get('router') === 'hash';

// What the app asked for: `?scopes=` (comma-separated, as core's sign-in redirect writes it) and `?state=`.
const requestedScopes = params.get('scopes')?.split(',').filter(Boolean);
const handOff: HandOff = {
  scopes: requestedScopes?.length ? requestedScopes : undefined,
  state: params.get('state') ?? undefined,
};

export const HostedLogin = () => (
  <PassflowProvider
    appId={params.get('appid') || undefined}
    url={window.location.origin}
    handOff={handOff}
    scopes={withScope(handOffScopes(handOff) ?? [], 'offline')}
  >
    <PassflowFlow
      pathPrefix={onHashRouter ? undefined : '/hosted'}
      routerType={onHashRouter ? 'hash' : 'browser'}
      successAuthRedirect={params.get('redirectto') || undefined}
      federatedDisplayMode='redirect'
      federatedLanding='login-page'
    />
  </PassflowProvider>
);
