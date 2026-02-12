import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface StatusBadgeProps extends HTMLAttributes<HTMLDivElement> {
  status: 'completed' | 'failed' | 'running';
  icon?: ReactNode;
  children: ReactNode;
}

export const StatusBadge = forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ status, icon, className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={clsx('status-indicator', status, className)}
      {...rest}
    >
      {icon}
      <span>{children}</span>
    </div>
  ),
);

StatusBadge.displayName = 'StatusBadge';
