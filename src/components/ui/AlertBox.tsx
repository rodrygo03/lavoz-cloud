import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface AlertBoxProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'warning' | 'success' | 'error';
  icon?: ReactNode;
  children: ReactNode;
}

const variantClassMap = {
  info: 'info-box',
  warning: 'warning-box',
  success: 'success-message',
  error: 'error-message',
} as const;

export const AlertBox = forwardRef<HTMLDivElement, AlertBoxProps>(
  ({ variant = 'info', icon, className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={clsx(variantClassMap[variant], className)}
      {...rest}
    >
      {icon}
      {children}
    </div>
  ),
);

AlertBox.displayName = 'AlertBox';
