import { useEffect, useMemo, useState } from 'react';
import {
  cardapioDigitalApi, DigitalMenuAdminData, DigitalMenuOffer, DigitalMenuSettings,
} from '@/services/api';
import { BRAND, Card, PageHeader, Btn, Field, inputStyle, fmtBRL } from './shared';

// Mesma cor de destaque do cardapio-app (ver cardapio-app/src/theme.ts)
const CORAL = '#FF7247';
const OFFER_COLORS = ['#FF7247', '#1F1F1F', '#2DC653', '#5c6bc0', '#E63946', '#8e44ad'];
const MAX_OFFERS = 6;

function newId() {
  return (crypto as any).randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: 46, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', flexShrink: 0,
        background: checked ? BRAND.green : '#d0d5dd', position: 'relative', transition: 'background .15s',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3, width: 20, height: 20, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .15s',
      }} />
    </button>
  );
}

function Section({ icon, title, description, enabled, onToggle, children }: {
  icon: string; title: string; description: string; enabled: boolean; onToggle: (v: boolean) => void; children?: React.ReactNode;
}) {
  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <span style={{ fontSize: 26, lineHeight: 1 }} aria-hidden="true">{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: BRAND.navy }}>{title}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{description}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: enabled ? BRAND.green : '#aaa' }}>
            {enabled ? 'Visível no app' : 'Oculto'}
          </span>
          <Toggle checked={enabled} onChange={onToggle} label={`Mostrar ${title} no app`} />
        </div>
      </div>
      {children && <div style={{ marginTop: 18, opacity: enabled ? 1 : 0.6 }}>{children}</div>}
    </Card>
  );
}

