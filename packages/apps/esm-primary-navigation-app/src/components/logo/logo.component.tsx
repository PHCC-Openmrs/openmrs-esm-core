import React, { Suspense } from 'react';
import { interpolateUrl, useConfig } from '@openmrs/esm-framework';
import { type ConfigSchema } from '../../config-schema';
import styles from './logo.scss';

const DefaultLogo: React.FC = () => (
  <svg aria-label="OpenMRS Logo" role="img" width={104} height={34}>
    <use href="#omrs-logo-white" />
  </svg>
);

const LogoContent: React.FC = () => {
  const { logo } = useConfig<ConfigSchema>();

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('Failed to load logo image:', e);
  };

  if (logo?.src) {
    return <img alt={logo.alt} className={styles.logo} onError={handleImageError} src={interpolateUrl(logo.src)} />;
  }

  if (logo?.name) {
    return <>{logo.name}</>;
  }

  return <DefaultLogo />;
};

const Logo: React.FC = () => (
  // useConfig can suspend more than once - first for the implicit (translation-overrides-only)
  // schema, again once this module's real schema and config have both resolved - so without a
  // local boundary, this whole component would flash away to whatever fallback its parent
  // happens to provide (often nothing) between those two renders. Falling back to the same
  // default logo shown before any config is available means that second suspend never reads
  // as a flash of missing/wrong content - worst case it's one deliberate swap from the default
  // logo to the configured one once it's ready.
  <Suspense fallback={<DefaultLogo />}>
    <LogoContent />
  </Suspense>
);

export default Logo;
