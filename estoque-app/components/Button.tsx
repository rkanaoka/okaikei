import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  fullWidth?: boolean;
}

export function Button({ variant = 'primary', fullWidth, className, children, ...rest }: ButtonProps) {
  return (
    <button className={`btn btn-${variant} ${fullWidth ? 'full' : ''} ${className ?? ''}`} {...rest}>
      {children}
      <style jsx>{`
        .btn {
          appearance: none;
          border: none;
          cursor: pointer;
          min-height: var(--tap-min);
          padding: 0 24px;
          border-radius: var(--radius-pill);
          font-weight: 700;
          font-size: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.08s ease, filter 0.15s ease, opacity 0.15s ease;
        }
        .btn:active {
          transform: scale(0.97);
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        .full {
          width: 100%;
        }
        .btn-primary {
          background: var(--gradient-warm);
          color: #fff;
          box-shadow: var(--shadow-pop);
        }
        .btn-secondary {
          background: var(--color-navy);
          color: #fff;
        }
        .btn-ghost {
          background: var(--color-surface);
          color: var(--color-navy);
          border: 1.5px solid var(--color-border);
        }
        .btn-danger {
          background: var(--color-red);
          color: #fff;
        }
      `}</style>
    </button>
  );
}
