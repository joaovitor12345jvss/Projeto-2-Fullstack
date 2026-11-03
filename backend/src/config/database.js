import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Testa a conexão ao iniciar
pool.connect((err, client, release) => {
  if (err) {
    console.error('Erro ao conectar no banco de dados:', err.stack);
  } else {
    console.log('Conectado ao PostgreSQL com sucesso!');
    release(); // Libera o cliente de volta para o pool
  }
});

export default pool;