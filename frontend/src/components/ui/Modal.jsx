import { useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-forest/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative w-full ${sizes[size]} rounded-2xl bg-cream shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-forest/10 px-6 py-4">
          <h2 id="modal-title" className="text-xl font-bold text-forest">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="touch-target flex items-center justify-center rounded-xl p-2 text-forest hover:bg-forest/10 transition-all duration-200"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        <div className="px-6 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-forest/10 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ModalActions({ onCancel, onConfirm, confirmLabel = 'Confirm', cancelLabel = 'Cancel', isLoading = false }) {
  return (
    <>
      <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
        {cancelLabel}
      </Button>
      <Button variant="accent" onClick={onConfirm} disabled={isLoading}>
        {confirmLabel}
      </Button>
    </>
  );
}
