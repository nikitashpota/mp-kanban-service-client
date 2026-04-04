import { useState, useEffect } from 'react';
import {
  getProjectTypes, createProjectType, updateProjectType, deleteProjectType,
  getUsers, createUser, deleteUser,
} from '../api/client';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const inputCls = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#C0392B] focus:ring-2 focus:ring-red-100 transition bg-white';
function Field({ label, children }) {
  return <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</label>{children}</div>;
}

const ROLES = [
  { key: 'admin',  label: 'Администратор', color: 'bg-red-100 text-red-700',    desc: 'Полный доступ' },
  { key: 'pm',     label: 'РП',            color: 'bg-blue-100 text-blue-700',   desc: 'Канбан + Ход проектирования' },
  { key: 'gip',    label: 'ГИП',           color: 'bg-green-100 text-green-700', desc: 'Только Ход проектирования' },
  { key: 'viewer', label: 'Наблюдатель',   color: 'bg-gray-100 text-gray-600',   desc: 'Только просмотр' },
];

function RoleBadge({ role }) {
  const r = ROLES.find(x => x.key === role) || ROLES[3];
  return <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${r.color}`}>{r.label}</span>;
}

function TypesTab() {
  const [types, setTypes] = useState([]);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', color: '#6b7280', kanban_type: 'administrative' });
  const [msg, setMsg] = useState(null);
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000); };
  const load = () => getProjectTypes().then(setTypes).catch(() => {});
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setForm({ name: '', color: '#6b7280', kanban_type: 'administrative' }); };
  const openEdit = t => { setEditId(t.id); setForm({ name: t.name, color: t.color || '#6b7280', kanban_type: t.kanban_type || 'administrative' }); };

  const save = async () => {
    if (!form.name.trim()) { flash('Введите название', 'error'); return; }
    try {
      if (editId) await updateProjectType(editId, form);
      else await createProjectType(form);
      flash(editId ? 'Тип обновлён' : 'Тип создан');
      setEditId(null);
      setForm({ name: '', color: '#6b7280', kanban_type: 'administrative' });
      load();
    } catch { flash('Ошибка', 'error'); }
  };

  const del = async id => {
    if (!confirm('Удалить тип?')) return;
    try { await deleteProjectType(id); flash('Удалено'); load(); }
    catch { flash('Ошибка', 'error'); }
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4">{editId ? 'Редактировать тип' : 'Добавить тип'}</h3>
        {msg && <div className={`mb-3 text-xs px-3 py-2 rounded-xl border ${msg.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{msg.text}</div>}
        <div className="space-y-4">
          <Field label="Название">
            <input className={inputCls} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Напр. Жилой дом" />
          </Field>
          <Field label="Цвет">
            <div className="flex items-center gap-3">
              <input type="color" className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 flex-shrink-0"
                value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} />
              <span className="text-sm text-gray-500">{form.color}</span>
            </div>
          </Field>
          <Field label="Структура канбана">
            <select className={inputCls} value={form.kanban_type} onChange={e => setForm(p => ({ ...p, kanban_type: e.target.value }))}>
              <option value="administrative">Административный (по умолчанию)</option>
              <option value="residential">Жильё (реновация)</option>
            </select>
          </Field>
          <div className="flex gap-2 pt-2">
            {editId && <button onClick={openNew} className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 transition-all">Отмена</button>}
            <button onClick={save} className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#C0392B] hover:bg-[#96281B] text-white shadow-sm transition-all">
              {editId ? 'Сохранить' : '+ Добавить'}
            </button>
          </div>
        </div>
      </div>

      <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-800">
          Типы объектов <span className="text-gray-400 font-normal ml-1">({types.length})</span>
        </div>
        {types.length === 0 ? (
          <div className="py-12 text-center text-gray-400"><div className="text-3xl mb-2">🏷</div><div className="text-sm">Типы не добавлены</div></div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>{['Цвет', 'Название', 'Канбан', 'Действия'].map(h => (
                <th key={h} className="px-4 py-2.5 text-[11px] font-semibold text-gray-400 bg-gray-50 border-b border-gray-100 text-left uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {types.map(t => (
                <tr key={t.id} className={`hover:bg-gray-50/50 ${editId === t.id ? 'bg-blue-50/30' : ''}`}>
                  <td className="px-4 py-3"><div className="w-5 h-5 rounded-full" style={{ background: t.color || '#6b7280' }} /></td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{t.name}</td>
                  <td className="px-4 py-3">
                    {t.kanban_type === 'residential'
                      ? <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">Жильё</span>
                      : <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">Административный</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(t)} className="text-xs px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-all font-semibold">Изменить</button>
                      <button onClick={() => del(t.id)} className="text-xs px-3 py-1.5 rounded-xl bg-white border border-red-200 hover:bg-red-50 text-red-600 transition-all font-semibold">Удалить</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'viewer' });
  const [editId, setEditId] = useState(null);
  const [editRole, setEditRole] = useState('viewer');
  const [editPwd, setEditPwd] = useState('');
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const { user: me } = useAuth();

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000); };
  const load = () => getUsers().then(setUsers).catch(() => {});
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.username || !form.password) { flash('Заполните логин и пароль', 'error'); return; }
    setSaving(true);
    try {
      await createUser(form);
      flash('Пользователь создан');
      setModal(false);
      setForm({ username: '', password: '', full_name: '', role: 'viewer' });
      load();
    } catch (err) { flash(err.response?.data?.error || 'Ошибка', 'error'); }
    finally { setSaving(false); }
  };

  const saveEdit = async (id) => {
    setSaving(true);
    try {
      await api.patch(`/users/${id}`, { role: editRole, ...(editPwd ? { password: editPwd } : {}) });
      setEditId(null); setEditPwd('');
      flash('Сохранено');
      load();
    } catch { flash('Ошибка', 'error'); }
    finally { setSaving(false); }
  };

  const del = async id => {
    if (!confirm('Удалить пользователя?')) return;
    try { await deleteUser(id); flash('Удалено'); load(); }
    catch { flash('Ошибка', 'error'); }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        {ROLES.map(r => (
          <div key={r.key} className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-100 rounded-xl shadow-sm">
            <RoleBadge role={r.key} />
            <span className="text-xs text-gray-500">{r.desc}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-800">Пользователи <span className="text-gray-400 font-normal ml-1">({users.length})</span></span>
          <button onClick={() => setModal(true)} className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#C0392B] hover:bg-[#96281B] text-white shadow-sm transition-all">+ Добавить</button>
        </div>

        {msg && <div className={`mx-5 mt-3 text-xs px-3 py-2 rounded-xl border ${msg.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{msg.text}</div>}

        <table className="w-full border-collapse">
          <thead>
            <tr>{['Логин', 'Полное имя', 'Роль', 'Дата создания', ''].map(h => (
              <th key={h} className="px-5 py-3 text-[11px] font-semibold text-gray-400 bg-gray-50 border-b border-gray-100 text-left uppercase tracking-wide">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50/50">
                <td className="px-5 py-3.5 font-medium text-gray-900 text-sm">{u.username}</td>
                <td className="px-5 py-3.5 text-gray-600 text-sm">{u.full_name || '—'}</td>
                <td className="px-5 py-3.5">
                  {editId === u.id ? (
                    <div className="flex items-center gap-2">
                      <select value={editRole} onChange={e => setEditRole(e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-[#C0392B]">
                        {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                      </select>
                      <input type="password" placeholder="Новый пароль" value={editPwd}
                        onChange={e => setEditPwd(e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 w-28 focus:outline-none focus:border-[#C0392B]" />
                      <button onClick={() => saveEdit(u.id)} disabled={saving}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#C0392B] text-white hover:bg-[#a93226] disabled:opacity-50">Сохранить</button>
                      <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:text-gray-600">Отмена</button>
                    </div>
                  ) : (
                    <RoleBadge role={u.role} />
                  )}
                </td>
                <td className="px-5 py-3.5 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString('ru-RU')}</td>
                <td className="px-5 py-3.5">
                  {u.id !== me?.id && editId !== u.id && (
                    <div className="flex gap-2">
                      <button onClick={() => { setEditId(u.id); setEditRole(u.role || 'viewer'); setEditPwd(''); }}
                        className="text-xs px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold transition-all">Роль</button>
                      <button onClick={() => del(u.id)}
                        className="text-xs px-3 py-1.5 rounded-xl bg-white border border-red-200 hover:bg-red-50 text-red-600 font-semibold transition-all">Удалить</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Новый пользователь</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <Field label="Логин *"><input className={inputCls} value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} autoFocus /></Field>
              <Field label="Пароль *"><input type="password" className={inputCls} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} /></Field>
              <Field label="Полное имя"><input className={inputCls} value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} /></Field>
              <Field label="Роль">
                <select className={inputCls} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r.key} value={r.key}>{r.label} — {r.desc}</option>)}
                </select>
              </Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setModal(false)} className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50">Отмена</button>
              <button onClick={save} disabled={saving} className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#C0392B] hover:bg-[#96281B] text-white shadow-sm disabled:opacity-50">Создать</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState('types');

  useEffect(() => { if (isAdmin === false) nav('/'); }, [isAdmin, nav]);

  const tabs = [{ id: 'types', label: 'Типы объектов' }, { id: 'users', label: 'Пользователи' }];

  return (
    <div>
      <h1 className="text-lg font-bold text-gray-900 mb-5">Настройки</h1>
      <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all ${tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'types' && <TypesTab />}
      {tab === 'users' && <UsersTab />}
    </div>
  );
}
