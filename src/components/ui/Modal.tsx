import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ open, onClose, className, children, ...rest }, ref) => {
    if (!open) return null;
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div
          ref={ref}
          className={clsx('modal', className)}
          onClick={(e) => e.stopPropagation()}
          {...rest}
        >
          {children}
        </div>
      </div>
    );
  },
);

Modal.displayName = 'Modal';

export interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  onClose?: () => void;
  children?: ReactNode;
}

export const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ title, onClose, className, children, ...rest }, ref) => (
    <div ref={ref} className={clsx('modal-header', className)} {...rest}>
      {children ?? (
        <>
          <h3>{title}</h3>
          {onClose && (
            <button className="modal-close" onClick={onClose}>
              &times;
            </button>
          )}
        </>
      )}
    </div>
  ),
);

ModalHeader.displayName = 'ModalHeader';

export interface ModalContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const ModalContent = forwardRef<HTMLDivElement, ModalContentProps>(
  ({ className, children, ...rest }, ref) => (
    <div ref={ref} className={clsx('modal-content', className)} {...rest}>
      {children}
    </div>
  ),
);

ModalContent.displayName = 'ModalContent';

export interface ModalActionsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const ModalActions = forwardRef<HTMLDivElement, ModalActionsProps>(
  ({ className, children, ...rest }, ref) => (
    <div ref={ref} className={clsx('modal-actions', className)} {...rest}>
      {children}
    </div>
  ),
);

ModalActions.displayName = 'ModalActions';
