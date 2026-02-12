import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'default' | 'large' | 'small';
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'default', className, children, ...rest }, ref) => (
    <button
      ref={ref}
      className={clsx(
        'btn',
        variant === 'primary' && 'btn-primary',
        variant === 'secondary' && 'btn-secondary',
        variant === 'danger' && 'btn-danger',
        size === 'large' && 'btn-large',
        size === 'small' && 'btn-small',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  ),
);

Button.displayName = 'Button';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** "btn-icon" (compact, no border) or "icon-button" (sidebar-style) */
  as?: 'btn-icon' | 'icon-button';
  variant?: 'default' | 'danger';
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ as = 'btn-icon', variant = 'default', className, children, ...rest }, ref) => (
    <button
      ref={ref}
      className={clsx(
        as,
        variant === 'danger' && 'danger',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  ),
);

IconButton.displayName = 'IconButton';
