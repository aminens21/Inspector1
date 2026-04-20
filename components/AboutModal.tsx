import React from 'react';
import { Modal } from './ui/Modal';
import { useTranslations } from '../hooks/useTranslations';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const { t, dir } = useTranslations();

  const renderStep = (num: number, hasSubsteps = false) => {
    const titleKey = `aboutModal_step${num}_title`;
    const descKeyA = hasSubsteps ? `aboutModal_step${num}_desc_A` : `aboutModal_step${num}_desc`;
    const descKeyB = hasSubsteps ? `aboutModal_step${num}_desc_B` : '';

    return (
       <li className="mb-3">
        <strong className="font-semibold text-[rgb(var(--color-text-base))]">{t(titleKey)}</strong>
        <p className="text-[rgb(var(--color-text-muted))] mt-1">{t(descKeyA)}</p>
        {hasSubsteps && descKeyB && <p className="text-[rgb(var(--color-text-muted))] mt-1">{t(descKeyB)}</p>}
      </li>
    );
  }

  const renderFeature = (num: number) => (
    <div className="mb-3">
      <h3 className="font-semibold text-lg text-[rgb(var(--color-text-base))]">{t(`aboutModal_feature${num}_title`)}</h3>
      <p className="text-[rgb(var(--color-text-muted))]">{t(`aboutModal_feature${num}_desc`)}</p>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('aboutModal_title')} size="4xl">
      <div className="space-y-6 text-[rgb(var(--color-text-base))]" dir={dir}>
        
        <div>
          <h2 className="text-2xl font-bold border-b border-[rgb(var(--color-border))] pb-2 mb-3 text-sky-600">{t('aboutModal_philosophyTitle')}</h2>
          <p className="text-md">{t('aboutModal_philosophy_p1')}</p>
          <p className="text-md text-[rgb(var(--color-text-muted))] mt-2">{t('aboutModal_philosophy_p2')}</p>
        </div>
        
        <div>
          <h2 className="text-2xl font-bold border-b border-[rgb(var(--color-border))] pb-2 mb-3 text-sky-600">{t('aboutModal_featuresTitle')}</h2>
          <div className="space-y-4">
            {renderFeature(1)}
            {renderFeature(2)}
            {renderFeature(3)}
            {renderFeature(4)}
            {renderFeature(5)}
          </div>
        </div>
        
        <div>
            <h2 className="text-2xl font-bold border-b border-[rgb(var(--color-border))] pb-2 mb-3 text-sky-600">{t('aboutModal_howToUseTitle')}</h2>
            <ol className="list-decimal list-inside space-y-2">
                {renderStep(1)}
                {renderStep(2)}
                {renderStep(3, true)}
                {renderStep(4)}
            </ol>
        </div>

        <p className="text-center font-semibold pt-4 border-t border-[rgb(var(--color-border))]">{t('aboutModal_closing')}</p>
      </div>
    </Modal>
  );
};