# Projeto 2 — Controle Financeiro Full Stack

Aplicação de controle financeiro pessoal desenvolvida com React, Vite, Node.js, Express e PostgreSQL.

## Estrutura
- `backend/`: API REST, autenticação JWT e acesso ao PostgreSQL.
- `frontend/`: interface React.

## Pré-requisitos
- Node.js 20.19+ ou 22.12+
- PostgreSQL
- npm

## Configuração do banco
1. Crie um banco PostgreSQL, por exemplo `projeto2`.
2. Execute `backend/database/schema.sql` nesse banco.
3. Copie `backend/.env.example` para `backend/.env`.
4. Preencha `DATABASE_URL`, `JWT_SECRET` e `PORT`.

Exemplo de `DATABASE_URL`:
`postgresql://postgres:SENHA@localhost:5432/projeto2`

Gere uma chave JWT segura com:
`node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

## Executar backend
```bash
cd backend
npm install
npm run dev
```
O servidor usa a porta 3000 por padrão. `npm run dev` executa `node src/server.js`, portanto **não depende do nodemon**.

Se quiser reinício automático ao salvar arquivos, instale o nodemon só na sua máquina (dentro da pasta `backend`) e rode com ele:
```bash
npm install -D nodemon
npx nodemon src/server.js
```
Sem o nodemon, use `npm run dev` ou `node src/server.js`.

## Executar frontend
Em outro terminal:
```bash
cd frontend
npm install
npm run dev
```
O Vite informa o endereço local (normalmente http://localhost:5173).

A API do frontend está configurada em `frontend/src/services/api.js` para `http://localhost:3000/api`.

## Autenticação
Cadastre um usuário pela tela de cadastro e depois entre pela tela de login. As rotas de categorias, fontes/destinos, lançamentos e relatórios exigem JWT.

## Endpoints principais
- `POST /api/auth/cadastro`, `POST /api/auth/login`
- `/api/categorias`
- `/api/fontes-destinos`
- `/api/lancamentos` (CRUD, filtros e paginação)
- `GET /api/relatorios/categorias` (RF7)
- `GET /api/relatorios/fontes-destinos` (RF8)
- `GET /api/relatorios/faturas` (RF9)

## Observações
- As regras puras de fechamento/vencimento de faturas (RF9) ficam em `backend/src/models/Fatura.js`, junto com as regras de negócio, conforme permitido no enunciado (seção 10.9).
- Não versione o arquivo `.env`; use `.env.example` como modelo.
- O relatório de faturas é uma previsão baseada nos lançamentos já cadastrados, não consulta operadoras de cartão.
- Para demonstração, cadastre usuários e dados pela própria aplicação. O `seed.sql` fornecido originalmente contém hashes fictícios e não deve ser usado para autenticação sem substituí-los por hashes bcrypt válidos.
