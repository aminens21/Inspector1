
import React, { useState, useEffect } from 'react';
import { useTranslations } from '../hooks/useTranslations';
import { motion } from 'motion/react';

interface LoginScreenProps {
  onGoogleLogin: () => void;
  ministryLogo: string;
  ministryLogoHeight?: number;
  onShowAbout: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onGoogleLogin, ministryLogo, ministryLogoHeight, onShowAbout }) => {
  const { t, theme, toggleTheme, language, setLanguage } = useTranslations();
  
  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'fr' : 'ar');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[rgb(var(--color-background))] p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative bg-[rgb(var(--color-card))] p-10 md:p-14 rounded-3xl shadow-2xl w-full max-w-lg border border-[rgb(var(--color-border))] flex flex-col justify-center min-h-[500px]"
      >
        
        {/* Action Buttons: Inside Card, Top Left, Vertical */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
            <button
              onClick={toggleTheme}
              className="p-2 h-9 w-9 flex items-center justify-center rounded-lg bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-button-secondary-hover-bg))] transition-colors shadow-sm border border-[rgb(var(--color-border))]"
              aria-label={theme.startsWith('light') ? t('themeSwitcher_toDark') : t('themeSwitcher_toLight')}
            >
              {theme.startsWith('light') ? (
                <i className="fas fa-moon"></i>
              ) : (
                <i className="fas fa-lightbulb"></i>
              )}
            </button>

            <button
              onClick={toggleLanguage}
              className="p-2 h-9 w-9 flex items-center justify-center rounded-lg bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-button-secondary-hover-bg))] transition-colors shadow-sm border border-[rgb(var(--color-border))] font-bold text-[10px]"
              title={language === 'ar' ? 'Français' : 'العربية'}
            >
              {language === 'ar' ? 'FR' : 'AR'}
            </button>

            <button
                onClick={onShowAbout}
                className="p-2 h-9 w-9 flex items-center justify-center rounded-lg bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-button-secondary-hover-bg))] transition-colors shadow-sm border border-[rgb(var(--color-border))]"
                title={t('about_tooltip')}
              >
                <i className="fas fa-question-circle"></i>
            </button>
        </div>

        <div className="text-center mb-10">
           <img 
            src={ministryLogo} 
            alt={t('ministryLogoAlt')} 
            style={ministryLogoHeight ? { height: `${ministryLogoHeight}px` } : {}}
            className="mx-auto mb-6" 
            referrerPolicy="no-referrer"
          />
           <h1 className="text-3xl font-bold text-[rgb(var(--color-text-base))] mb-2">{t('appTitle')}</h1>
           <p className="text-[rgb(var(--color-text-muted))] text-base mb-10">{t('login_subTitle')}</p>
           
           {/* New Large Icon with animation and shadow */}
           <div className="flex justify-center mb-10">
              <div className="relative flex flex-col items-center">
                <motion.div 
                  initial={{ y: 0 }}
                  animate={{ y: [0, 25, 0] }}
                  transition={{ 
                    duration: 1.2, 
                    ease: "easeInOut", 
                    times: [0, 0.5, 1],
                    delay: 0.8 
                  }}
                  className="z-10 w-24 h-24 bg-sky-100 dark:bg-sky-900/40 rounded-full flex items-center justify-center text-sky-600 dark:text-sky-400 border-4 border-sky-50 dark:border-sky-800 shadow-inner"
                >
                  <i className="fas fa-graduation-cap text-5xl"></i>
                </motion.div>
                
                {/* Dynamic Shadow */}
                <motion.div
                  initial={{ scale: 1, opacity: 0.15 }}
                  animate={{ 
                    scale: [1, 0.6, 1],
                    opacity: [0.15, 0.4, 0.15]
                  }}
                  transition={{ 
                    duration: 1.2, 
                    ease: "easeInOut", 
                    times: [0, 0.5, 1],
                    delay: 0.8 
                  }}
                  className="absolute -bottom-2 w-16 h-2 bg-black/20 dark:bg-white/10 rounded-[100%] blur-sm"
                />
              </div>
           </div>
        </div>

            <div className="space-y-4">
                <button
                    type="button"
                    onClick={onGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 bg-[rgb(var(--color-button-primary-bg))] hover:bg-[rgb(var(--color-button-primary-hover-bg))] text-[rgb(var(--color-button-primary-text))] font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" referrerPolicy="no-referrer" />
                    <span className="text-lg">{t('login_with_google')}</span>
                </button>

                <p className="text-center text-xs text-[rgb(var(--color-text-muted))] px-4 leading-relaxed">
                    {t('login_firstTimeNote')}
                </p>

            </div>
      </motion.div>
    </div>
  );
};
