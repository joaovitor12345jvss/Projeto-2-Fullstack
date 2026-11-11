import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Usuario } from '../models/Usuario.js';
import { Categoria } from '../models/Categoria.js';

const router = Router();

// Rota de Cadastro (RF1)
router.post('/cadastro', async (req, res, next) => {
  const { nome, email, cpf, senha } = req.body;

  // Validação básica
  if (!nome || !email || !cpf || !senha) {
    return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
  }

  try {
    // Hash da senha com salt
    const senhaHash = await bcrypt.hash(senha, 10);
    
    // Normalização antes de gravar
    const usuario = await Usuario.criar({
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      cpf: cpf.replace(/\D/g, ''),
      senhaHash
    });

    // Cria as categorias e fontes padrão (RF1)
    await Categoria.criarPadrao(usuario.id);

    return res.status(201).json({ 
      id: usuario.id, 
      nome: usuario.nome, 
      email: usuario.email 
    });
  } catch (erro) {
    // Tratamento de unicidade do banco (PostgreSQL erro 23505)
    if (erro.code === '23505') {
      const campo = erro.constraint?.includes('cpf') ? 'cpf' : 'email';
      return res.status(409).json({
        erro: 'Usuário já cadastrado.',
        campos: { [campo]: `Já existe um usuário com este ${campo === 'cpf' ? 'CPF' : 'e-mail'}.` }
      });
    }
    return next(erro);
  }
});

// Rota de Login (RF2)
router.post('/login', async (req, res, next) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
  }

  try {
    const usuario = await Usuario.buscarPorEmail(email.trim().toLowerCase());
    
    if (!usuario) {
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    }

    // Gera o token JWT
    const token = jwt.sign(
      { sub: usuario.id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    return res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      }
    });
  } catch (erro) {
    return next(erro);
  }
});

export default router;