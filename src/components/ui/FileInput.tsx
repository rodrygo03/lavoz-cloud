import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface FileInputProps extends HTMLAttributes<HTMLDivElement> {
  actions?: ReactNode;
  children: ReactNode;
}

export const FileInput = forwardRef<HTMLDivElement, FileInputProps>(
  ({ actions, className, children, ...rest }, ref) => (
    <div ref={ref} className={clsx('file-input', className)} {...rest}>
      {children}
      {actions}
    </div>
  ),
);

FileInput.displayName = 'FileInput';
