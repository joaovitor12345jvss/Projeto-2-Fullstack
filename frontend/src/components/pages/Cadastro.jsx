import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Aplica a máscara 000.000.000-00 enquanto o usuário digita
function formatarCpf(valor) {
  const n = valor.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 3) return n;
  if (n.length <= 6) return `${n.slice(0, 3)}.${n.slice(3)}`;
  if (n.length <= 9) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`;
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
}

export default function Cadastro() {
  const { cadastrar } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', email: '', cpf: '', senha: '', confirmar: '' });
  const [erro, setErro] = useState('');
  const [errosCampos, setErrosCampos] = useState({});
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function atualizar(campo, valor) {
    setForm({ ...form, [campo]: valor });
  }

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    setErrosCampos({});

    const cpfNumeros = form.cpf.replace(/\D/g, '');
    if (cpfNumeros.length !== 11) {
      setErrosCampos({ cpf: 'O CPF deve ter 11 dígitos.' });
      return;
    }
    if (form.senha.length < 6) {
      setErrosCampos({ senha: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }
    if (form.senha !== form.confirmar) {
      setErrosCampos({ confirmar: 'As senhas não coincidem.' });
      return;
    }

    setEnviando(true);
    try {
      await cadastrar({ nome: form.nome, email: form.email, cpf: cpfNumeros, senha: form.senha });
      setSucesso(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (e2) {
      // O backend devolve { erro, campos: { email|cpf: mensagem } } no 409
      if (e2.campos) setErrosCampos(e2.campos);
      setErro(e2.erro || 'Erro ao cadastrar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-side">
        <h1>Finwise</h1>
        <p>Crie sua conta e comece a organizar o seu dinheiro hoje mesmo.</p>
        <ul>
          <li>✓ Categorias e fontes já criadas para você</li>
          <li>✓ Seus dados ficam só na sua conta</li>
        </ul>
      </div>

      <div className="auth-main">
        <form onSubmit={enviar} className="card auth-card">
          <h2>Criar conta</h2>
          <p className="page-subtitle">Preencha os dados abaixo.</p>

          {erro && <div className="alert alert-error">{erro}</div>}
          {sucesso && <div className="alert alert-success">Cadastro realizado! Redirecionando para o login...</div>}

          <label className="field">
            Nome
            <input required value={form.nome} onChange={(e) => atualizar('nome', e.target.value)} />
          </label>
          <label className="field">
            E-mail
            <input type="email" required value={form.email} onChange={(e) => atualizar('email', e.target.value)} />
            {errosCampos.email && <span className="field-error">{errosCampos.email}</span>}
          </label>
          <label className="field">
            CPF
            <input
              required inputMode="numeric" maxLength={14} placeholder="000.000.000-00"
              value={form.cpf} onChange={(e) => atualizar('cpf', formatarCpf(e.target.value))}
            />
            {errosCampos.cpf && <span className="field-error">{errosCampos.cpf}</span>}
          </label>
          <label className="field">
            Senha
            <input type="password" required value={form.senha} onChange={(e) => atualizar('senha', e.target.value)} />
            {errosCampos.senha && <span className="field-error">{errosCampos.senha}</span>}
          </label>
          <label className="field">
            Confirmar senha
            <input type="password" required value={form.confirmar} onChange={(e) => atualizar('confirmar', e.target.value)} />
            {errosCampos.confirmar && <span className="field-error">{errosCampos.confirmar}</span>}
          </label>

          <button type="submit" className="btn btn-block" disabled={enviando || sucesso}>
            {enviando ? 'Cadastrando...' : 'Cadastrar'}
          </button>

          <p className="auth-footer">
            Já tem conta? <Link to="/login">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
