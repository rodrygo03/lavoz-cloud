import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  fullWidth?: boolean;
  children: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ fullWidth, className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={clsx('card', fullWidth && 'full-width', className)}
      {...rest}
    >
      {children}
    </div>
  ),
);

Card.displayName = 'Card';

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  action?: ReactNode;
  children?: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, action, className, children, ...rest }, ref) => (
    <div ref={ref} className={clsx('card-header', className)} {...rest}>
      {children ?? (
        <>
          <h3>{title}</h3>
          {action}
        </>
      )}
    </div>
  ),
);

CardHeader.displayName = 'CardHeader';

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...rest }, ref) => (
    <div ref={ref} className={clsx('card-content', className)} {...rest}>
      {children}
    </div>
  ),
);

CardContent.displayName = 'CardContent';
