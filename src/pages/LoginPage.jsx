import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { token, user } = await login(form);
      signIn(token, user);
      nav('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка входа');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-accent-dark flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm">
          <img src="/logo.png" alt="Моспроект" className="w-full h-auto object-contain mb-1.5" />

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Логин</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition"
              placeholder="Введите логин"
              value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              autoFocus autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Пароль</label>
            <input
              type="password"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition"
              placeholder="Введите пароль"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-dark text-white font-semibold py-2.5 rounded-xl transition-colors mt-2 disabled:opacity-60"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}
