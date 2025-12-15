'use client';

import { useEffect, useRef } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary'
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDanger = confirmVariant === 'danger';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 dialog-overlay" 
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="relative bg-[var(--paper-white)] rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in"
        tabIndex={-1}
      >
        {/* Top accent bar */}
        <div className={`h-1 ${isDanger ? 'bg-gradient-to-r from-red-500 to-orange-500' : ''}`} style={!isDanger ? { background: 'var(--accent-primary-gradient)' } : {}} />
        
        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-[var(--ink-300)] hover:text-[var(--ink-600)] hover:bg-[var(--ink-50)] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4">
            {isDanger && (
              <div className="p-3 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border border-red-100">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
            )}
            <div className="flex-1 pt-1">
              <h2 id="dialog-title" className="text-xl font-bold text-[var(--ink-900)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                {title}
              </h2>
              <p className="text-[var(--ink-500)] leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${
                isDanger 
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5' 
                  : 'btn-primary'
              }`}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
