import { FormEvent, useState } from 'react';
import { useRouter } from 'next/router';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Senha incorreta.');
      }
      const next = typeof router.query.next === 'string' ? router.query.next : '/';
      router.push(next);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <div className="logo">🍜</div>
        <h1 className="brand">BODOGAMI</h1>
        <p className="subtitle">Gestão de Estoque</p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            inputMode="text"
            autoFocus
            placeholder="Senha de acesso"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="submit" disabled={loading || !password}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .page {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: radial-gradient(circle at 20% 0%, #16283d, var(--color-navy) 60%);
        }
        .card {
          width: 100%;
          max-width: 360px;
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          padding: 36px 28px;
          text-align: center;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
        }
        .logo {
          font-size: 42px;
        }
        .brand {
          font-family: var(--font-display);
          font-size: 26px;
          letter-spacing: 2px;
          color: var(--color-navy);
          margin: 8px 0 2px;
        }
        .subtitle {
          color: var(--color-text-muted);
          margin: 0 0 28px;
          font-size: 14px;
        }
        .input {
          width: 100%;
          min-height: var(--tap-min);
          border: 2px solid var(--color-border);
          border-radius: var(--radius-pill);
          padding: 0 20px;
          font-size: 16px;
          text-align: center;
          outline: none;
        }
        .input:focus {
          border-color: var(--color-orange);
        }
        .error {
          color: var(--color-red);
          font-size: 13.5px;
          margin: 10px 0 0;
        }
        .submit {
          appearance: none;
          border: none;
          width: 100%;
          min-height: var(--tap-min);
          margin-top: 18px;
          border-radius: var(--radius-pill);
          background: var(--gradient-warm);
          color: #fff;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          box-shadow: var(--shadow-pop);
        }
        .submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
