import { mutate } from 'swr';
import {
  clearCurrentUser,
  clearOmrsServiceWorkerCache,
  openmrsFetch,
  refetchCurrentUser,
  restBaseUrl,
} from '@openmrs/esm-framework';

export async function performLogout() {
  await openmrsFetch(`${restBaseUrl}/session`, {
    method: 'DELETE',
  });

  // clear the SWR cache on logout, do not revalidate
  // taken from the SWR docs
  mutate(() => true, undefined, { revalidate: false });

  clearCurrentUser();

  // Clear the service worker's Cache Storage (precached app shell + any cached
  // import-map bundles/data) so a subsequent login never gets served content
  // cached for the previous user or an older build. No-ops when the app was
  // built without offline support (no service worker registered).
  try {
    await clearOmrsServiceWorkerCache();
  } catch (_) {
    // do nothing, silence the user-visible error
  }

  // Clear persisted client storage so config overrides, feature flags, and tooling
  // state don't leak into the next user's session. Scoped to the `openmrs:` prefix
  // so keys owned by anything else on the same origin (e.g. the legacy UI, or
  // import-map-override's dev overrides) are left alone.
  try {
    const preserve = new Set(['openmrs:devtools']);
    Object.keys(localStorage)
      .filter((key) => key.startsWith('openmrs:') && !preserve.has(key))
      .forEach((key) => localStorage.removeItem(key));
    sessionStorage.clear();
  } catch (_) {
    // do nothing, silence the user-visible error
  }

  try {
    await refetchCurrentUser();
  } catch (_) {
    // do nothing, silence the user-visible error
  }
}
