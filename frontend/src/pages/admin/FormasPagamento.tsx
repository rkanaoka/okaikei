import { BRAND, PAY_COLORS, Card, PageHeader } from './shared';

export default function FormasPagamento() {
  const methods = [
    { id:'CASH', label:'Dinheiro', desc:'Aceite pagamentos em espécie' },
    { id:'CARD', label:'Cartão (débito/crédito)', desc:'Via maquininha' },
    { id:'PIX',  label:'Pix', desc:'Transferência instantânea' },
    { id:'VOUCHER', label:'Voucher', desc:'Vale-refeição e alimentação' },
  ];
  return (
    <div>
      <PageHeader title="Formas de Pagamento" subtitle="Métodos aceitos no estabelecimento" />
      <Card style={{ maxWidth:520 }}>
        {methods.map((m, i) => (
          <div key={m.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'14px 0', borderBottom: i < methods.length-1 ? '1px solid #f5f5f5' : 'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:PAY_COLORS[m.id]??'#999', flexShrink:0 }} />
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:BRAND.navy }}>{m.label}</div>
                <div style={{ fontSize:12, color:'#aaa' }}>{m.desc}</div>
              </div>
            </div>
            <span style={{ fontSize:12, fontWeight:700, color:BRAND.green,
              background:'#e8f8ee', borderRadius:4, padding:'3px 10px' }}>Ativo</span>
          </div>
        ))}
        <p style={{ color:'#ccc', fontSize:12, margin:'16px 0 0' }}>
          Gerenciamento de formas de pagamento disponível em breve.
        </p>
      </Card>
    </div>
  );
}
