import { ReactNode } from 'react';
import {
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

export interface StepData {
  title: string;
  description: string;
  content: ReactNode;
}

export interface AdminSetupViewProps {
  currentStep: number;
  steps: StepData[];
  languageToggle: ReactNode;

  // Actions
  onNextStep: () => void;
  onPrevStep: () => void;
  onCancel: () => void;

  // i18n
  t: (key: string, options?: any) => string;
}

export default function AdminSetupView({
  currentStep,
  steps,
  languageToggle,
  onNextStep,
  onPrevStep,
  onCancel,
  t,
}: AdminSetupViewProps) {
  const currentStepData = steps[currentStep];

  return (
    <div className="admin-setup">
      <div className="setup-container">
        <div className="setup-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <h1>{t('adminSetup.title')}</h1>
            {languageToggle}
          </div>
          <div className="step-indicator">
            {t('adminSetup.stepOf', { current: currentStep + 1, total: steps.length })}
          </div>
        </div>

        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="setup-content">
          <div className="step-header">
            <h2>{currentStepData.title}</h2>
            <p>{currentStepData.description}</p>
          </div>

          <div className="step-content">
            {currentStepData.content}
          </div>
        </div>

        <div className="setup-actions">
          <div className="actions-left">
            {currentStep > 0 && (
              <button
                className="btn btn-secondary"
                onClick={onPrevStep}
              >
                <ArrowLeft size={16} />
                {t('adminSetup.back')}
              </button>
            )}

            <button
              className="btn btn-secondary"
              onClick={onCancel}
            >
              {t('adminSetup.cancel')}
            </button>
          </div>

          <div className="actions-right">
            {currentStep < steps.length - 1 && (
              <button
                className="btn btn-primary"
                onClick={onNextStep}
              >
                {t('adminSetup.next')}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
