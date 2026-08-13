import { beforeEach, describe, expect, it, vi } from 'vitest';

const clearOmrsCacheMock = vi.fn().mockResolvedValue(undefined);
const cacheImportMapReferencesMock = vi.fn().mockResolvedValue(undefined);

vi.mock('./caching', () => ({
  clearOmrsCache: clearOmrsCacheMock,
  cacheImportMapReferences: cacheImportMapReferencesMock,
}));

vi.mock('./storage', () => ({
  ServiceWorkerDb: vi.fn().mockImplementation(() => ({
    dynamicRouteRegistrations: { clear: vi.fn().mockResolvedValue(undefined) },
  })),
}));

function makeMessageEvent(data: unknown, origin = 'http://localhost/') {
  const port = { postMessage: vi.fn() };
  const event = {
    data,
    source: { url: origin },
    ports: [port],
  } as unknown as ExtendableMessageEvent;
  return { event, port };
}

describe('handleMessage', () => {
  beforeEach(() => {
    clearOmrsCacheMock.mockClear();
  });

  it('clears the OMRS cache and reports success when receiving a clearCache message', async () => {
    const { handleMessage } = await import('./message');
    const { event, port } = makeMessageEvent({ type: 'clearCache' });

    await handleMessage(event);

    expect(clearOmrsCacheMock).toHaveBeenCalledTimes(1);
    expect(port.postMessage).toHaveBeenCalledWith({ success: true, result: undefined });
  });

  it('reports failure if clearing the cache throws', async () => {
    clearOmrsCacheMock.mockRejectedValueOnce(new Error('Cache Storage unavailable'));

    const { handleMessage } = await import('./message');
    const { event, port } = makeMessageEvent({ type: 'clearCache' });

    await handleMessage(event);

    expect(port.postMessage).toHaveBeenCalledWith({ success: false, error: 'Cache Storage unavailable' });
  });

  it('ignores messages from a different origin', async () => {
    const { handleMessage } = await import('./message');
    const { event, port } = makeMessageEvent({ type: 'clearCache' }, 'https://evil.example/');

    await handleMessage(event);

    expect(clearOmrsCacheMock).not.toHaveBeenCalled();
    expect(port.postMessage).not.toHaveBeenCalled();
  });
});
