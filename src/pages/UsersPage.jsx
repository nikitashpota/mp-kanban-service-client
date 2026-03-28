import { useState, useEffect } from 'react';
import { getUsers, createUser, deleteUser } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'viewer' });
  const [msg, setMsg] = useState(null);
  const { user: me } = useAuth();

  const load = () => getUsers().then(setUsers).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000); };

  const save = async () => {
    if (!form.username || !form.password) { flash('Заполните логин и пароль', 'error'); return; }
    try { await createUser(form); flash('Пользователь создан'); setModal(false); setForm({ username:'',password:'',full_name:'',role:'viewer' }); load(); }
    catch (err) { flash(err.response?.data?.error || 'Ошибка', 'error'); }
  };
  const del = async (id) => {
    if (!confirm('Удалить пользователя?')) return;
    try { await deleteUser(id); flash('Удалено'); load(); }
    catch (err) { flash(err.response?.data?.error || 'Ошибка', 'error'); }
  };

  const inputCls = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#C0392B] focus:ring-2 focus:ring-red-100 transition bg-white";

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-bold text-gray-900">Пользователи</h1>
        <button onClick={() => setModal(true)} className="bg-accent hover:bg-accent-dark text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          + Добавить пользователя
        </button>
      </div>

      {msg && (
        <div className={`mb-4 text-sm rounded-xl px-4 py-3 border ${msg.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gray-200 border-t-accent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-xs text-gray-400 font-semibold uppercase tracking-wide">
              <th className="px-5 py-3 text-left">Логин</th>
              <th className="px-5 py-3 text-left">Имя</th>
              <th className="px-5 py-3 text-left">Роль</th>
              <th className="px-5 py-3 text-left">Дата создания</th>
              <th className="px-5 py-3 w-16" />
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-900">{u.username}</td>
                  <td className="px-5 py-3.5 text-gray-600">{u.full_name || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${u.role === 'admin' ? 'bg-accent-light text-accent border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                      {u.role === 'admin' ? 'Администратор' : 'Просмотр'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString('ru-RU')}</td>
                  <td className="px-5 py-3.5">
                    {u.id !== me?.id && (
                      <button onClick={() => del(u.id)} className="text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">✕</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Новый пользователь</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[['Логин *', 'username', 'text', 'username'], ['Пароль *', 'password', 'password', 'new-password'], ['Полное имя', 'full_name', 'text', '']].map(([label, key, type, ac]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
                  <input className={inputCls} type={type} autoComplete={ac} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Роль</label>
                <select className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent transition bg-white" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="viewer">Просмотр</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setModal(false)} className="bg-white border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">Отмена</button>
              <button onClick={save} className="bg-accent hover:bg-accent-dark text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">Создать</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
