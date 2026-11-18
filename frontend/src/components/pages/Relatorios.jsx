import RelatorioCategorias from '../relatorios/RelatorioCategorias';
import RelatorioFontesDestinos from '../relatorios/RelatorioFontesDestinos';

export default function Relatorios() {
  return (
    <div style={{ textAlign: 'left', color: '#222' }}>
      <h1 style={{ color: '#222', fontSize: '2rem', margin: '0 0 1.5rem' }}>Relatórios</h1>
      <RelatorioCategorias />
      <RelatorioFontesDestinos />
    </div>
  );
}
