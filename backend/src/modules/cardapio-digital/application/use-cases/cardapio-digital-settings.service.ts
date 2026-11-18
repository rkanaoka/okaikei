import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { uuidv7 } from 'uuidv7';

// Configurações da vitrine do cardápio digital (cardapio-app), editadas em
// Admin > Cardápio > Cardápio digital. Ficam numa única chave de SystemConfig
// e seguem para o app junto com GET /cardapio/menu (cacheado pela VPS).

const CONFIG_KEY = 'cardapio_digital';

export interface DigitalMenuOffer {
  id:          string;
  active:      boolean;
  highlight:   string;          // texto grande do banner, ex.: "30%"
  title:       string;          // ex.: "de desconto"
  subtitle:    string;          // ex.: "no Shoyu Lamen"
  menuItemId:  string | null;   // item aberto ao tocar no banner
  color:       string;          // cor de fundo (#RRGGBB)
}

export interface DigitalMenuSettings {
  welcome:   { enabled: boolean; title: string; subtitle: string; buttonLabel: string };
  offers:    { enabled: boolean; title: string; items: DigitalMenuOffer[] };
  popular:   { enabled: boolean; title: string; mode: 'auto' | 'manual'; menuItemIds: string[]; limit: number; days: number };
  ratings:   { enabled: boolean; items: Record<string, { rating: number; reviews: number }> };
  favorites: { enabled: boolean };
  /** true enquanto nada foi salvo — o admin mostra o aviso de "dados de exemplo". */
  isSample:  boolean;
  updatedAt: string | null;
}

type MenuItemLite = { id: string; name: string; sortOrder: number };

const HEX = /^#[0-9a-fA-F]{6}$/;
const MAX_OFFERS = 6;

/** Corta textos de exemplo no limite aceito pela validação (com reticências). */
function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Nota fictícia estável por item (4,3–4,9) — só para os dados de exemplo. */
function sampleRating(id: string): { rating: number; reviews: number } {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { rating: Math.round((4.3 + (h % 7) / 10) * 10) / 10, reviews: 15 + (h % 180) };
}

