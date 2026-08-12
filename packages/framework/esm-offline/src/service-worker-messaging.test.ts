import { describe, expect, it, vi } from 'vitest';
import { clearOmrsServiceWorkerCache, messageOmrsServiceWorker } from './service-worker-messaging';
import * as serviceWorker from './service-worker';

describe('clearOmrsServiceWorkerCache', () => {
  it('sends a clearCache message to the registered service worker', async () => {
    const messageSW = vi.fn().mockResolvedValue({ success: true, result: undefined });
    vi.spyOn(serviceWorker, 'getOmrsServiceWorker').mockResolvedValue({ messageSW } as never);

    const result = await clearOmrsServiceWorkerCache();

    expect(messageSW).toHaveBeenCalledWith({ type: 'clearCache' });
    expect(result).toEqual({ success: true, result: undefined });
  });

  it('reports failure without throwing when no service worker is registered', async () => {
    vi.spyOn(serviceWorker, 'getOmrsServiceWorker').mockResolvedValue(undefined);

    const result = await clearOmrsServiceWorkerCache();

    expect(result.success).toBe(false);
  });
});

describe('messageOmrsServiceWorker', () => {
  it('forwards arbitrary known messages to the registered service worker', async () => {
    const messageSW = vi.fn().mockResolvedValue({ success: true, result: undefined });
    vi.spyOn(serviceWorker, 'getOmrsServiceWorker').mockResolvedValue({ messageSW } as never);

    await messageOmrsServiceWorker({ type: 'clearDynamicRoutes' });

    expect(messageSW).toHaveBeenCalledWith({ type: 'clearDynamicRoutes' });
  });
});
