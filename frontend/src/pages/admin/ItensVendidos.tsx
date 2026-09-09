import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { comandasApi, menuApi } from '@/services/api';
import {
  BRAND, fmtBRL, PRINT_CAT_LABELS, Card, PageHeader, TableHead,
  SHIFTS, getShiftKey, toSPDateStr, inDateRange, DateRangeFilter,
  fetchMenuItemInfoMap, GroupToggle, MenuItemInfo,
} from './shared';

interface SoldItem { name:string; qty:number; total:number; categoryName:string; legacyCategory:string; }

export default function ItensVendidos() {
  const [loading, setLoading]   = useState(true);
  const [comandas, setComandas] = useState<any[]>([]);
  const [menuMap, setMenuMap]   = useState<Map<string, MenuItemInfo>>(new Map());
  const [categories, setCategories] = useState<{id:string;name:string}[]>([]);

  const [dateFrom, setDateFrom] = useState(() => toSPDateStr(new Date()));
  const [dateTo, setDateTo]     = useState(() => toSPDateStr(new Date()));
  const [shift, setShift]       = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [groupBy, setGroupBy]   = useState<'produto'|'categoria'>('produto');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      comandasApi.list('CLOSED'),
      fetchMenuItemInfoMap(),
      menuApi.categories.list(),
    ]).then(([all, map, cats]) => {
      setComandas(all as unknown as any[]);
      setMenuMap(map);
      setCategories(cats as unknown as any[]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filteredComandas = useMemo(() => comandas.filter((c:any) => {
    if (!inDateRange(c.openedAt, dateFrom, dateTo)) return false;
    if (shift && getShiftKey(c.openedAt) !== shift) return false;
    return true;
  }), [comandas, dateFrom, dateTo, shift]);

  const items: SoldItem[] = useMemo(() => {
    const map: Record<string, SoldItem> = {};
    const search = productSearch.trim().toLowerCase();
    for (const c of filteredComandas) {
      for (const item of (c.items ?? [])) {
        if (item.status === 'CANCELLED') continue;
        const info = menuMap.get(item.menuItemId);
        const name = info?.name ?? item.menuItem?.name ?? item.name ?? '?';
        const categoryName = info?.categoryName ?? 'Sem categoria';
        const legacyCategory = item.menuItem?.category ?? item.category ?? '?';
        if (categoryId && info?.categoryId !== categoryId) continue;
        if (search && !name.toLowerCase().includes(search)) continue;
        if (!map[name]) map[name] = { name, qty:0, total:0, categoryName, legacyCategory };
        map[name].qty   += item.quantity;
        map[name].total += item.quantity * parseFloat(item.unitPrice);
      }
    }
    return Object.values(map).sort((a,b) => b.qty - a.qty);
  }, [filteredComandas, menuMap, categoryId, productSearch]);

  const chartData = useMemo(() => {
    if (groupBy === 'produto') {
      return items.slice(0, 15).map(i => ({ label: i.name, total: i.total, qty: i.qty }));
    }
    const map: Record<string, { total:number; qty:number }> = {};
    for (const i of items) {
      if (!map[i.categoryName]) map[i.categoryName] = { total:0, qty:0 };
      map[i.categoryName].total += i.total;
      map[i.categoryName].qty   += i.qty;
    }
    return Object.entries(map).map(([label, v]) => ({ label, ...v })).sort((a,b) => b.total - a.total);
  }, [items, groupBy]);

  const selectStyle: React.CSSProperties = {
    border:'1.5px solid #ddd', borderRadius:8, padding:'8px 12px', fontSize:13,
    fontWeight:600, cursor:'pointer', outline:'none', fontFamily:'inherit',
  };

  return (
    <div>
      <PageHeader title="Itens Vendidos" subtitle="Ranking de itens do cardápio" />

      <Card style={{ marginBottom:20 }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:14, alignItems:'center' }}>
          <DateRangeFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />

          <select value={shift} onChange={e=>setShift(e.target.value)} style={selectStyle}>
            <option value="">Todos os turnos</option>
            {SHIFTS.map(s => <option key={s.key} value={s.key}>{s.label} ({s.hint})</option>)}
          </select>

          <select value={categoryId} onChange={e=>setCategoryId(e.target.value)} style={selectStyle}>
            <option value="">Todas as categorias</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <input
            value={productSearch} onChange={e=>setProductSearch(e.target.value)}
            placeholder="🔍 Buscar produto…"
            style={{ ...selectStyle, cursor:'text', minWidth:180 }}
          />
        </div>
      </Card>

      {loading ? <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p> : (
        <>
          <Card style={{ marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:BRAND.navy }}>Receita por {groupBy === 'produto' ? 'produto (top 15)' : 'categoria'}</h3>
              <GroupToggle value={groupBy} onChange={setGroupBy} />
            </div>
            {chartData.length === 0 ? (
              <p style={{ color:'#ccc', fontSize:13, textAlign:'center', padding:'30px 0' }}>Sem dados para o período/filtros selecionados</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 34)}>
                <BarChart data={chartData} layout="vertical" margin={{ left:10, right:30, top:5, bottom:5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v)=>fmtBRL(v)} tick={{ fontSize:11 }} />
                  <YAxis type="category" dataKey="label" width={150} tick={{ fontSize:12 }} />
                  <Tooltip formatter={(v:any)=>fmtBRL(v)} labelStyle={{ fontWeight:700 }} />
                  <Bar dataKey="total" fill={BRAND.orange} radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card style={{ padding:0 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <TableHead cols={['#','Item','Categoria','Qtd. Vendida','Receita Total']} />
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={5} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>
                    Nenhum item vendido no período
                  </td></tr>
                )}
                {items.map((item, idx) => (
                  <tr key={item.name} style={{ borderBottom:'1px solid #f0f0f0' }}>
                    <td style={{ padding:'10px 16px', color:'#ccc', fontWeight:700 }}>#{idx+1}</td>
                    <td style={{ padding:'10px 16px', fontWeight:700, color:BRAND.navy }}>{item.name}</td>
                    <td style={{ padding:'10px 16px' }}>
                      <span style={{ background:'#f0f2f5', borderRadius:4, padding:'2px 8px', fontSize:11, fontWeight:700 }}>
                        {item.categoryName}
                      </span>
                      <span style={{ marginLeft:6, fontSize:10, color:'#bbb' }}>
                        {PRINT_CAT_LABELS[item.legacyCategory] ?? item.legacyCategory}
                      </span>
                    </td>
                    <td style={{ padding:'10px 16px', fontWeight:900, fontSize:16, color:BRAND.orange }}>{item.qty}</td>
                    <td style={{ padding:'10px 16px', fontWeight:800, color:BRAND.green }}>{fmtBRL(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
