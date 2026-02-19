import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface FormGroupProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  htmlFor?: string;
  error?: string;
  helpText?: string;
  children: ReactNode;
}

export const FormGroup = forwardRef<HTMLDivElement, FormGroupProps>(
  ({ label, htmlFor, error, helpText, className, children, ...rest }, ref) => (
    <div ref={ref} className={clsx('form-group', className)} {...rest}>
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {error && <div className="error-message">{error}</div>}
      {helpText && <div className="help-text">{helpText}</div>}
    </div>
  ),
);

FormGroup.displayName = 'FormGroup';

export interface FormRowProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const FormRow = forwardRef<HTMLDivElement, FormRowProps>(
  ({ className, children, ...rest }, ref) => (
    <div ref={ref} className={clsx('form-row', className)} {...rest}>
      {children}
    </div>
  ),
);

FormRow.displayName = 'FormRow';
