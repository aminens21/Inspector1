
import React from 'react';
import { Inspector } from '../types';
import { useTranslations } from '../hooks/useTranslations';

interface HeaderProps {
  inspector: Inspector;
  ministryLogo: string;
  ministryLogoHeight?: number;
  onShowAboutModal: () => void;
  onNavigateToSettings: () => void;
  onToggleSidebar: () => void;
  onSyncFromPlatform?: () => void;
}

const ThemeSwitcher: React.FC = () => {
  const { theme, toggleTheme, t } = useTranslations();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 h-10 w-10 flex items-center justify-center rounded-lg bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-button-secondary-hover-bg))] transition-colors"
      aria-label={theme.startsWith('light') ? t('themeSwitcher_toDark') : t('themeSwitcher_toLight')}
    >
      {theme.startsWith('light') ? (
        <i className="fas fa-moon fa-lg"></i>
      ) : (
        <i className="fas fa-lightbulb fa-lg"></i>
      )}
    </button>
  );
};

export const Header: React.FC<HeaderProps> = ({ inspector, ministryLogo, ministryLogoHeight, onShowAboutModal, onNavigateToSettings, onToggleSidebar, onSyncFromPlatform }) => {
  const { t, language, setLanguage } = useTranslations();
  
  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'fr' : 'ar');
  };

  return (
    <header className="bg-[rgb(var(--color-card))] border-b border-[rgb(var(--color-border))] mb-8">
      <div className="container mx-auto px-4 pt-3 pb-2">
        <div className="w-full flex justify-between items-center mb-10">
          <div className="flex items-center gap-2">
            <button
              onClick={onShowAboutModal}
              className="p-2 h-10 w-10 flex items-center justify-center rounded-lg bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-button-secondary-hover-bg))] transition-colors"
              title={t('about_tooltip')}
            >
              <i className="fas fa-question-circle fa-lg"></i>
            </button>
            <button
              onClick={toggleLanguage}
              className="p-2 h-10 w-10 flex items-center justify-center rounded-lg bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-button-secondary-hover-bg))] transition-colors font-bold text-sm"
              title={language === 'ar' ? 'Français' : 'العربية'}
            >
              {language === 'ar' ? 'FR' : 'AR'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {onSyncFromPlatform && (
                <button
                  onClick={onSyncFromPlatform}
                  className="p-2 h-10 w-10 flex items-center justify-center rounded-lg bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-button-secondary-hover-bg))] transition-colors"
                  title="مزامنة الأساتذة من المنصة"
                >
                  <i className="fas fa-sync-alt fa-lg"></i>
                </button>
            )}
            <button
              onClick={onNavigateToSettings}
              className="p-2 h-10 w-10 flex items-center justify-center rounded-lg bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-button-secondary-hover-bg))] transition-colors"
              title={t('home_settingsCardTitle')}
            >
              <i className="fas fa-cogs fa-lg"></i>
            </button>
            <button
              onClick={onToggleSidebar}
              className="p-2 h-10 w-10 flex items-center justify-center rounded-lg bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-button-secondary-hover-bg))] transition-colors"
              title="القائمة الجانبية"
            >
              <i className="fas fa-bars fa-lg"></i>
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="flex-shrink-0">
            <img 
              src={ministryLogo} 
              alt={t('ministryLogoAlt')} 
              style={ministryLogoHeight ? { height: `${ministryLogoHeight}px` } : {}}
              className="mb-2"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
