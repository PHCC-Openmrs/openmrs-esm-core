import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Button, Checkbox, InlineLoading } from '@carbon/react';
import { useLocation, type Location, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getCoreTranslation,
  LocationPicker,
  navigate,
  setSessionLocation,
  useConfig,
  useConnectivity,
  useSession,
  WarningIcon,
} from '@openmrs/esm-framework';
import { useDefaultLocation, useLocationCount } from './location-picker.resource';
import type { ConfigSchema } from '../config-schema';
import type { LoginReferrer } from '../login/login.component';
import styles from './location-picker.scss';

/**
 * Validates that a returnToUrl is safe to navigate to.
 * Only same-origin URLs are permitted, preventing open-redirect attacks after login.
 */
export function isSafeReturnUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

interface LocationPickerProps {
  hideWelcomeMessage?: boolean;
  currentLocationUuid?: string;
}

const LocationPickerView: React.FC<LocationPickerProps> = ({ hideWelcomeMessage, currentLocationUuid }) => {
  const { t } = useTranslation();
  const config = useConfig<ConfigSchema>();
  const { chooseLocation } = config;
  const isLoginEnabled = useConnectivity();
  const [searchParams] = useSearchParams();
  const checkboxId = useId();
  const isUpdateFlow = useMemo(() => searchParams.get('update') === 'true', [searchParams]);
  const { defaultLocation, updateDefaultLocation, savePreference, setSavePreference } =
    useDefaultLocation(isUpdateFlow);
  const {
    isLoading: isLoadingLocationCount,
    locationCount,
    firstLocation,
  } = useLocationCount(chooseLocation.useLoginLocationTag);

  const { user, sessionLocation } = useSession();
  const { currentUser, userProperties } = useMemo(
    () => ({
      currentUser: user?.display,
      userProperties: user?.userProperties,
    }),
    [user],
  );

  // The locationbasedaccess module (if installed) writes an admin-assigned, comma-separated
  // list of location uuids into this user property. Its presence means the user is restricted
  // to exactly those locations; its absence (the default for every user) means unrestricted.
  const allowedLocationUuids = useMemo(() => {
    const raw = userProperties?.locationUuid;
    if (!raw) {
      return undefined;
    }
    const uuids = raw
      .split(',')
      .map((uuid) => uuid.trim())
      .filter(Boolean);
    return uuids.length ? uuids : undefined;
  }, [userProperties]);

  const isRestricted = allowedLocationUuids !== undefined;

  // When restricted, the allowed-locations list (not the unfiltered login-location list) is the
  // source of truth for "is there only one choice" - otherwise a restricted user could be
  // auto-logged into an arbitrary location outside their allowed set whenever the overall
  // installation happens to have exactly one login location, or whenever location choice is
  // disabled system-wide.
  const effectiveLocationCount = isRestricted ? allowedLocationUuids.length : locationCount;
  const effectiveFirstLocationUuid = isRestricted ? allowedLocationUuids[0] : firstLocation?.resource?.id;

  const hasNoLocations = !isLoadingLocationCount && effectiveLocationCount === 0;

  const [activeLocation, setActiveLocation] = useState(() => {
    if (currentLocationUuid && hideWelcomeMessage) {
      return currentLocationUuid;
    }
    return sessionLocation?.uuid ?? defaultLocation;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { state } = useLocation() as unknown as Omit<Location, 'state'> & {
    state: LoginReferrer;
  };

  const changeLocation = useCallback(
    (locationUuid?: string, saveUserPreference?: boolean) => {
      setIsSubmitting(true);

      const referrer = state?.referrer;
      const returnToUrl = searchParams.get('returnToUrl');

      const sessionDefined = setSessionLocation(locationUuid, new AbortController());

      updateDefaultLocation(locationUuid, saveUserPreference);
      sessionDefined.then(() => {
        if (referrer && referrer.startsWith('/') && !['/', '/login', '/login/location'].includes(referrer)) {
          navigate({ to: '${openmrsSpaBase}' + referrer });
          return;
        }
        if (returnToUrl && isSafeReturnUrl(returnToUrl)) {
          navigate({ to: returnToUrl });
        } else {
          navigate({ to: config.links.loginSuccess });
        }
      });
    },
    [state?.referrer, config.links.loginSuccess, updateDefaultLocation, searchParams],
  );

  // Handle cases where the location picker is disabled or there is only one location.
  useEffect(() => {
    if (isLoadingLocationCount) return;

    if (effectiveLocationCount === 1 || (!chooseLocation.enabled && effectiveLocationCount > 0)) {
      if (effectiveFirstLocationUuid) {
        changeLocation(effectiveFirstLocationUuid, true);
      } else {
        console.error('Expected location data is missing', { firstLocation, locationCount, allowedLocationUuids });
      }
    }
  }, [effectiveLocationCount, effectiveFirstLocationUuid, isLoadingLocationCount]);

  // Handle cases where the login location is present in the userProperties. A saved preference
  // is only honored if the user is unrestricted, or the saved location is still in their
  // (possibly since-changed) allowed set - otherwise a stale preference from before the
  // restriction was applied could silently log the user into a disallowed location.
  useEffect(() => {
    if (isUpdateFlow) {
      return;
    }
    if (defaultLocation && !isSubmitting && (!isRestricted || allowedLocationUuids.includes(defaultLocation))) {
      setActiveLocation(defaultLocation);
      changeLocation(defaultLocation, true);
    }
  }, [changeLocation, isSubmitting, defaultLocation, isUpdateFlow, isRestricted, allowedLocationUuids]);

  const handleSubmit = useCallback(
    (evt: React.FormEvent<HTMLFormElement>) => {
      evt.preventDefault();

      if (!activeLocation) {
        return;
      }

      changeLocation(activeLocation, savePreference);
    },
    [activeLocation, changeLocation, savePreference],
  );

  return (
    <div className={styles.locationPickerContainer}>
      <form onSubmit={handleSubmit}>
        <div className={styles.locationCard}>
          <div className={styles.paddedContainer}>
            {hasNoLocations ? (
              <div className={styles.emptyStateContainer} role="status">
                <WarningIcon className={styles.emptyStateIcon} size={24} />
                <p className={styles.emptyStateTitle}>{t('noLoginLocations', 'No login locations configured')}</p>
                <p className={styles.emptyStateMessage}>
                  {t(
                    'noLoginLocationsMessage',
                    'This installation has no login locations configured. Please contact your system administrator.',
                  )}
                </p>
              </div>
            ) : (
              <>
                <p className={styles.welcomeTitle}>
                  {t('welcome', 'Welcome')} {currentUser}
                </p>
                <p className={styles.welcomeMessage}>
                  {t(
                    'selectYourLocation',
                    'Select your location from the list below. Use the search bar to find your location.',
                  )}
                </p>
              </>
            )}
          </div>
          {!hasNoLocations && (
            <>
              <LocationPicker
                selectedLocationUuid={activeLocation}
                defaultLocationUuid={userProperties.defaultLocation}
                locationTag={chooseLocation.useLoginLocationTag && 'Login Location'}
                restrictToLocationUuids={allowedLocationUuids}
                onChange={(locationUuid) => setActiveLocation(locationUuid)}
              />
              <div className={styles.footerContainer}>
                <Checkbox
                  className={styles.savePreferenceCheckbox}
                  checked={savePreference}
                  id={checkboxId}
                  labelText={t('rememberLocationForFutureLogins', 'Remember my location for future logins')}
                  onChange={(_, { checked }) => setSavePreference(checked)}
                />
                <Button
                  className={styles.confirmButton}
                  kind="primary"
                  type="submit"
                  disabled={!activeLocation || !isLoginEnabled || isSubmitting}
                >
                  {isSubmitting ? (
                    <InlineLoading className={styles.loader} description={t('submitting', 'Submitting')} />
                  ) : (
                    <span>{getCoreTranslation('confirm')}</span>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default LocationPickerView;
