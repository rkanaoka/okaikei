import { ReactNode } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const NAV = [
  { href: '/', label: 'Início', icon: '🏠' },
  { href: '/contagem', label: 'Contagem', icon: '📋' },
  { href: '/retirada', label: 'Retirada', icon: '📤' },
];

export function Layout({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="layout">
      <header className="topbar">
        <span className="brand">Bodogami</span>
        <h1 className="title">{title}</h1>
        <button className="logout" onClick={logout} aria-label="Sair">
          ⎋
        </button>
      </header>

      <main className="content">{children}</main>

      <nav className="bottomnav">
        {NAV.map((item) => {
          const active = router.pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`navitem ${active ? 'active' : ''}`}>
              <span className="navicon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <style jsx>{`
        .layout {
          display: flex;
          flex-direction: column;
          min-height: 100dvh;
        }
        .topbar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: calc(14px + env(safe-area-inset-top)) 18px 14px;
          background: var(--color-navy);
          color: #fff;
        }
        .brand {
          font-family: var(--font-display);
          color: var(--color-yellow);
          font-size: 13px;
          letter-spacing: 1px;
          text-transform: uppercase;
          position: absolute;
          opacity: 0;
        }
        .title {
          font-family: var(--font-display);
          font-size: 20px;
          margin: 0;
          flex: 1;
        }
        .logout {
          appearance: none;
          border: none;
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          font-size: 18px;
          cursor: pointer;
        }
        .content {
          flex: 1;
          padding: 16px 16px calc(96px + env(safe-area-inset-bottom));
        }
        .bottomnav {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          background: var(--color-surface);
          border-top: 1px solid var(--color-border);
          padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
        }
        .navitem {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 6px 0;
          border-radius: 14px;
          text-decoration: none;
          color: var(--color-text-muted);
          font-size: 12px;
          font-weight: 600;
          min-height: var(--tap-min);
        }
        .navitem.active {
          color: var(--color-orange);
          background: rgba(255, 107, 43, 0.1);
        }
        .navicon {
          font-size: 22px;
        }
      `}</style>
    </div>
  );
}
