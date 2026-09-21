import { InputHTMLAttributes, forwardRef } from 'react';

interface SearchFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  scannerActive?: boolean;
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { scannerActive, className, ...rest },
  ref,
) {
  return (
    <div className={`wrap ${scannerActive ? 'scanning' : ''}`}>
      <span className="icon">{scannerActive ? '📡' : '🔍'}</span>
      <input ref={ref} className={`field ${className ?? ''}`} {...rest} />
      <style jsx>{`
        .wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--color-surface);
          border: 2px solid var(--color-border);
          border-radius: var(--radius-pill);
          padding: 0 18px;
          min-height: var(--tap-min);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .wrap.scanning {
          border-color: var(--color-orange);
          box-shadow: 0 0 0 4px rgba(255, 107, 43, 0.15);
        }
        .icon {
          font-size: 18px;
          line-height: 1;
        }
        .field {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 16px;
          min-height: var(--tap-min);
          color: var(--color-text);
        }
        .field::placeholder {
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
});
