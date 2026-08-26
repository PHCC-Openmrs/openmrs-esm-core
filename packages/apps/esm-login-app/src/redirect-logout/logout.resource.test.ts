import { mutate } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type FetchResponse, clearCurrentUser, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { performLogout } from './logout.resource';

vi.mock('swr', () => ({
  mutate: vi.fn(),
}));

const mockOpenmrsFetch = vi.mocked(openmrsFetch);
const mockClearCurrentUser = vi.mocked(clearCurrentUser);

describe('performLogout', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockOpenmrsFetch.mockResolvedValue({} as FetchResponse<unknown>);
  });

  it('clears openmrs:-prefixed localStorage keys', async () => {
    localStorage.setItem('openmrs:temporaryConfig', '{"some":"override"}');
    localStorage.setItem('openmrs:feature-flag:some-flag', 'true');
    localStorage.setItem('openmrs:isUIEditorEnabled', 'true');

    await performLogout();

    expect(localStorage.getItem('openmrs:temporaryConfig')).toBeNull();
    expect(localStorage.getItem('openmrs:feature-flag:some-flag')).toBeNull();
    expect(localStorage.getItem('openmrs:isUIEditorEnabled')).toBeNull();
  });

  it('preserves openmrs:devtools', async () => {
    localStorage.setItem('openmrs:devtools', 'true');

    await performLogout();

    expect(localStorage.getItem('openmrs:devtools')).toBe('true');
  });

  it('does not touch keys outside the openmrs: prefix', async () => {
    localStorage.setItem(
      'import-map-override:@openmrs/esm-login-app',
      'http://localhost:8080/openmrs-esm-login-app.js',
    );

    await performLogout();

    expect(localStorage.getItem('import-map-override:@openmrs/esm-login-app')).toBe(
      'http://localhost:8080/openmrs-esm-login-app.js',
    );
  });

  it('clears sessionStorage', async () => {
    sessionStorage.setItem('some-key', 'some-value');

    await performLogout();

    expect(sessionStorage.getItem('some-key')).toBeNull();
  });

  it('does not throw and still calls DELETE /session, clearCurrentUser if storage access throws', async () => {
    const originalKeys = Object.keys;
    vi.spyOn(Object, 'keys').mockImplementationOnce(() => {
      throw new Error('storage unavailable');
    });

    await expect(performLogout()).resolves.not.toThrow();

    expect(mockOpenmrsFetch).toHaveBeenCalledWith(`${restBaseUrl}/session`, { method: 'DELETE' });
    expect(mockClearCurrentUser).toHaveBeenCalled();

    Object.keys = originalKeys;
  });
});
