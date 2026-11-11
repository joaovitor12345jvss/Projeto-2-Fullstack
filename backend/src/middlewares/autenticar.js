import jwt from 'jsonwebtoken';
import 'dotenv/config';

export function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;
  const [esquema, token] = (authHeader ?? '').split(' ');

  if (esquema !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Token não informado.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuarioId = payload.sub; // Disponibiliza o id do usuário para as próximas rotas
    return next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}