# Implementação dos requisitos RF6, RF8 e RF9

Todas as rotas abaixo (exceto cadastro/login) exigem o cabeçalho:

`Authorization: Bearer SEU_TOKEN_JWT`

## RF6 — Lançamentos

### Criar
`POST /api/lancamentos`

JSON:
```json
{
  "tipo": "saida",
  "descricao": "Compra no mercado",
  "valor": 150.50,
  "data": "2026-11-10",
  "categoria_id": 2,
  "fonte_destino_id": 1,
  "total_parcelas": 1
}
```

`total_parcelas` é opcional (padrão 1). Parcelamento de 1 a 48 vezes é aceito somente para despesas em cartão de crédito. A resposta de compra parcelada contém `grupo_parcelamento` e a lista de lançamentos gerados.

### Listar, filtrar e paginar
`GET /api/lancamentos?inicio=2026-11-01&fim=2026-11-30&tipo=saida&categoriaId=2&fonteDestinoId=1&pagina=1&porPagina=20`

Todos os filtros são opcionais e podem ser combinados. `inicio` e `fim` podem ser usados separadamente. `porPagina` aceita de 1 a 50.

Resposta:
```json
{
  "dados": [],
  "paginacao": {
    "pagina": 1,
    "porPagina": 20,
    "total": 0,
    "totalPaginas": 0
  }
}
```

### Consultar um
`GET /api/lancamentos/:id`

### Editar
`PUT /api/lancamentos/:id`

Envie `tipo`, `descricao`, `valor`, `data`, `categoria_id` e `fonte_destino_id`.

### Excluir
`DELETE /api/lancamentos/:id` exclui somente o lançamento indicado.

Para excluir todas as parcelas de uma compra parcelada:
`DELETE /api/lancamentos/:id?grupo=true`

## RF8 — Relatório por fonte/destino

`GET /api/relatorios/fontes-destinos?inicio=2026-11-01&fim=2026-11-30&tipo=saida`

Filtros opcionais: `inicio`, `fim` e `tipo` (`entrada` ou `saida`). Retorna, por fonte/destino, total de entradas, total de saídas, saldo e quantidade de lançamentos. Fontes/destinos sem movimentação também aparecem com totais zerados.

## RF9 — Previsão de faturas

`GET /api/relatorios/faturas?mes=2026-11&meses=6`

- `mes` (AAAA-MM) é opcional: é o primeiro **ciclo** (mês do fechamento) exibido; sem ele, começa no mês atual.
- `meses` é opcional, padrão 6, máximo 12.
- Regra de fechamento: compra feita **antes** do dia de fechamento entra na fatura que fecha no mesmo mês; no dia do fechamento ou depois, entra na do mês seguinte. Dias inexistentes (ex.: fechamento dia 31 em fevereiro) são ajustados para o último dia do mês.
- Vencimento: se `dia_vencimento` > `dia_fechamento`, é no mês do fechamento; caso contrário, no mês seguinte.
- Parcelas: cada parcela é gravada com a data da compra + (k − 1) meses, então cai naturalmente em faturas consecutivas.
- Cada fatura traz: `ciclo` (AAAA-MM do fechamento), `mes_referencia` (AAAA-MM do **vencimento**, como na Tabela 10.3 do enunciado), `status` (`aberta`, `fechada` ou `futura`), `fechamento`, `vencimento`, `total`, `limite`, `limite_utilizado`, `limite_disponivel` e a lista `lancamentos` (com `parcela` no formato `3/10`).
- `limite_utilizado` = soma das compras e parcelas do cartão cuja fatura **ainda não venceu** (compromete o limite mesmo as parcelas de faturas futuras).
- As regras de datas ficam em `src/models/Fatura.js` (funções puras, sem acesso ao banco).

A previsão usa somente lançamentos existentes. Não prevê compras futuras ainda não cadastradas, juros, multas ou encargos.

## Observações

- Todas as consultas e alterações de lançamentos são limitadas ao usuário autenticado.
- O servidor monta as rotas de relatório em `/api/relatorios`.
- O código usa `crypto.randomUUID()` nativo do Node.js para identificar grupos de parcelamento; não requer instalar o pacote `uuid`.
