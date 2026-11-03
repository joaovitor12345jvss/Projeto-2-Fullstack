import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globais
app.use(cors()); // Permite a comunicação com o frontend
app.use(express.json()); // Permite que a API receba dados em JSON

// Rotas (serão importadas e registradas aqui)
app.get('/', (req, res) => {
  res.json({ mensagem: 'API de Controle Financeiro rodando!' });
});

// Middleware de tratamento de erros centralizado
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});