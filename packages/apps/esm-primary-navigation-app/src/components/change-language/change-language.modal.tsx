import classNames from 'classnames';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { capitalize } from 'lodash-es';
import {
  Button,
  Checkbox,
  InlineLoading,
  ModalBody,
  ModalFooter,
  ModalHeader,
  RadioButton,
  RadioButtonGroup,
} from '@carbon/react';
import { useAbortController, useSession } from '@openmrs/esm-framework';
import { updateSessionLocale, updateUserProperties } from './change-language.resource';
import styles from './change-language.scss';

interface ChangeLanguageModalProps {
  close(): void;
}

export default function ChangeLanguageModal({ close }: ChangeLanguageModalProps) {
  const { t } = useTranslation();
  const session = useSession();
  const user = session?.user;
  const [selectedLocale, setSelectedLocale] = useState(session?.locale);
  const [shouldChangeDefaultLocale, setShouldChangeDefaultLocale] = useState(true);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const ac = useAbortController();

  const handleSubmit = useCallback(() => {
    setIsChangingLanguage(true);

    if (selectedLocale && selectedLocale !== session?.locale) {
      const formattedLocale = selectedLocale.replace(/-/gi, '_');
      if (shouldChangeDefaultLocale) {
        updateUserProperties(
          user.uuid,
          {
            ...(user.userProperties ?? {}),
            defaultLocale: formattedLocale,
          },
          ac,
        );
      } else {
        updateSessionLocale(formattedLocale, ac);
      }
    }
  }, [user.userProperties, user.uuid, selectedLocale, shouldChangeDefaultLocale]);

  /**
   * The session's allowed locales can contain entries this list cannot render. OpenMRS
   * serializes any entry of the `locale.allowed.list` global property that it fails to parse
   * as `null`, and entries whose region subtag is ill-formed (`en_GBR`, `ar_Arab`) collapse
   * onto the bare language tag, so the same tag can arrive more than once. Handing either to
   * `Intl.DisplayNames` throws, which takes down the whole user menu, so keep only the tags
   * that actually resolve to a name and let the rest go.
   */
  const languageNames = useMemo(() => {
    const names = new Map<string, string>();

    for (const locale of session?.allowedLocales ?? []) {
      if (typeof locale !== 'string' || names.has(locale)) {
        continue;
      }

      try {
        names.set(locale, new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale);
      } catch (error) {
        console.warn(`Skipping unusable locale ${JSON.stringify(locale)} from the session's allowed locales`, error);
      }
    }

    return names;
  }, [session?.allowedLocales]);

  return (
    <>
      <ModalHeader closeModal={close} title={t('changeLanguage', 'Change language')} />
      <ModalBody>
        <div className={styles.languageOptionsContainer}>
          <RadioButtonGroup
            valueSelected={selectedLocale}
            orientation="vertical"
            name="Language options"
            onChange={(locale) => setSelectedLocale(locale.toString())}
          >
            {[...languageNames].map(([locale, languageName], i) => (
              <RadioButton
                className={styles.languageRadioButton}
                key={`locale-option-${locale}-${i}`}
                id={`locale-option-${locale}-${i}`}
                name={locale}
                labelText={capitalize(languageName)}
                value={locale}
              />
            ))}
          </RadioButtonGroup>
        </div>
      </ModalBody>
      <div className={classNames('cds--layer-two', styles.updateDefaultLocaleContainer)} role="region">
        <Checkbox
          id={`change-default-locale`}
          labelText={t('changeDefaultLocale', 'Save as my default language')}
          checked={shouldChangeDefaultLocale}
          onChange={(_, { checked }) => setShouldChangeDefaultLocale(checked)}
        />
        <p className={classNames(styles.updateDefaultLocaleExplainer)}>
          {t('changeDefaultLocaleExplanation', 'Leave this unchecked to change language for this session only')}
        </p>
      </div>
      <ModalFooter>
        <Button kind="secondary" onClick={close}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button
          className={styles.submitButton}
          disabled={isChangingLanguage || selectedLocale === session?.locale}
          type="submit"
          onClick={handleSubmit}
        >
          {isChangingLanguage ? (
            <InlineLoading description={t('changingLanguage', 'Changing language') + '...'} />
          ) : (
            <span>{t('change', 'Change')}</span>
          )}
        </Button>
      </ModalFooter>
    </>
  );
}
