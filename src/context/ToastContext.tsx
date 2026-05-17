import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { ToastContext, type Toast, type ToastType } from './toast';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(currentToasts => [...currentToasts, { id, message, type }]);
    window.setTimeout(() => removeToast(id), 3500);
  }, [removeToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-label="Notifications">
        {toasts.map(toast => {
          const Icon = toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? XCircle : Info;

          return (
            <div className={`toast toast-${toast.type}`} key={toast.id}>
              <Icon size={18} />
              <span>{toast.message}</span>
              <button className="toast-close" onClick={() => removeToast(toast.id)} aria-label="Dismiss notification">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
