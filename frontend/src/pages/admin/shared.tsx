// Componentes de UI e helpers compartilhados entre as páginas do admin.

export const BRAND = {
  navy:'#0D1B2A', yellow:'#FFD60A', orange:'#FF6B2B', red:'#E63946',
  green:'#2DC653', navyLight:'#1A2E44', cream:'#FFF8F0', gray:'#f4f6f8',
};

export const fmtBRL  = (v: any) => `R$ ${parseFloat(v||0).toFixed(2).replace('.',',')}`;
export const fmtDate = (d: string) =>
  new Date(d).toLocaleString('pt-BR', { timeZone:'America/Sao_Paulo', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });

export const PAY_LABELS: Record<string,string> = {
  CASH:'Dinheiro', CARD:'Cartão', PIX:'Pix', VOUCHER:'Voucher',
};
export const PAY_COLORS: Record<string,string> = {
  CASH: BRAND.green, CARD:'#5c6bc0', PIX:'#00bfa5', VOUCHER: BRAND.orange,
};
export const PRINT_CAT_LABELS: Record<string,string> = {
  kitchen:'Cozinha', bar:'Bar', cashier:'Caixa',
};

export function todayStart() { const d = new Date(); d.setHours(0,0,0,0); return d; }
export function getSubtotal(c: any) {
  return (c.items ?? []).reduce((s: number, i: any) => s + i.quantity * parseFloat(i.unitPrice), 0);
}
export function getTotal(c: any) {
  if (c.payments?.length) return c.payments.reduce((s: number, p: any) => s + parseFloat(p.amount), 0);
  return getSubtotal(c);
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background:'#fff', borderRadius:12, padding:'20px 24px',
      boxShadow:'0 1px 4px rgba(0,0,0,.08)', border:'1px solid #e8ecf0', ...style }}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title:string; subtitle?:string; action?: React.ReactNode }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
      <div>
        <h1 style={{ margin:0, fontSize:22, fontWeight:900, color:BRAND.navy }}>{title}</h1>
        {subtitle && <p style={{ margin:'4px 0 0', color:'#888', fontSize:13 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyPlaceholder({ icon, title, subtitle }: { icon:string; title:string; subtitle?:string }) {
  return (
    <div style={{ textAlign:'center', padding:'80px 40px' }}>
      <div style={{ fontSize:56, marginBottom:16 }}>{icon}</div>
      <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:BRAND.navy }}>{title}</h2>
      {subtitle && <p style={{ margin:'8px 0 0', color:'#aaa', fontSize:13 }}>{subtitle}</p>}
    </div>
  );
}

export function Btn({ children, onClick, variant='primary', small=false, disabled=false }: any) {
  const V: Record<string,any> = {
    primary:   { background:`linear-gradient(135deg,${BRAND.orange},${BRAND.red})`, color:'#fff', border:'none' },
    secondary: { background:BRAND.yellow, color:BRAND.navy, border:'none' },
    ghost:     { background:'transparent', color:BRAND.navy, border:'1.5px solid #d0d5dd' },
    danger:    { background:BRAND.red, color:'#fff', border:'none' },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...V[variant], borderRadius:8, padding: small ? '6px 14px' : '10px 20px',
      fontSize: small ? 12 : 14, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
      opacity: disabled ? .5 : 1,
    }}>{children}</button>
  );
}

export function TableHead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr style={{ background:'#f8f9fa' }}>
        {cols.map(h => (
          <th key={h} style={{ textAlign:'left', padding:'10px 16px', fontSize:11, color:'#888',
            fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>{h}</th>
        ))}
      </tr>
    </thead>
  );
}
