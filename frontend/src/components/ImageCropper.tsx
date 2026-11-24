// Editor de foto do prato: enquadramento (arrastar + zoom) e otimização antes do envio.
// A foto vira um quadrado OUTPUT_SIZE×OUTPUT_SIZE em WebP (JPEG se o navegador não
// gerar WebP), com qualidade reduzida em passos até caber em TARGET_BYTES. Isso evita
// mandar fotos de celular de vários MB (o nginx/backend recusam corpos > 1 MB) e deixa
// o cardápio digital leve, já que as imagens seguem junto com o cardápio para a VPS.
import { useCallback, useEffect, useRef, useState } from 'react';

const VIEW = 320;                // lado da área de enquadramento (px na tela)
const OUTPUT_SIZE = 800;         // lado da imagem final (px) — nítida até em telas 2x/3x
const TARGET_BYTES = 250 * 1024; // tamanho alvo da imagem final
const QUALITIES = [0.85, 0.78, 0.7, 0.62, 0.55];
const MAX_ZOOM = 4;

const BRAND = { navy: '#0D1B2A', orange: '#FF6B2B', red: '#E63946', green: '#2DC653' };

function fmtBytes(n: number) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

/** Bytes reais de um data URL base64. */
function dataUrlBytes(url: string) {
  const b64 = url.slice(url.indexOf(',') + 1);
  return Math.floor((b64.length * 3) / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0);
}

interface Props {
  file: File;
  onCancel: () => void;
  onConfirm: (dataUrl: string, info: { originalBytes: number; finalBytes: number }) => void;
}

