import React, { useState } from 'react';
import { C, SHADOW, itemEmoji } from '../theme';

interface Props {
  src?: string;
  alt: string;
  size: number;
  /** Textos usados para escolher o ícone do placeholder quando não há foto. */
  hint?: Array<string | undefined>;
  shadow?: boolean;
  style?: React.CSSProperties;
}

/** Foto circular do prato; sem foto (ou se ela falhar ao carregar), mostra um placeholder pêssego com ícone. */
export default function FoodImage({ src, alt, size, hint = [], shadow = true, style }: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: shadow ? SHADOW.image : 'none',
        background: showImage
          ? '#eee'
          : `radial-gradient(circle at 30% 25%, #FFFFFF 0%, ${C.primarySoft} 55%, #FFD9CB 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span role="img" aria-label={alt} style={{ fontSize: Math.round(size * 0.42), lineHeight: 1 }}>
          {itemEmoji(alt, ...hint)}
        </span>
      )}
    </div>
  );
}
