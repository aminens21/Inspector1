import { useContext } from 'react';
import { I18nContext } from '../contexts/I18nContext';

export const useTranslations = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslations must be used within an I18nProvider');
  }
  return context;
};