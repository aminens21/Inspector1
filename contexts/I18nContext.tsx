
import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { appTexts } from '../appTexts';

type Language = 'ar' | 'fr';
type Direction = 'rtl' | 'ltr';
type Theme = 'light' | 'light-warm' | 'dark' | 'dark-midnight';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, ...args: any[]) => string;
  dir: Direction;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  fontSize: number;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
}

export const I18nContext = createContext<I18nContextType>({
  language: 'ar',
  setLanguage: () => {},
  t: (key) => key,
  dir: 'rtl',
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
  fontSize: 13,
  increaseFontSize: () => {},
  decreaseFontSize: () => {},
  resetFontSize: () => {},
});

const getInitialTheme = (): Theme => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme && ['light', 'light-warm', 'dark', 'dark-midnight'].includes(storedTheme)) {
      return storedTheme as Theme;
    }
    // Default to light mode
    return 'light';
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'fr' || saved === 'ar') ? saved as Language : 'ar';
  });
  
  const dir: Direction = language === 'ar' ? 'rtl' : 'ltr';
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  
  // Font Size State (Default 13px)
  const [fontSize, setFontSizeState] = useState<number>(() => {
      const saved = localStorage.getItem('appFontSize');
      return saved ? parseInt(saved, 10) : 13;
  });

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'dark-midnight') {
      document.documentElement.setAttribute('data-theme', 'dark-midnight');
    } else if (theme === 'light-warm') {
      document.documentElement.setAttribute('data-theme', 'light-warm');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme, language, dir]);

  // Apply Font Size
  useEffect(() => {
      // Limit range between 10px and 20px
      const safeSize = Math.max(10, Math.min(fontSize, 20));
      document.documentElement.style.fontSize = `${safeSize}px`;
      localStorage.setItem('appFontSize', String(safeSize));
  }, [fontSize]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  }, []);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme.startsWith('light') ? 'dark' : 'light'));
  };

  const increaseFontSize = useCallback(() => setFontSizeState(prev => Math.min(prev + 1, 20)), []);
  const decreaseFontSize = useCallback(() => setFontSizeState(prev => Math.max(prev - 1, 10)), []);
  const resetFontSize = useCallback(() => setFontSizeState(13), []);

  const t = useCallback((key: string, ...args: any[]) => {
    if (!key) return '';
    const trimmedKey = key.trim();
    const keys = trimmedKey.split('.');
    let result: any = appTexts[language];

    for (const k of keys) {
        result = result?.[k];
        if (result === undefined) {
            // Check if the key itself exists as a direct mapping (handle dynamic content with spaces)
            if (appTexts[language][trimmedKey] !== undefined) {
                result = appTexts[language][trimmedKey];
                break;
            }
            console.warn(`Text key not found: ${trimmedKey}`);
            return trimmedKey;
        }
    }
    
    if (typeof result === 'string') {
        return result.replace(/\{(\d+)\}/g, (match, index) => {
            return typeof args[index] !== 'undefined' ? args[index] : match;
        });
    }
    
    console.warn(`Text key '${key}' is not a string. Using key as fallback.`);
    return key;
  }, [language]);

  const value = useMemo((): I18nContextType => ({
    language,
    setLanguage,
    t,
    dir,
    theme,
    setTheme,
    toggleTheme,
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
  }), [language, t, dir, theme, setTheme, toggleTheme, fontSize, increaseFontSize, decreaseFontSize, resetFontSize]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};
