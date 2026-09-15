import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, SwitcherItem } from '@carbon/react';
import { capitalize } from 'lodash-es';
import { TranslateIcon, showModal, useSession } from '@openmrs/esm-framework';
import styles from './change-language-link.scss';

/** The user menu item that shows the current language and has a button to change the language */
function ChangeLanguageLink() {
  const { t } = useTranslation();
  const session = useSession();

  const launchChangeLanguageModal = useCallback(() => {
    const dispose = showModal('change-language-modal', {
      closeModal: () => dispose(),
      size: 'sm',
    });
  }, []);

  // `Intl.DisplayNames` throws on a locale it can't parse, and this item renders inside the
  // user menu, so an unusable `session.locale` would take the whole menu down. Fall back to
  // showing the raw locale instead. See the note in `change-language.modal.tsx`.
  const languageName = useMemo(() => {
    const locale = session?.locale ?? 'en';

    try {
      return new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale;
    } catch (error) {
      console.warn(`Could not resolve a display name for locale ${JSON.stringify(locale)}`, error);
      return locale;
    }
  }, [session?.locale]);

  return (
    <SwitcherItem className={styles.panelItemContainer} aria-label={t('changeLanguage', 'Change language')}>
      <div>
        <TranslateIcon size={20} />
        <p>{capitalize(languageName)}</p>
      </div>
      <Button kind="ghost" onClick={launchChangeLanguageModal}>
        {t('change', 'Change')}
      </Button>
    </SwitcherItem>
  );
}

export default ChangeLanguageLink;
