import { forwardRef, type HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface LoadingSpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'default' | 'small';
}

export const LoadingSpinner = forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ size = 'default', className, style, ...rest }, ref) => (
    <div
      ref={ref}
      className={clsx('loading-spinner', className)}
      style={
        size === 'small'
          ? { width: '16px', height: '16px', ...style }
          : style
      }
      {...rest}
    />
  ),
);

LoadingSpinner.displayName = 'LoadingSpinner';

export interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  text?: string;
}

export const LoadingState = forwardRef<HTMLDivElement, LoadingStateProps>(
  ({ text, className, children, ...rest }, ref) => (
    <div ref={ref} className={clsx('loading-state', className)} {...rest}>
      <div className="loading-spinner" />
      {text && <p>{text}</p>}
      {children}
    </div>
  ),
);

LoadingState.displayName = 'LoadingState';
