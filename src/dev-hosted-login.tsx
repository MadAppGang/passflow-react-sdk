// Dev only (not in the package): the provider mounted as the hosted login app mounts it, for the Playwright check in a
// real browser. The app id comes from the URL or nowhere, and the API is same-origin, so a landing with no `appid` runs
// exactly as it does there. Keep it in step with login-app/src/App.tsx in the server repo.
import { PassflowFlow } from '@/components/flow';
import { PassflowProvider } from './components/provider';

const params = new URLSearchParams(window.location.search);

export const HostedLogin = () => (
  <PassflowProvider
    appId={params.get('appid') || undefined}
    url={window.location.origin}
    scopes={['offline', 'openid', 'profile']}
  >
    <PassflowFlow
      pathPrefix='/hosted'
      successAuthRedirect={params.get('redirectto') || undefined}
      federatedDisplayMode='redirect'
      federatedLanding='login-page'
    />
  </PassflowProvider>
);
