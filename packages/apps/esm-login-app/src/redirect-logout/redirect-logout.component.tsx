import { useEffect } from 'react';
import { navigate, setUserLanguage, useConfig, useConnectivity, useSession } from '@openmrs/esm-framework';
import { clearHistory } from '@openmrs/esm-framework/src/internal';
import { type ConfigSchema } from '../config-schema';
import { performLogout } from './logout.resource';

const RedirectLogout: React.FC = () => {
  const config = useConfig<ConfigSchema>();
  const isLoginEnabled = useConnectivity();
  const session = useSession();

  useEffect(() => {
    clearHistory();
    if (!session.authenticated || !isLoginEnabled) {
      if (config.provider.type === 'custom') {
        navigate({ to: config.provider.loginUrl });
      } else if (config.provider.type === 'oauth2') {
        // do nothing, do not redirect
      } else {
        // Full document load, not an SPA route change, so every in-memory store
        // (zustand, module-level state) is torn down and reset on the next login.
        window.location.assign(`${window.getOpenmrsSpaBase()}login`);
      }
    } else {
      performLogout()
        .then(() => {
          const defaultLanguage = document.documentElement.getAttribute('data-default-lang');

          setUserLanguage({
            locale: defaultLanguage,
            authenticated: false,
            sessionId: '',
          });

          if (config.provider.type === 'custom') {
            navigate({ to: config.provider.loginUrl });
          } else if (config.provider.type === 'oauth2') {
            // do nothing, do not redirect
          } else {
            window.location.assign(`${window.getOpenmrsSpaBase()}login`);
          }
        })
        .catch((error) => {
          console.error('Logout failed:', error);
        });
    }
  }, [config, isLoginEnabled, session]);

  return null;
};

export default RedirectLogout;