@Injectable()
export class CardapioDigitalSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Dados temporários usados até o primeiro salvamento no admin. */
  private buildSample(items: MenuItemLite[]): DigitalMenuSettings {
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    const [first, second] = sorted;
    return {
      welcome: {
        enabled: true,
        title: 'Bem-vindo ao Bodogami! 👋',
        subtitle: 'Escolha seus pratos e faça o pedido direto da sua mesa.',
        buttonLabel: 'Ver cardápio',
      },
      offers: {
        enabled: false, // exemplo: só vai ao ar depois de revisado no admin
        title: 'Ofertas especiais',
        items: [
          first && {
            id: uuidv7(), active: true, highlight: '10%', title: 'de desconto',
            subtitle: clip(`no ${first.name}`, 40), menuItemId: first.id, color: '#FF7247',
          },
          second && {
            id: uuidv7(), active: true, highlight: 'Novo', title: 'no cardápio',
            subtitle: clip(second.name, 40), menuItemId: second.id, color: '#1F1F1F',
          },
        ].filter(Boolean) as DigitalMenuOffer[],
      },
      popular: { enabled: true, title: 'Mais pedidos', mode: 'auto', menuItemIds: [], limit: 6, days: 30 },
      ratings: {
        enabled: false, // notas de exemplo não devem aparecer para clientes reais
        items: Object.fromEntries(sorted.map((i) => [i.id, sampleRating(i.id)])),
      },
      favorites: { enabled: true },
      isSample: true,
      updatedAt: null,
    };
  }

  private async menuItems(): Promise<MenuItemLite[]> {
    return this.prisma.menuItem.findMany({ select: { id: true, name: true, sortOrder: true } });
  }

  async get(): Promise<DigitalMenuSettings> {
    const row = await this.prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } });
    const sample = this.buildSample(await this.menuItems());
    if (!row) return sample;
    // Mescla com o exemplo para tolerar configurações salvas antes de um campo novo existir
    const saved = row.value as Partial<DigitalMenuSettings>;
    return {
      welcome:   { ...sample.welcome, ...saved.welcome },
      offers:    { ...sample.offers, ...saved.offers },
      popular:   { ...sample.popular, ...saved.popular },
      ratings:   { ...sample.ratings, ...saved.ratings },
      favorites: { ...sample.favorites, ...saved.favorites },
      isSample:  false,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** Dados para a tela do admin: configurações + itens para os seletores + prévia dos mais vendidos. */
  async getForAdmin() {
    const [settings, items] = await Promise.all([
      this.get(),
      this.prisma.menuItem.findMany({
        select: { id: true, name: true, price: true, available: true, sortOrder: true, menuCategory: { select: { name: true } } },
        orderBy: [{ menuCategory: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      }),
    ]);
    const topSellers = await this.topSellers(settings.popular.days, 20);
    return {
      settings,
      items: items.map((i) => ({
        id: i.id, name: i.name, price: Number(i.price), available: i.available, category: i.menuCategory?.name ?? null,
      })),
      topSellers,
    };
  }

  async save(dto: Partial<DigitalMenuSettings>): Promise<DigitalMenuSettings> {
    const current = await this.get();
    const validIds = new Set((await this.menuItems()).map((i) => i.id));
    const next = this.validate(dto, current, validIds);
    const value = { ...next } as Record<string, unknown>;
    delete value.isSample;
    delete value.updatedAt;
    await this.prisma.systemConfig.upsert({
      where:  { key: CONFIG_KEY },
      update: { value: value as any },
      create: { key: CONFIG_KEY, value: value as any },
    });
    return this.get();
  }

  /** Itens mais vendidos no período (quantidade, sem cancelados). */
  async topSellers(days: number, limit: number): Promise<Array<{ menuItemId: string; quantity: number }>> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.comandaItem.groupBy({
      by:      ['menuItemId'],
      where:   { createdAt: { gte: since }, status: { not: 'CANCELLED' } },
      _sum:    { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take:    limit,
    });
    return rows.map((r) => ({ menuItemId: r.menuItemId, quantity: r._sum.quantity ?? 0 }));
  }

  /**
   * Versão pública (vai para o app via /cardapio/menu): só o que está ligado,
   * sem ofertas inativas e com os "mais pedidos" já resolvidos em ids.
   */
  async getPublic(availableItemIds: string[]) {
    const s = await this.get();
    const available = new Set(availableItemIds);

    let popularIds: string[] = [];
    if (s.popular.enabled) {
      const source = s.popular.mode === 'manual'
        ? s.popular.menuItemIds
        : (await this.topSellers(s.popular.days, s.popular.limit * 2)).map((r) => r.menuItemId);
      popularIds = source.filter((id) => available.has(id)).slice(0, s.popular.limit);
    }

    return {
      welcome:   s.welcome.enabled ? s.welcome : null,
      offers:    s.offers.enabled
        ? {
            title: s.offers.title,
            items: s.offers.items
              .filter((o) => o.active)
              .map((o) => ({ ...o, menuItemId: o.menuItemId && available.has(o.menuItemId) ? o.menuItemId : null })),
          }
        : null,
      popular:   s.popular.enabled && popularIds.length ? { title: s.popular.title, menuItemIds: popularIds } : null,
      ratings:   s.ratings.enabled
        ? Object.fromEntries(Object.entries(s.ratings.items).filter(([id]) => available.has(id)))
        : null,
      favorites: s.favorites.enabled,
    };
  }

  private validate(dto: Partial<DigitalMenuSettings>, current: DigitalMenuSettings, validIds: Set<string>): DigitalMenuSettings {
    const text = (v: unknown, field: string, max: number, required = false): string => {
      const s = typeof v === 'string' ? v.trim() : '';
      if (required && !s) throw new BadRequestException(`${field} é obrigatório`);
      if (s.length > max) throw new BadRequestException(`${field} deve ter no máximo ${max} caracteres`);
      return s;
    };
    const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
    const int = (v: unknown, field: string, min: number, max: number, fallback: number) => {
      if (v === undefined || v === null) return fallback;
      const n = Number(v);
      if (!Number.isInteger(n) || n < min || n > max) throw new BadRequestException(`${field} deve estar entre ${min} e ${max}`);
      return n;
    };

    const w = { ...current.welcome, ...dto.welcome };
    const welcome = {
      enabled:     bool(w.enabled, current.welcome.enabled),
      title:       text(w.title, 'Título da boas-vindas', 60, true),
      subtitle:    text(w.subtitle, 'Texto da boas-vindas', 160),
      buttonLabel: text(w.buttonLabel, 'Texto do botão', 30, true),
    };

    const o = { ...current.offers, ...dto.offers };
    const offerItems = (Array.isArray(o.items) ? o.items : []) as Partial<DigitalMenuOffer>[];
    if (offerItems.length > MAX_OFFERS) throw new BadRequestException(`Máximo de ${MAX_OFFERS} ofertas`);
    const offers = {
      enabled: bool(o.enabled, current.offers.enabled),
      title:   text(o.title, 'Título da seção de ofertas', 40, true),
      items:   offerItems.map((item, idx) => {
        const n = idx + 1;
        const color = item.color ?? '#FF7247';
        if (!HEX.test(color)) throw new BadRequestException(`Oferta ${n}: cor inválida (use #RRGGBB)`);
        const menuItemId = item.menuItemId || null;
        if (menuItemId && !validIds.has(menuItemId)) throw new BadRequestException(`Oferta ${n}: item do cardápio não encontrado`);
        return {
          id:         typeof item.id === 'string' && item.id ? item.id : uuidv7(),
          active:     bool(item.active, true),
          highlight:  text(item.highlight, `Oferta ${n}: destaque`, 12, true),
          title:      text(item.title, `Oferta ${n}: título`, 30),
          subtitle:   text(item.subtitle, `Oferta ${n}: subtítulo`, 40),
          menuItemId,
          color,
        };
      }),
    };

    const p = { ...current.popular, ...dto.popular };
    const mode = p.mode === 'manual' ? 'manual' : 'auto';
    const menuItemIds = (Array.isArray(p.menuItemIds) ? p.menuItemIds : []).filter((id) => validIds.has(id));
    const popular = {
      enabled:     bool(p.enabled, current.popular.enabled),
      title:       text(p.title, 'Título da seção de destaques', 40, true),
      mode:        mode as 'auto' | 'manual',
      menuItemIds: [...new Set(menuItemIds)].slice(0, 12),
      limit:       int(p.limit, 'Quantidade de destaques', 2, 12, current.popular.limit),
      days:        int(p.days, 'Período dos mais vendidos', 1, 365, current.popular.days),
    };

    const r = { ...current.ratings, ...dto.ratings };
    const ratingItems: Record<string, { rating: number; reviews: number }> = {};
    for (const [id, val] of Object.entries(r.items ?? {})) {
      if (!validIds.has(id) || !val) continue;
      const rating = Math.round(Number(val.rating) * 10) / 10;
      const reviews = Number(val.reviews);
      if (!(rating >= 0 && rating <= 5)) throw new BadRequestException('Nota deve estar entre 0 e 5');
      if (!Number.isInteger(reviews) || reviews < 0) throw new BadRequestException('Quantidade de avaliações inválida');
      ratingItems[id] = { rating, reviews };
    }
    const ratings = { enabled: bool(r.enabled, current.ratings.enabled), items: ratingItems };

    const favorites = { enabled: bool(dto.favorites?.enabled, current.favorites.enabled) };

    return { welcome, offers, popular, ratings, favorites, isSample: false, updatedAt: null };
  }
}
