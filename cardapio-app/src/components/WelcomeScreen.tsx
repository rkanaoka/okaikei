import React, { useEffect, useRef } from 'react';
import type { MenuItem } from '../lib/types';
import { APP_MAX_WIDTH, C, FONT, PAGE_BACKGROUND, RADIUS, SHADOW } from '../theme';
import FoodImage from './FoodImage';

interface Props {
  title: string;
  subtitle: string;
  buttonLabel: string;
  /** Pratos usados nos círculos flutuantes (destaques primeiro). */
  items: MenuItem[];
  onStart: () => void;
}

// Posições dos círculos, inspiradas na tela "Welcome" da referência
const BUBBLES: Array<{ top: string; left: string; size: number; ring: number }> = [
  { top: '6%',  left: '-6%', size: 86,  ring: 18 },
  { top: '15%', left: '30%', size: 128, ring: 26 },
  { top: '7%',  left: '78%', size: 82,  ring: 18 },
  { top: '34%', left: '-4%', size: 74,  ring: 16 },
  { top: '42%', left: '33%', size: 76,  ring: 16 },
  { top: '36%', left: '76%', size: 116, ring: 24 },
];

export default function WelcomeScreen({ title, subtitle, buttonLabel, items, onStart }: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Foco só para quem navega pelo teclado — no toque, o contorno de foco poluiria a tela
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Tab' && document.activeElement === document.body) { e.preventDefault(); buttonRef.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      style={{ position: 'fixed', inset: 0, zIndex: 250, display: 'flex', justifyContent: 'center', background: C.bg }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: APP_MAX_WIDTH,
          height: '100%',
          overflow: 'hidden',
          background: PAGE_BACKGROUND,
          fontFamily: FONT,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '0 28px calc(40px + env(safe-area-inset-bottom))',
          animation: 'bdg-fade 0.3s ease-out',
        }}
      >
        <div aria-hidden="true">
          {BUBBLES.map((b, i) => {
            const item = items[i % Math.max(items.length, 1)];
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: b.top,
                  left: b.left,
                  padding: b.ring,
                  borderRadius: '50%',
                  background: '#fff',
                  boxShadow: SHADOW.card,
                  animation: `bdg-float ${4 + (i % 3)}s ease-in-out ${i * 0.3}s infinite alternate`,
                }}
              >
                <FoodImage src={item?.imageUrl} alt={item?.name ?? 'prato'} hint={[item?.description]} size={b.size} shadow={false} />
              </div>
            );
          })}
        </div>

        <div style={{ position: 'relative', textAlign: 'center' }}>
          <h1 id="welcome-title" style={{ margin: 0, fontSize: 30, fontWeight: 700, color: C.primary, lineHeight: 1.2 }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ margin: '14px auto 0', maxWidth: 300, fontSize: 15, lineHeight: 1.6, color: '#6B6B6B' }}>{subtitle}</p>
          )}
          <button
            ref={buttonRef}
            type="button"
            onClick={onStart}
            style={{
              marginTop: 34,
              width: '100%',
              maxWidth: 320,
              height: 58,
              border: 'none',
              borderRadius: RADIUS.pill,
              background: C.primary,
              color: '#fff',
              boxShadow: SHADOW.button,
              fontFamily: FONT,
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