export default function ImageCropper({ file, onCancel, onConfirm }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // canto superior esquerdo da foto dentro da área
  const [circleGuide, setCircleGuide] = useState(true);
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  // Carrega a imagem (o navegador já aplica a rotação EXIF das fotos de celular)
  useEffect(() => {
    setError('');
    setImg(null);
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      const s = Math.max(VIEW / image.naturalWidth, VIEW / image.naturalHeight);
      setZoom(1);
      setPos({ x: (VIEW - image.naturalWidth * s) / 2, y: (VIEW - image.naturalHeight * s) / 2 });
    };
    image.onerror = () => setError('Não foi possível abrir esta imagem. Use uma foto JPG, PNG ou WebP (fotos HEIC do iPhone: exporte como JPG).');
    image.src = url;
    return () => {
      // Desliga os handlers antes de liberar a URL: senão a carga abortada dispara onerror
      // (acontece sempre no StrictMode, que monta/desmonta o efeito em seguida)
      image.onload = null;
      image.onerror = null;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Escala "cobrir": no zoom 1 a foto preenche exatamente o quadrado
  const baseScale = img ? Math.max(VIEW / img.naturalWidth, VIEW / img.naturalHeight) : 1;
  const scale = baseScale * zoom;
  const dw = img ? img.naturalWidth * scale : VIEW;
  const dh = img ? img.naturalHeight * scale : VIEW;

  // Mantém a foto cobrindo toda a área (sem bordas vazias)
  const clamp = useCallback((x: number, y: number, w: number, h: number) => ({
    x: Math.min(0, Math.max(VIEW - w, x)),
    y: Math.min(0, Math.max(VIEW - h, y)),
  }), []);

  /** Aplica zoom mantendo fixo o ponto (cx, cy) da área — centro, cursor ou meio da pinça. */
  const zoomTo = useCallback((next: number, cx = VIEW / 2, cy = VIEW / 2) => {
    if (!img) return;
    const z = Math.min(MAX_ZOOM, Math.max(1, next));
    const s1 = baseScale * zoom;
    const s2 = baseScale * z;
    const nx = cx - (cx - pos.x) * (s2 / s1);
    const ny = cy - (cy - pos.y) * (s2 / s1);
    setZoom(z);
    setPos(clamp(nx, ny, img.naturalWidth * s2, img.naturalHeight * s2));
  }, [img, baseScale, zoom, pos, clamp]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      drag.current = null;
    } else {
      drag.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      zoomTo(pinch.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.dist),
        (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
      return;
    }
    if (!drag.current) return;
    setPos(clamp(drag.current.x + e.clientX - drag.current.px, drag.current.y + e.clientY - drag.current.py, dw, dh));
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) drag.current = null;
  }

  function onWheel(e: React.WheelEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    zoomTo(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - rect.left, e.clientY - rect.top);
  }

  // Ajuste fino pelo teclado (setas movem, +/- dão zoom)
  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 20 : 5;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) { e.preventDefault(); setPos((p) => clamp(p.x + moves[e.key][0], p.y + moves[e.key][1], dw, dh)); }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomTo(zoom * 1.1); }
    if (e.key === '-') { e.preventDefault(); zoomTo(zoom / 1.1); }
  }

  function reset() {
    if (!img) return;
    setZoom(1);
    setPos({ x: (VIEW - img.naturalWidth * baseScale) / 2, y: (VIEW - img.naturalHeight * baseScale) / 2 });
  }

  async function confirm() {
    if (!img) return;
    setBusy(true);
    // Deixa o "Otimizando..." aparecer antes do trabalho pesado no canvas
    await new Promise((r) => setTimeout(r, 30));
    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#fff'; // PNG com transparência → fundo branco no JPEG
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      // Recorte na resolução original da foto
      const sx = -pos.x / scale;
      const sy = -pos.y / scale;
      const side = VIEW / scale;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const supportsWebp = canvas.toDataURL('image/webp', 0.8).startsWith('data:image/webp');
      const type = supportsWebp ? 'image/webp' : 'image/jpeg';
      let out = '';
      for (const q of QUALITIES) {
        out = canvas.toDataURL(type, q);
        if (dataUrlBytes(out) <= TARGET_BYTES) break;
      }
      onConfirm(out, { originalBytes: file.size, finalBytes: dataUrlBytes(out) });
    } catch {
      setError('Não foi possível otimizar a imagem. Tente outra foto.');
      setBusy(false);
    }
  }

  const btn = (primary: boolean): React.CSSProperties => ({
    border: primary ? 'none' : '1.5px solid #d0d5dd', borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit', color: primary ? '#fff' : BRAND.navy,
    background: primary ? `linear-gradient(135deg,${BRAND.orange},${BRAND.red})` : 'transparent',
  });

  return (
    <div role="dialog" aria-modal="true" aria-label="Ajustar foto do produto"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: VIEW + 48, maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 900, color: BRAND.navy }}>Ajustar foto</h2>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: '#888' }}>Arraste para enquadrar e use o zoom. O círculo mostra como o prato aparece no cardápio digital.</p>

        {error ? (
          <p style={{ color: BRAND.red, fontSize: 13, margin: '12px 0' }}>{error}</p>
        ) : (
          <>
            <div
              tabIndex={0}
              aria-label="Área de enquadramento: arraste a foto, use as setas para mover e + ou − para zoom"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={onWheel}
              onKeyDown={onKeyDown}
              style={{
                position: 'relative', width: VIEW, height: VIEW, maxWidth: '100%', overflow: 'hidden', borderRadius: 12,
                background: '#f0f0f0', cursor: drag.current ? 'grabbing' : 'grab', touchAction: 'none', userSelect: 'none', outlineOffset: 3,
              }}
            >
              {img ? (
                <img
                  src={img.src}
                  alt=""
                  draggable={false}
                  style={{ position: 'absolute', left: pos.x, top: pos.y, width: dw, height: dh, maxWidth: 'none', pointerEvents: 'none' }}
                />
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 13 }}>
                  Carregando foto...
                </div>
              )}
              {/* Guia: escurece o que fica fora do círculo exibido no app (o quadrado inteiro aparece no admin) */}
              {img && circleGuide && (
                <div aria-hidden="true" style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: '50%',
                  boxShadow: '0 0 0 400px rgba(0,0,0,.45)', border: '2px solid rgba(255,255,255,.9)',
                }} />
              )}
              {img && !circleGuide && (
                <div aria-hidden="true" style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
                  backgroundSize: `${VIEW / 3}px ${VIEW / 3}px`, backgroundPosition: '-1px -1px',
                }} />
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
              <button type="button" aria-label="Diminuir zoom" onClick={() => zoomTo(zoom / 1.15)} disabled={!img || zoom <= 1}
                style={{ ...btn(false), padding: '4px 10px', fontSize: 16 }}>−</button>
              <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={zoom} disabled={!img} aria-label="Zoom"
                onChange={(e) => zoomTo(Number(e.target.value))} style={{ flex: 1, accentColor: BRAND.orange }} />
              <button type="button" aria-label="Aumentar zoom" onClick={() => zoomTo(zoom * 1.15)} disabled={!img || zoom >= MAX_ZOOM}
                style={{ ...btn(false), padding: '4px 10px', fontSize: 16 }}>+</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 12, color: '#666' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={circleGuide} onChange={(e) => setCircleGuide(e.target.checked)} />
                Mostrar guia do cardápio digital
              </label>
              <button type="button" onClick={reset} disabled={!img}
                style={{ background: 'none', border: 'none', color: BRAND.orange, fontWeight: 700, cursor: 'pointer', fontSize: 12, padding: 0 }}>
                Centralizar
              </button>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 11, color: '#aaa' }}>
              Original: {fmtBytes(file.size)}
              {img && ` · ${img.naturalWidth}×${img.naturalHeight}px`} → será salva em {OUTPUT_SIZE}×{OUTPUT_SIZE}px otimizada
            </p>
          </>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
          <button type="button" onClick={onCancel} disabled={busy} style={btn(false)}>Cancelar</button>
          {!error && (
            <button type="button" onClick={confirm} disabled={!img || busy} style={{ ...btn(true), opacity: !img || busy ? 0.6 : 1 }}>
              {busy ? 'Otimizando...' : 'Usar foto'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
