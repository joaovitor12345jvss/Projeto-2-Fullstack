import { useState } from 'react';
import RelatorioCategorias from '../relatorios/RelatorioCategorias';
import RelatorioFontesDestinos from '../relatorios/RelatorioFontesDestinos';

export default function Relatorios() {
  const [aba, setAba] = useState('todos');

  return (
    <div className="page">
      <div className="page-header page-header-flex">
        <div>
          <h1>Relatórios</h1>
          <p className="page-subtitle">Analise receitas, despesas e saldos por categoria e por conta ou cartão.</p>
        </div>

        <div className="segmented-control" role="tablist" aria-label="Tipo de relatório">
          <button
            type="button"
            className={`seg-btn ${aba === 'todos' ? 'active' : ''}`}
            onClick={() => setAba('todos')}
          >
            Todos
          </button>
          <button
            type="button"
            className={`seg-btn ${aba === 'categorias' ? 'active' : ''}`}
            onClick={() => setAba('categorias')}
          >
            Por categoria
          </button>
          <button
            type="button"
            className={`seg-btn ${aba === 'fontes' ? 'active' : ''}`}
            onClick={() => setAba('fontes')}
          >
            Por conta e cartão
          </button>
        </div>
      </div>

      {(aba === 'todos' || aba === 'categorias') && <RelatorioCategorias />}
      {(aba === 'todos' || aba === 'fontes') && <RelatorioFontesDestinos />}
    </div>
  );
}
