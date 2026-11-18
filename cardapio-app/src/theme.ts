// Design tokens do cardápio — baseados na referência "Restaurant Menu UI" (Figma):
// coral como cor de ação, fundo claro com brilho pêssego no topo, cards brancos
// arredondados, fotos circulares com sombra suave e tipografia Poppins.
import type React from 'react';

export const C = {
  primary: '#FF7247',
  primaryDark: '#F25A2C',
  primarySoft: '#FFEDE6',
  bg: '#F7F7F7',
  surface: '#FFFFFF',
  text: '#1F1F1F',
  textMuted: '#8C8C8C',
  border: '#EFEFEF',
  star: '#FFB800',
  success: '#22A45D',
  danger: '#E5484D',
};

export const FONT = "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export const SHADOW = {
  card: '0 6px 20px rgba(31,31,31,0.06)',
  image: '0 10px 24px rgba(255,114,71,0.22)',
  button: '0 8px 20px rgba(255,114,71,0.35)',
  floating: '0 -6px 24px rgba(31,31,31,0.08)',
};

export const RADIUS = { sm: 10, md: 16, lg: 22, pill: 999 };

/** Largura máxima do app — em telas maiores ele fica centralizado como um celular. */
export const APP_MAX_WIDTH = 480;

/** Brilho pêssego no canto superior direito, presente em todas as telas da referência. */
export const PAGE_BACKGROUND = `radial-gradient(120% 60% at 100% 0%, rgba(255,114,71,0.16) 0%, rgba(255,114,71,0) 60%), ${C.bg}`;

export function formatPrice(value: number): string {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const iconButton: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 12,
  background: C.surface,
  border: 'none',
  boxShadow: SHADOW.card,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: C.text,
  cursor: 'pointer',
  flexShrink: 0,
  position: 'relative',
};

// Os itens ainda não têm foto cadastrada — o placeholder usa um ícone escolhido
// pelo nome/categoria. Dentro de um mesmo texto, a primeira regra que casar vence.
const EMOJI_RULES: Array<[RegExp, string]> = [
  [/couvert|\bjogo|\bjogar|l[uú]dico/i, '🎲'],
  [/cerveja|\bchopp?\b|\bipa\b|\blager\b/i, '🍺'],
  [/vinho|\bdrinks?\b|caipi|\bgin\b|whisky|vodka|coquetel|saqu[eê]/i, '🍸'],
  [/\bsucos?\b|refri|[aá]gua|\bsoda\b|\bch[aá]\b|bebida|\blata\b|coca|guaran[aá]/i, '🥤'],
  [/caf[eé]|cappuccino|espresso/i, '☕'],
  [/sorvete|sobremesa|\bdoces?\b|brownie|pudim|torta|mochi|\bbolo/i, '🍰'],
  [/sushi|sashimi|temaki|uramaki|niguiri|hossomaki|combinado/i, '🍣'],
  [/l[aá]men|ramen|tantanmen|udon|\bsoba\b|yakisoba|macarr[aã]o|noodle/i, '🍜'],
  [/missoshiro|\bsopa\b|caldo/i, '🍲'],
  [/omurice|\bovos?\b|omelete/i, '🍳'],
  [/kar[eê]|curry|donburi|domburi|butadon|\bdon\b|gohan|\barroz\b/i, '🍛'],
  [/gyoza|guioza|dumpling|harumaki|rolinho/i, '🥟'],
  [/corn ?dog|hot ?dog|salsicha/i, '🌭'],
  [/kimchi|acelga|conserva|tsukemono/i, '🥬'],
  [/tapioca|queijo/i, '🧀'],
  [/frango|karaage|chicken/i, '🍗'],
  [/\bcarne|bovin|burger|hamb[uú]rguer/i, '🍔'],
  [/peixe|salm[aã]o|atum|camar[aã]o/i, '🐟'],
  [/batata|fritas|petisco|por[cç][aã]o/i, '🍟'],
  [/veggie|vegan|berinjela|legume|salada|tofu|gr[aã]o de bico/i, '🥗'],
  [/entradas?/i, '🥟'],
  [/pratos?/i, '🍛'],
];

/**
 * Ícone do placeholder. Os textos são testados na ordem recebida (nome, depois
 * categoria, depois descrição), então o nome do prato tem prioridade.
 */
export function itemEmoji(...texts: Array<string | undefined>): string {
  for (const text of texts) {
    if (!text) continue;
    for (const [re, emoji] of EMOJI_RULES) if (re.test(text)) return emoji;
  }
  return '🍽️';
}
