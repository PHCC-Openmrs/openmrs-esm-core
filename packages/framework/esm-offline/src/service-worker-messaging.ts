/** @module @category Offline */
import type { ImportMap } from '@openmrs/esm-globals';
import type { OmrsOfflineCachingStrategy } from './service-worker-http-headers';
import { getOmrsServiceWorker } from './service-worker';

/**
 * Sends the specified message to the application's service worker.
 * @param message The message to be sent.
 * @returns A promise which completes when the message has been successfully processed by the Service Worker.
 */
export async function messageOmrsServiceWorker(
  message: KnownOmrsServiceWorkerMessages,
): Promise<MessageServiceWorkerResult<any>> {
  const sw = await getOmrsServiceWorker();
  return sw
    ? await sw.messageSW(message)
    : {
        success: false,
        result: undefined,
        error:
          'No service worker has been registered. This is typically the case when the application has been built without offline-related features.',
      };
}

export interface OmrsServiceWorkerMessage<MessageTypeTypeIdentifier extends string> {
  type: MessageTypeTypeIdentifier;
}

export interface OnImportMapChangedMessage extends OmrsServiceWorkerMessage<'onImportMapChanged'> {
  importMap: ImportMap;
}

export interface ClearDynamicRoutesMessage extends OmrsServiceWorkerMessage<'clearDynamicRoutes'> {}

export interface RegisterDynamicRouteMessage extends OmrsServiceWorkerMessage<'registerDynamicRoute'> {
  pattern?: string;
  url?: string;
  strategy?: OmrsOfflineCachingStrategy;
}

export interface ClearCacheMessage extends OmrsServiceWorkerMessage<'clearCache'> {}

export type KnownOmrsServiceWorkerMessages =
  | OnImportMapChangedMessage
  | ClearDynamicRoutesMessage
  | RegisterDynamicRouteMessage
  | ClearCacheMessage;

/**
 * Asks the service worker to drop everything it has cached in Cache Storage
 * (the OMRS app cache), including precached app shell files and any cached
 * import-map-resolved bundles/data. Used on logout so a subsequent login
 * (potentially as a different user) never gets served stale cached content.
 * @returns A promise which completes when the service worker has cleared its cache.
 */
export async function clearOmrsServiceWorkerCache(): Promise<MessageServiceWorkerResult<any>> {
  return messageOmrsServiceWorker({ type: 'clearCache' });
}

export interface MessageServiceWorkerResult<T> {
  success: boolean;
  result?: T;
  error?: string;
}
