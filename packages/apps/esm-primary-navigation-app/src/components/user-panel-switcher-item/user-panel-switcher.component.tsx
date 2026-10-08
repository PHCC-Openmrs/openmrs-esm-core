import React from 'react';
import { useTranslation } from 'react-i18next';
import { SwitcherItem } from '@carbon/react';
import { UserAvatarIcon, useSession } from '@openmrs/esm-framework';

const UserPanelSwitcher: React.FC = () => {
  const { t } = useTranslation();
  const session = useSession();
  return (
    <SwitcherItem aria-label={t('user', 'User')}>
      <UserAvatarIcon size={20} />
      <p>{session?.user?.person?.display}</p>
    </SwitcherItem>
  );
};

export default UserPanelSwitcher;
