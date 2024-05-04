import { AoothFlow } from '@/components/flow';
import { BrowserRouter } from 'react-router-dom';

export const App = () => (
  <BrowserRouter>
    <AoothFlow
      federatedDisplayMode='redirect'
      successAuthRedirect='https://jwt.io'
      federatedCallbackUrl='https://jwt.io'
      pathPrefix='/web'
    />
  </BrowserRouter>
);

export default App;
