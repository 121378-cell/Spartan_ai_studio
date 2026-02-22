import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageSelector: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  // Get current language (handling region codes like en-US)
  const currentLang = i18n.language?.split('-')[0] || 'en';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Globe className="w-4 h-4 text-gray-500" />
      <select
        value={currentLang}
        onChange={(e) => changeLanguage(e.target.value)}
        className="bg-transparent text-sm font-medium text-gray-700 border-none focus:ring-0 cursor-pointer"
        aria-label={t('language.select')}
      >
        <option value="en">{t('language.en')}</option>
        <option value="es">{t('language.es')}</option>
      </select>
    </div>
  );
};
