import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi, AuthUser, LoginResult, AUTH_TOKEN_KEY } from '@/services/api';
import { signInWithGoogle } from '@/services/firebase';

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  pending: boolean;
  error: string;
  loginPassword: (username: string, password: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) { setLoading(false); return; }
    authApi.me()
      .then(setUser)
      .catch(() => localStorage.removeItem(AUTH_TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  function applyResult(result: LoginResult) {
    if ('pending' in result) { setPending(true); return; }
    localStorage.setItem(AUTH_TOKEN_KEY, result.token);
    setUser(result.user);
  }

  async function loginPassword(username: string, password: string) {
    setError(''); setPending(false);
    try { applyResult(await authApi.login(username, password)); }
    catch (e: any) { setError(e.message ?? 'Usuário ou senha inválidos.'); }
  }

  async function loginGoogle() {
    setError(''); setPending(false);
    try {
      const idToken = await signInWithGoogle();
      applyResult(await authApi.loginFirebase(idToken));
    } catch (e: any) { setError(e.message ?? 'Falha no login com Google.'); }
  }

  function logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, pending, error, loginPassword, loginGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
