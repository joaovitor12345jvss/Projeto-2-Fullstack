import RelatorioCategorias from '../relatorios/RelatorioCategorias';
import RelatorioFontesDestinos from '../relatorios/RelatorioFontesDestinos';

export default function Relatorios() {
  return (
    <div className="page">
      <div className="page-header">
        <h1>Relatórios</h1>
        <p className="page-subtitle">Veja para onde o seu dinheiro está indo.</p>
      </div>
      <RelatorioCategorias />
      <RelatorioFontesDestinos />
    </div>
  );
}
