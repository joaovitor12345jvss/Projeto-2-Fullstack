import RelatorioCategorias from '../relatorios/RelatorioCategorias';

export default function Relatorios() {
  return (
    <div style={{ textAlign: 'left', color: '#222' }}>
      <h1 style={{ color: '#222', fontSize: '2rem', margin: '0 0 1.5rem' }}>Relatórios</h1>

      {/* RF7 — Relatório por categoria */}
      <RelatorioCategorias />

      {/* RF8 — Relatório por fonte/destino: adicionar o componente aqui */}
    </div>
  );
}
