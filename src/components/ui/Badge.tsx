import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, children, ...rest }, ref) => (
    <span ref={ref} className={clsx('admin-badge', className)} {...rest}>
      {children}
    </span>
  ),
);

Badge.displayName = 'Badge';
