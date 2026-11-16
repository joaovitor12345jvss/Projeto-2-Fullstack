-- Senha de teste para os dois usuários: 'Senha123' (já em formato hash bcrypt)
INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES
('João Silva', 'joao@email.com', '11111111111', '$2b$10$Q8T5N...hash_ficticio...'),
('Maria Souza', 'maria@email.com', '22222222222', '$2b$10$Q8T5N...hash_ficticio...');

-- Categorias para o usuário 1
INSERT INTO categorias (usuario_id, nome, tipo) VALUES
(1, 'Salário', 'entrada'),
(1, 'Alimentação', 'saida'),
(1, 'Lazer', 'saida');

-- Fontes/Destinos para o usuário 1
INSERT INTO fontes_destinos (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite) VALUES
(1, 'Conta Corrente', 'conta', NULL, NULL, NULL),
(1, 'Cartão Nubank', 'cartao_credito', 3, 10, 2000.00);

-- Lançamentos para o usuário 1 distribuídos em 3 meses (Exigência da apresentação)
INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id) VALUES
-- Mês 1
(1, 'entrada', 'Salário de Outubro', 3000.00, '2026-10-05', 1, 1),
(1, 'saida', 'Mercado', 450.50, '2026-10-12', 2, 2),
-- Mês 2
(1, 'entrada', 'Salário de Novembro', 3000.00, '2026-11-05', 1, 1),
(1, 'saida', 'Restaurante', 120.00, '2026-11-15', 3, 2),
-- Mês 3
(1, 'entrada', 'Salário de Dezembro', 3000.00, '2026-12-05', 1, 1),
(1, 'saida', 'Presente de natal', 600.00, '2026-12-20', 2, 2);