export default function CardapioDigital() {
  const [data, setData]       = useState<DigitalMenuAdminData | null>(null);
  const [draft, setDraft]     = useState<DigitalMenuSettings | null>(null);
  const [saved, setSaved]     = useState<string>('');   // JSON do último estado salvo, para detectar alterações
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');
  const [okMsg, setOkMsg]     = useState('');
  const [ratingFilter, setRatingFilter] = useState('');

  async function load() {
    setLoading(true); setErr('');
    try {
      const d = await cardapioDigitalApi.get();
      setData(d);
      setDraft(d.settings);
      setSaved(d.settings.isSample ? '' : JSON.stringify(d.settings));
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const dirty = !!draft && JSON.stringify(draft) !== saved;

  // Avisa antes de sair da página com alterações não salvas
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const itemsById = useMemo(() => new Map((data?.items ?? []).map((i) => [i.id, i])), [data]);

  if (loading) return <p style={{ color: '#aaa', fontSize: 13 }}>Carregando...</p>;
  if (!data || !draft) return <p style={{ color: BRAND.red, fontSize: 13 }}>{err || 'Não foi possível carregar.'}</p>;

  const s = draft;
  function update<K extends keyof DigitalMenuSettings>(key: K, patch: Partial<DigitalMenuSettings[K]>) {
    setOkMsg('');
    setDraft((prev) => prev && ({ ...prev, [key]: { ...(prev[key] as object), ...patch } }));
  }
  function updateOffer(id: string, patch: Partial<DigitalMenuOffer>) {
    update('offers', { items: s.offers.items.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  }
  function moveOffer(idx: number, dir: -1 | 1) {
    const items = [...s.offers.items];
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    [items[idx], items[j]] = [items[j], items[idx]];
    update('offers', { items });
  }

  async function save() {
    if (!draft) return;
    setSaving(true); setErr(''); setOkMsg('');
    try {
      const result = await cardapioDigitalApi.save(draft);
      setDraft(result);
      setData((d) => d && { ...d, settings: result });
      setSaved(JSON.stringify(result));
      setOkMsg('Salvo! O cardápio digital atualiza em até 5 minutos.');
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  const itemOptions = data.items.map((i) => (
    <option key={i.id} value={i.id}>{i.name}{i.category ? ` — ${i.category}` : ''}{i.available ? '' : ' (indisponível)'}</option>
  ));

  const filteredRatingItems = data.items.filter((i) =>
    !ratingFilter.trim() || i.name.toLowerCase().includes(ratingFilter.trim().toLowerCase()));

  return (
    <div style={{ paddingBottom: 90, maxWidth: 860 }}>
      <PageHeader
        title="Cardápio Digital"
        subtitle="Vitrine do cardápio que o cliente acessa pelo QR Code da mesa"
      />

      {s.isSample && (
        <div style={{ background: '#FFF8E1', border: '1px solid #FFD60A', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#6b5a00' }}>
          <b>Dados de exemplo.</b> Os textos, ofertas e notas abaixo são temporários e ainda não foram salvos.
          Ofertas e avaliações começam <b>ocultas</b> para que nada inventado apareça para os clientes — revise, ative e salve.
        </div>
      )}

      {/* ── Boas-vindas ─────────────────────────────────────────────── */}
      <Section
        icon="👋" title="Tela de boas-vindas"
        description="Aparece na primeira visita do cliente (uma vez por sessão), antes do cardápio."
        enabled={s.welcome.enabled} onToggle={(v) => update('welcome', { enabled: v })}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 20, alignItems: 'start' }}>
          <div>
            <Field label="Título">
              <input style={inputStyle} maxLength={60} value={s.welcome.title} onChange={(e) => update('welcome', { title: e.target.value })} />
            </Field>
            <Field label="Texto">
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} maxLength={160} value={s.welcome.subtitle}
                onChange={(e) => update('welcome', { subtitle: e.target.value })} />
            </Field>
            <Field label="Texto do botão">
              <input style={{ ...inputStyle, maxWidth: 240 }} maxLength={30} value={s.welcome.buttonLabel}
                onChange={(e) => update('welcome', { buttonLabel: e.target.value })} />
            </Field>
          </div>
          {/* Prévia */}
          <div aria-label="Prévia da boas-vindas" style={{ background: '#F7F7F7', borderRadius: 16, padding: '22px 16px', textAlign: 'center', border: '1px solid #eee' }}>
            <div style={{ fontSize: 30 }} aria-hidden="true">🍜 🍛 🥟</div>
            <div style={{ color: CORAL, fontWeight: 800, fontSize: 16, marginTop: 10, lineHeight: 1.25 }}>{s.welcome.title || 'Título'}</div>
            <div style={{ color: '#777', fontSize: 11, marginTop: 6 }}>{s.welcome.subtitle}</div>
            <div style={{ marginTop: 12, background: CORAL, color: '#fff', borderRadius: 999, padding: '8px 0', fontSize: 12, fontWeight: 700 }}>
              {s.welcome.buttonLabel || 'Botão'}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Ofertas ─────────────────────────────────────────────────── */}
      <Section
        icon="🏷️" title="Banner de ofertas"
        description="Carrossel no topo do cardápio. Ao tocar, abre o item vinculado."
        enabled={s.offers.enabled} onToggle={(v) => update('offers', { enabled: v })}
      >
        <Field label="Título da seção">
          <input style={{ ...inputStyle, maxWidth: 300 }} maxLength={40} value={s.offers.title}
            onChange={(e) => update('offers', { title: e.target.value })} />
        </Field>

        {s.offers.items.length === 0 && (
          <p style={{ fontSize: 13, color: '#aaa', margin: '4px 0 12px' }}>Nenhuma oferta cadastrada.</p>
        )}

        {s.offers.items.map((o, idx) => (
          <div key={o.id} style={{ border: '1px solid #eee', borderRadius: 12, padding: 14, marginBottom: 12, opacity: o.active ? 1 : 0.6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16 }}>
              {/* Prévia do banner */}
              <div style={{ background: o.color, color: '#fff', borderRadius: 14, padding: '14px 14px', minHeight: 92, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{o.highlight || '—'}</div>
                <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.3 }}>{o.title}<br />{o.subtitle}</div>
              </div>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr', gap: 10 }}>
                  <Field label="Destaque">
                    <input style={inputStyle} maxLength={12} placeholder="30%" value={o.highlight}
                      onChange={(e) => updateOffer(o.id, { highlight: e.target.value })} />
                  </Field>
                  <Field label="Linha 1">
                    <input style={inputStyle} maxLength={30} placeholder="de desconto" value={o.title}
                      onChange={(e) => updateOffer(o.id, { title: e.target.value })} />
                  </Field>
                  <Field label="Linha 2">
                    <input style={inputStyle} maxLength={40} placeholder="no Shoyu Lamen" value={o.subtitle}
                      onChange={(e) => updateOffer(o.id, { subtitle: e.target.value })} />
                  </Field>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
                  <Field label="Item vinculado (abre ao tocar)">
                    <select style={inputStyle} value={o.menuItemId ?? ''} onChange={(e) => updateOffer(o.id, { menuItemId: e.target.value || null })}>
                      <option value="">Nenhum (só informativo)</option>
                      {itemOptions}
                    </select>
                  </Field>
                  <Field label="Cor">
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', height: 38 }}>
                      {OFFER_COLORS.map((c) => (
                        <button key={c} type="button" title={c} aria-label={`Cor ${c}`} onClick={() => updateOffer(o.id, { color: c })}
                          style={{ width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer',
                            border: o.color.toLowerCase() === c.toLowerCase() ? `3px solid ${BRAND.navy}` : '2px solid #fff', boxShadow: '0 0 0 1px #dde' }} />
                      ))}
                    </div>
                  </Field>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#666', cursor: 'pointer', marginRight: 'auto' }}>
                <input type="checkbox" checked={o.active} onChange={(e) => updateOffer(o.id, { active: e.target.checked })} />
                Oferta ativa
              </label>
              <Btn small variant="ghost" disabled={idx === 0} onClick={() => moveOffer(idx, -1)}>↑</Btn>
              <Btn small variant="ghost" disabled={idx === s.offers.items.length - 1} onClick={() => moveOffer(idx, 1)}>↓</Btn>
              <Btn small variant="ghost" onClick={() => update('offers', { items: s.offers.items.filter((x) => x.id !== o.id) })}>Remover</Btn>
            </div>
          </div>
        ))}

        <Btn small variant="secondary" disabled={s.offers.items.length >= MAX_OFFERS}
          onClick={() => update('offers', { items: [...s.offers.items, { id: newId(), active: true, highlight: '', title: '', subtitle: '', menuItemId: null, color: CORAL }] })}>
          + Nova oferta
        </Btn>
        {s.offers.items.length >= MAX_OFFERS && <span style={{ fontSize: 12, color: '#aaa', marginLeft: 10 }}>Máximo de {MAX_OFFERS} ofertas</span>}
      </Section>

      {/* ── Mais pedidos ─────────────────────────────────────────────── */}
      <Section
        icon="🔥" title="Destaques (mais pedidos)"
        description="Faixa horizontal de pratos no topo do cardápio."
        enabled={s.popular.enabled} onToggle={(v) => update('popular', { enabled: v })}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Título da seção">
            <input style={inputStyle} maxLength={40} value={s.popular.title} onChange={(e) => update('popular', { title: e.target.value })} />
          </Field>
          <Field label="Quantidade de pratos">
            <input style={{ ...inputStyle, maxWidth: 100 }} type="number" min={2} max={12} value={s.popular.limit}
              onChange={(e) => update('popular', { limit: Number(e.target.value) })} />
          </Field>
        </div>
        <div style={{ display: 'flex', gap: 18, margin: '2px 0 14px', fontSize: 13 }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
            <input type="radio" name="popular-mode" checked={s.popular.mode === 'auto'} onChange={() => update('popular', { mode: 'auto' })} />
            Automático — mais vendidos dos últimos
            <input style={{ ...inputStyle, width: 64, padding: '4px 8px' }} type="number" min={1} max={365} value={s.popular.days}
              disabled={s.popular.mode !== 'auto'} onChange={(e) => update('popular', { days: Number(e.target.value) })} />
            dias
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
            <input type="radio" name="popular-mode" checked={s.popular.mode === 'manual'} onChange={() => update('popular', { mode: 'manual' })} />
            Escolher manualmente
          </label>
        </div>

        {s.popular.mode === 'auto' ? (
          <div style={{ fontSize: 13, color: '#555' }}>
            {data.topSellers.length === 0 ? (
              <span style={{ color: '#aaa' }}>Ainda não há vendas no período — a seção fica oculta até haver pedidos.</span>
            ) : (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 6 }}>
                  Prévia — mais vendidos nos últimos {data.settings.popular.days} dias{s.popular.days !== data.settings.popular.days ? ' (salve para recalcular com o novo período)' : ''}:
                </div>
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  {data.topSellers.slice(0, s.popular.limit).map((t) => (
                    <li key={t.menuItemId}>{itemsById.get(t.menuItemId)?.name ?? 'Item removido'} — {t.quantity} vendidos</li>
                  ))}
                </ol>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 6, maxHeight: 260, overflowY: 'auto', border: '1px solid #eee', borderRadius: 10, padding: 10 }}>
            {data.items.map((i) => {
              const checked = s.popular.menuItemIds.includes(i.id);
              const full = !checked && s.popular.menuItemIds.length >= s.popular.limit;
              return (
                <label key={i.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, cursor: full ? 'not-allowed' : 'pointer', opacity: full ? 0.45 : 1 }}>
                  <input type="checkbox" checked={checked} disabled={full}
                    onChange={() => update('popular', {
                      menuItemIds: checked ? s.popular.menuItemIds.filter((x) => x !== i.id) : [...s.popular.menuItemIds, i.id],
                    })} />
                  {i.name}
                </label>
              );
            })}
          </div>
        )}
        {s.popular.mode === 'manual' && (
          <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>{s.popular.menuItemIds.length} de {s.popular.limit} selecionados (na ordem em que foram marcados)</div>
        )}
      </Section>

      {/* ── Avaliações ──────────────────────────────────────────────── */}
      <Section
        icon="⭐" title="Avaliações"
        description="Nota e número de avaliações exibidos nos cards e no detalhe de cada prato."
        enabled={s.ratings.enabled} onToggle={(v) => update('ratings', { enabled: v })}
      >
        <div style={{ background: '#FFF4EF', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#8a4a32', marginBottom: 12 }}>
          As notas são definidas manualmente aqui (não há coleta de avaliações dos clientes). Use valores reais —
          por exemplo, os do Google ou do iFood — antes de deixar a seção visível.
        </div>
        <input style={{ ...inputStyle, maxWidth: 280, marginBottom: 10 }} placeholder="Filtrar pratos…" value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)} />
        <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #eee', borderRadius: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                {['Prato', 'Preço', 'Nota (0–5)', 'Nº de avaliações'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRatingItems.map((i) => {
                const r = s.ratings.items[i.id] ?? { rating: 0, reviews: 0 };
                const setR = (patch: Partial<{ rating: number; reviews: number }>) =>
                  update('ratings', { items: { ...s.ratings.items, [i.id]: { ...r, ...patch } } });
                return (
                  <tr key={i.id} style={{ borderTop: '1px solid #f3f3f3' }}>
                    <td style={{ padding: '6px 12px', fontWeight: 600, color: BRAND.navy }}>{i.name}</td>
                    <td style={{ padding: '6px 12px', color: '#888' }}>{fmtBRL(i.price)}</td>
                    <td style={{ padding: '6px 12px' }}>
                      <input style={{ ...inputStyle, width: 80, padding: '5px 8px' }} type="number" min={0} max={5} step={0.1}
                        value={Math.round(r.rating * 10) / 10} onChange={(e) => setR({ rating: Math.round(Number(e.target.value) * 10) / 10 })} />
                    </td>
                    <td style={{ padding: '6px 12px' }}>
                      <input style={{ ...inputStyle, width: 100, padding: '5px 8px' }} type="number" min={0} step={1}
                        value={r.reviews} onChange={(e) => setR({ reviews: Math.max(0, Math.round(Number(e.target.value))) })} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>Pratos com 0 avaliações não mostram nota no app.</div>
      </Section>

      {/* ── Favoritos ───────────────────────────────────────────────── */}
      <Section
        icon="❤️" title="Favoritos"
        description="Coração nos pratos e aba “Favoritos” no app. Fica salvo só no celular do cliente — nenhum dado é enviado."
        enabled={s.favorites.enabled} onToggle={(v) => update('favorites', { enabled: v })}
      />

      {/* ── Barra de salvar ─────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', bottom: 0, marginTop: 8, background: '#fff', borderTop: '1px solid #eee',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: '12px 12px 0 0',
        boxShadow: '0 -4px 16px rgba(0,0,0,.05)',
      }}>
        <span style={{ fontSize: 13, color: err ? BRAND.red : okMsg ? BRAND.green : '#888', flex: 1 }}>
          {err || okMsg || (s.isSample ? 'Dados de exemplo — salve para publicar.' : dirty ? 'Alterações não salvas.' : `Salvo${s.updatedAt ? ` em ${new Date(s.updatedAt).toLocaleString('pt-BR')}` : ''}.`)}
        </span>
        <Btn variant="ghost" disabled={!dirty || saving} onClick={() => { setDraft(data.settings); setErr(''); setOkMsg(''); }}>Descartar</Btn>
        <Btn onClick={save} disabled={saving || (!dirty && !s.isSample)}>{saving ? 'Salvando...' : 'Salvar alterações'}</Btn>
      </div>
    </div>
  );
}
