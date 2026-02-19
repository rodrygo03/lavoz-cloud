import React from 'react';
import { useTranslation } from 'react-i18next';
import { FormGroup } from './ui';

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <FormGroup label={t('settings.language')} htmlFor="language-select">
      <select
        id="language-select"
        value={i18n.language}
        onChange={handleLanguageChange}
        className="language-select"
      >
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
    </FormGroup>
  );
};

export default LanguageSwitcher;
