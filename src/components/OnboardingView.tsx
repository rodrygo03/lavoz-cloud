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

export interface OnboardingViewProps {
  currentStep: number;
  steps: StepData[];
  isValidating: boolean;
  creating: boolean;
  languageToggle: ReactNode;

  // Actions
  onNextStep: () => void;
  onPrevStep: () => void;
  onCreateProfile: () => void;

  // i18n
  t: (key: string, options?: any) => string;
}

export default function OnboardingView({
  currentStep,
  steps,
  isValidating,
  creating,
  languageToggle,
  onNextStep,
  onPrevStep,
  onCreateProfile,
  t,
}: OnboardingViewProps) {
  const currentStepData = steps[currentStep];

  if (!currentStepData) {
    return (
      <div className="onboarding">
        <div className="onboarding-container">
          <div className="error">Step data not found for step {currentStep}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding">
      <div className="onboarding-container">
        <div className="onboarding-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <h1>{t('onboarding.title')}</h1>
            {languageToggle}
          </div>
          <div className="step-indicator">
            {t('onboarding.stepOf', { current: currentStep + 1, total: steps.length })}
          </div>
        </div>

        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="onboarding-content">
          <div className="step-header">
            <h2>{currentStepData.title}</h2>
            <p>{currentStepData.description}</p>
          </div>

          <div className="step-content">
            {currentStepData.content}
          </div>
        </div>

        <div className="onboarding-actions">
          <div className="actions-left">
            {currentStep > 0 && (
              <button
                className="btn btn-secondary"
                onClick={onPrevStep}
              >
                <ArrowLeft size={16} />
                {t('common.back')}
              </button>
            )}
          </div>

          <div className="actions-right">
            {currentStep < steps.length - 1 ? (
              <button
                className="btn btn-primary"
                onClick={onNextStep}
                disabled={isValidating}
              >
                {isValidating ? t('onboarding.validating') : t('common.next')}
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={onCreateProfile}
                disabled={creating}
              >
                {creating ? t('onboarding.creating') : t('onboarding.createProfile')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
