// Patch to add to existing SettingsPage — Users tab with roles
// Replace the users section in SettingsPage with this component

import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001/api';

const ROLES = [
  { key: 'admin',  label: 'Администратор', color: 'bg-red-100 text-red-700',     desc: 'Полный доступ' },
  { key: 'pm',     label: 'РП',            color: 'bg-blue-100 text-blue-700',    desc: 'Канбан + Ход проектирования' },
  { key: 'gip',    label: 'ГИП',           color: 'bg-green-100 text-green-700',  desc: 'Только Ход проектирования' },
  { key: 'viewer', label: 'Наблюдатель',   color: 'bg-gray-100 text-gray-600',    desc: 'Только просмотр' },
];

export function RoleBadge({ role }) {
  const r = ROLES.find(x => x.key === role) || ROLES[3];
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.color}`}>{r.label}</span>;
}

export function UsersWithRoles() {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'viewer' });
  const [editId, setEditId] = useState(null);
  const [editRole, setEditRole] = useState('viewer');
  const [editPwd, setEditPwd] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try { const { data } = await axios.get(`${API}/users`); setUsers(data); } catch {}
  };
  useEffect(() => { load(); }, []);

  const createUser = async () => {
    if (!newUser.username || !newUser.password) return setError('Заполните имя и пароль');
    setSaving(true); setError('');
    try {
      await axios.post(`${API}/users`, newUser);
      setNewUser({ username: '', password: '', role: 'viewer' });
      await load();
    } catch (e) { setError(e.response?.data?.error || 'Ошибка'); }
    finally { setSaving(false); }
  };

  const saveEdit = async (id) => {
    setSaving(true);
    try {
      await axios.patch(`${API}/users/${id}`, { role: editRole, ...(editPwd ? { password: editPwd } : {}) });
      setEditId(null); setEditPwd('');
      await load();
    } finally { setSaving(false); }
  };

  const deleteUser = async (id) => {
    if (!confirm('Удалить пользователя?')) return;
    await axios.delete(`${API}/users/${id}`);
    await load();
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {ROLES.map(r => (
          <div key={r.key} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.color}`}>{r.label}</span>
            <span className="text-xs text-gray-500">{r.desc}</span>
          </div>
        ))}
      </div>

      {/* User list */}
      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-800">{u.username}</div>
            </div>
            {editId === u.id ? (
              <div className="flex items-center gap-2">
                <select value={editRole} onChange={e => setEditRole(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-[#C0392B]">
                  {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
                <input type="password" placeholder="Новый пароль (необяз.)" value={editPwd}
                  onChange={e => setEditPwd(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 w-36 focus:outline-none focus:border-[#C0392B]" />
                <button onClick={() => saveEdit(u.id)} disabled={saving}
                  className="text-xs font-semibold px-3 py-1 bg-[#C0392B] text-white rounded-lg hover:bg-[#a93226] disabled:opacity-50">
                  Сохранить
                </button>
                <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:text-gray-600">Отмена</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <RoleBadge role={u.role} />
                <button onClick={() => { setEditId(u.id); setEditRole(u.role || 'viewer'); setEditPwd(''); }}
                  className="text-xs text-gray-400 hover:text-[#C0392B] transition-colors">✏</button>
                <button onClick={() => deleteUser(u.id)}
                  className="text-xs text-gray-300 hover:text-red-500 transition-colors">✕</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create user */}
      <div className="border-t border-gray-100 pt-4">
        <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Добавить пользователя</div>
        <div className="flex gap-2">
          <input placeholder="Имя пользователя" value={newUser.username}
            onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))}
            className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#C0392B]" />
          <input type="password" placeholder="Пароль" value={newUser.password}
            onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
            className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#C0392B]" />
          <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
            className="text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#C0392B]">
            {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          <button onClick={createUser} disabled={saving}
            className="px-4 py-2 text-xs font-semibold bg-[#C0392B] text-white rounded-xl hover:bg-[#a93226] disabled:opacity-50">
            + Добавить
          </button>
        </div>
        {error && <div className="text-xs text-red-500 mt-2">{error}</div>}
      </div>
    </div>
  );
}
