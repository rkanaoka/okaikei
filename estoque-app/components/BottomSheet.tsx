import { ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="handle" />
        {title && <h3 className="title">{title}</h3>}
        <div className="content">{children}</div>
      </div>
      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(13, 27, 42, 0.45);
          display: flex;
          align-items: flex-end;
          z-index: 1000;
          animation: fade 0.15s ease-out;
        }
        .sheet {
          width: 100%;
          background: var(--color-surface);
          border-radius: 24px 24px 0 0;
          padding: 10px 20px calc(20px + env(safe-area-inset-bottom));
          max-height: 85dvh;
          overflow-y: auto;
          animation: slideUp 0.2s ease-out;
        }
        .handle {
          width: 40px;
          height: 4px;
          border-radius: 999px;
          background: var(--color-border);
          margin: 6px auto 14px;
        }
        .title {
          font-family: var(--font-display);
          font-size: 19px;
          margin: 0 0 12px;
          color: var(--color-navy);
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
