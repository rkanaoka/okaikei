import { useState } from 'react';
import { BRAND, Card, Btn } from './shared';
import { useAuth } from '@/store/AuthContext';
import { firebaseEnabled } from '@/services/firebase';

export default function Login() {
  const { pending, error, loginPassword, loginGoogle } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await loginPassword(username, password);
    setSubmitting(false);
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await loginGoogle();
    setGoogleLoading(false);
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:BRAND.navy, fontFamily:'system-ui,-apple-system,sans-serif' }}>
      <Card style={{ width:360 }}>
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:20, fontWeight:900, letterSpacing:3, color:BRAND.navy }}>BODOGAMI</div>
          <div style={{ fontSize:12, color:'#888', marginTop:2 }}>Administração</div>
        </div>

        {pending && (
          <p style={{ background:'#fff8e0', color:'#8a6d00', fontSize:13, padding:'10px 12px',
            borderRadius:8, marginBottom:16 }}>
            Sua conta foi criada e está aguardando aprovação de um administrador.
          </p>
        )}
        {error && <p style={{ color:BRAND.red, fontSize:13, margin:'0 0 16px' }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Usuário</label>
            <input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username"
              style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
                padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
          </div>
          <div style={{ marginBottom:18 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"
              style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
                padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
          </div>
          <Btn disabled={submitting || !username || !password}>{submitting ? 'Entrando...' : 'Entrar'}</Btn>
        </form>

        <div style={{ display:'flex', alignItems:'center', gap:10, margin:'20px 0' }}>
          <div style={{ flex:1, height:1, background:'#e8ecf0' }} />
          <span style={{ fontSize:11, color:'#aaa' }}>ou</span>
          <div style={{ flex:1, height:1, background:'#e8ecf0' }} />
        </div>

        <button onClick={handleGoogle} disabled={!firebaseEnabled || googleLoading} type="button" style={{
          width:'100%', padding:'10px 20px', borderRadius:8, fontSize:14, fontWeight:700,
          cursor: firebaseEnabled ? 'pointer' : 'not-allowed', fontFamily:'inherit',
          background:'#fff', color:BRAND.navy, border:'1.5px solid #d0d5dd',
          opacity: firebaseEnabled ? 1 : .5,
        }}>
          {googleLoading ? 'Entrando...' : firebaseEnabled ? 'Entrar com Google' : 'Login Google não configurado'}
        </button>
      </Card>
    </div>
  );
}
