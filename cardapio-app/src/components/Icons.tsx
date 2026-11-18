// Ícones em SVG inline (traço arredondado, como na referência) — sem dependência externa.
import React from 'react';

type IconProps = { size?: number; color?: string; strokeWidth?: number; filled?: boolean };

function Svg({ size = 22, color = 'currentColor', strokeWidth = 1.8, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IconBack = (p: IconProps) => (
  <Svg {...p}><path d="M15 18l-6-6 6-6" /></Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}><path d="M18 6L6 18M6 6l12 12" /></Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Svg>
);

export const IconPlus = (p: IconProps) => (
  <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
);

export const IconMinus = (p: IconProps) => (
  <Svg {...p}><path d="M5 12h14" /></Svg>
);

export const IconHome = ({ filled, ...p }: IconProps) => (
  <Svg {...p}>
    <path d="M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" fill={filled ? (p.color ?? 'currentColor') : 'none'} />
  </Svg>
);

export const IconCart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 4h2.2l2.1 10.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.2" />
    <circle cx="9.5" cy="19.5" r="1.3" />
    <circle cx="17" cy="19.5" r="1.3" />
  </Svg>
);

export const IconBag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 8h14l-1 12H6z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    <path d="M9.5 12.5a2.5 2.5 0 0 0 5 0" />
  </Svg>
);

export const IconReceipt = ({ filled, ...p }: IconProps) => (
  <Svg {...p}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" fill={filled ? (p.color ?? 'currentColor') : 'none'} />
    <path d="M9 8h6M9 12h6" stroke={filled ? '#fff' : (p.color ?? 'currentColor')} />
  </Svg>
);

export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Svg>
);

export const IconTable = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 9h18M5 9v10M19 9v10M8 9l1-4h6l1 4" />
  </Svg>
);

export const IconRefresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4" />
  </Svg>
);

export const IconHeart = ({ filled, ...p }: IconProps) => (
  <Svg {...p}>
    <path
      d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"
      fill={filled ? (p.color ?? 'currentColor') : 'none'}
    />
  </Svg>
);

export const IconStar = ({ size = 14, color = '#FFB800' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill={color} d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" />
  </svg>
);
