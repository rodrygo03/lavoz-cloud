import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title?: string;
  description?: string;
  size?: 'default' | 'small';
  children?: ReactNode;
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, size = 'default', className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={clsx(
        size === 'small' ? 'empty-state-small' : 'empty-state',
        className,
      )}
      {...rest}
    >
      {icon}
      {title && (size === 'small' ? <p>{title}</p> : <h2>{title}</h2>)}
      {description && <p>{description}</p>}
      {children}
    </div>
  ),
);

EmptyState.displayName = 'EmptyState';
