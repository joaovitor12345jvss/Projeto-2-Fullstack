import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const estilos = {
  fundo: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f4f5', padding: '1rem', boxSizing: 'border-box' },
  card: { width: '100%', maxWidth: 420, background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '2rem', textAlign: 'left', color: '#222', boxSizing: 'border-box' },
  titulo: { color: '#222', fontSize: '1.8rem', margin: '0 0 1.5rem', textAlign: 'center' },
  campo: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.9rem', marginBottom: '1rem' },
  input: { padding: '10px', border: '1px solid #bbb', borderRadius: 4, background: '#fff', color: '#222', fontSize: '1rem' },
  botao: { width: '100%', padding: '10px', border: 'none', borderRadius: 4, background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: '1rem' },
  erro: { background: '#fdecea', color: '#b71c1c', padding: '8px 12px', borderRadius: 4, marginBottom: '1rem', fontSize: '0.9rem' },
  erroCampo: { color: '#b71c1c', fontSize: '0.8rem' },
  ok: { background: '#e8f5e9', color: '#1b5e20', padding: '8px 12px', borderRadius: 4, marginBottom: '1rem', fontSize: '0.9rem' },
  rodape: { marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem', color: '#444' }
};

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
    <div style={estilos.fundo}>
      <form onSubmit={enviar} style={estilos.card}>
        <h1 style={estilos.titulo}>Criar conta</h1>

        {erro && <div style={estilos.erro}>{erro}</div>}
        {sucesso && <div style={estilos.ok}>Cadastro realizado! Redirecionando para o login...</div>}

        <label style={estilos.campo}>
          Nome
          <input style={estilos.input} required value={form.nome} onChange={(e) => atualizar('nome', e.target.value)} />
        </label>
        <label style={estilos.campo}>
          E-mail
          <input style={estilos.input} type="email" required value={form.email} onChange={(e) => atualizar('email', e.target.value)} />
          {errosCampos.email && <span style={estilos.erroCampo}>{errosCampos.email}</span>}
        </label>
        <label style={estilos.campo}>
          CPF
          <input style={estilos.input} required placeholder="000.000.000-00" value={form.cpf} onChange={(e) => atualizar('cpf', e.target.value)} />
          {errosCampos.cpf && <span style={estilos.erroCampo}>{errosCampos.cpf}</span>}
        </label>
        <label style={estilos.campo}>
          Senha
          <input style={estilos.input} type="password" required value={form.senha} onChange={(e) => atualizar('senha', e.target.value)} />
          {errosCampos.senha && <span style={estilos.erroCampo}>{errosCampos.senha}</span>}
        </label>
        <label style={estilos.campo}>
          Confirmar senha
          <input style={estilos.input} type="password" required value={form.confirmar} onChange={(e) => atualizar('confirmar', e.target.value)} />
          {errosCampos.confirmar && <span style={estilos.erroCampo}>{errosCampos.confirmar}</span>}
        </label>

        <button type="submit" style={estilos.botao} disabled={enviando || sucesso}>
          {enviando ? 'Cadastrando...' : 'Cadastrar'}
        </button>

        <p style={estilos.rodape}>
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </form>
    </div>
  );
}
