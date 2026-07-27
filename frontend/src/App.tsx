import { Routes, Route, Navigate } from 'react-router-dom';
import Painel  from '@/pages/Painel';
import Garcom  from '@/pages/Garcom';
import Caixa   from '@/pages/Caixa';
import Admin   from '@/pages/Admin';
import NotionFaturamento from '@/pages/notion-faturamento';
import NotionExtrato from '@/pages/notion-extrato';

export default function App() {
  return (
    <Routes>
      <Route path="/"                    element={<Painel />} />
      <Route path="/garcom"              element={<Garcom />} />
      <Route path="/caixa/:id"           element={<Caixa />} />
      <Route path="/admin"               element={<Admin />} />
      <Route path="/notion-faturamento"  element={<NotionFaturamento />} />
      <Route path="/notion-extrato"      element={<NotionExtrato />} />
      <Route path="*"                    element={<Navigate to="/" replace />} />
    </Routes>
  );
}
