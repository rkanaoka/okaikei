import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';

type ToastKind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.message}
          </div>
        ))}
      </div>
      <style jsx>{`
        .toast-stack {
          position: fixed;
          left: 16px;
          right: 16px;
          bottom: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 9999;
          pointer-events: none;
        }
        .toast {
          padding: 14px 18px;
          border-radius: 14px;
          color: #fff;
          font-weight: 600;
          font-size: 14.5px;
          box-shadow: var(--shadow-card);
          animation: rise 0.18s ease-out;
        }
        .toast-success {
          background: var(--color-green);
        }
        .toast-error {
          background: var(--color-red);
        }
        .toast-info {
          background: var(--color-navy);
        }
        @keyframes rise {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
