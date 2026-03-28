import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePersistentState } from '../hooks/usePersistentState';

function TypeGroup({ typeName, typeColor, projects, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const subCls = ({ isActive }) =>
    `flex items-center gap-2 pl-5 pr-3 py-1.5 text-[12px] rounded-lg mx-2 transition-all ${
      isActive ? 'text-[#C0392B] font-semibold bg-red-50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
    }`;
  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-1.5 text-[11px] font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all">
        {typeColor && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: typeColor }} />}
        <span className="flex-1 text-left truncate uppercase tracking-wide">{typeName}</span>
        <span className="text-gray-300 text-xs">{projects.length}</span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className={`transition-transform flex-shrink-0 ${open ? 'rotate-90' : ''}`}>
          <path d="M4 2.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="mb-1">
          {projects.map(p => (
            <NavLink key={p.id} to={`/projects/${p.id}`} className={subCls}>
              <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
              <span className="truncate leading-snug">{p.name}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ projects = [] }) {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = usePersistentState('sidebar_collapsed', false);

  const initials = user?.full_name
    ? user.full_name.split(' ').map(w => w[0]).slice(0, 2).join('')
    : user?.username?.[0]?.toUpperCase();

  const linkCls = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg mx-2 transition-all ${
      isActive ? 'bg-red-50 text-[#C0392B] font-semibold' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
    }`;

  const groups = [];
  const seen = new Map();
  projects.forEach(p => {
    const key = p.project_type_id || '__none__';
    if (!seen.has(key)) { seen.set(key, { typeId: p.project_type_id, typeName: p.type_name || 'Без типа', typeColor: p.type_color || null, projects: [] }); groups.push(seen.get(key)); }
    seen.get(key).projects.push(p);
  });
  groups.sort((a, b) => { if (!a.typeId && b.typeId) return 1; if (a.typeId && !b.typeId) return -1; return a.typeName.localeCompare(b.typeName, 'ru'); });

  if (collapsed) {
    return (
      <aside className="fixed top-0 left-0 bottom-0 w-12 bg-white border-r border-gray-100 flex flex-col z-50 shadow-sm items-center py-3 gap-3">
        <button onClick={() => setCollapsed(false)} className="text-gray-400 hover:text-[#C0392B] transition-colors mt-1" title="Развернуть">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M6 3l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <NavLink to="/" end title="Главная" className={({ isActive }) => `w-8 h-8 flex items-center justify-center rounded-lg transition-all ${isActive ? 'bg-red-50 text-[#C0392B]' : 'text-gray-400 hover:bg-gray-100'}`}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M3 9l7-6 7 6v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
        </NavLink>
        <NavLink to="/projects" title="Объекты" className={({ isActive }) => `w-8 h-8 flex items-center justify-center rounded-lg transition-all ${isActive ? 'bg-red-50 text-[#C0392B]' : 'text-gray-400 hover:bg-gray-100'}`}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="7" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="7" width="7" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>
        </NavLink>
        <NavLink to="/kanban" title="Канбан" className={({ isActive }) => `w-8 h-8 flex items-center justify-center rounded-lg transition-all ${isActive ? 'bg-red-50 text-[#C0392B]' : 'text-gray-400 hover:bg-gray-100'}`}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="4" height="14" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="8" y="3" width="4" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="14" y="3" width="4" height="11" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>
        </NavLink>
        <div className="mt-auto mb-2">
          <div className="w-7 h-7 rounded-full bg-[#C0392B] flex items-center justify-center text-white text-[10px] font-bold">{initials}</div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-56 bg-white border-r border-gray-100 flex flex-col z-50 shadow-sm">
      {/* Logo + collapse button */}
      <div className="p-4 border-b border-gray-100 flex items-center gap-2">
        <img src="/logo.png" alt="Логотип" className="flex-1 h-auto object-contain min-w-0" />
        <button onClick={() => setCollapsed(true)} className="flex-shrink-0 text-gray-300 hover:text-gray-600 transition-colors" title="Свернуть">
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M12 3l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3" style={{ scrollbarWidth: 'thin' }}>
        <div className="px-4 py-1 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Навигация</div>
        <NavLink to="/" end className={linkCls}>Главная</NavLink>

        <div className="px-4 py-1 mt-3 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Объекты</div>
        <NavLink to="/projects" className={linkCls}>Все объекты</NavLink>
        <NavLink to="/kanban" className={linkCls}>Сводный канбан</NavLink>

        {groups.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {groups.map(g => (
              <TypeGroup key={g.typeId || '__none__'} typeName={g.typeName} typeColor={g.typeColor}
                projects={g.projects} defaultOpen={groups.length === 1} />
            ))}
          </div>
        )}

        {isAdmin && (
          <>
            <div className="px-4 py-1 mt-3 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Администратор</div>
            <NavLink to="/admin/projects/new" className={linkCls}>Добавить объект</NavLink>
            <NavLink to="/settings" className={linkCls}>Настройки</NavLink>
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#C0392B] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{initials}</div>
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-gray-800 truncate">{user?.full_name || user?.username}</div>
            <div className="text-[11px] text-gray-400">{user?.role === 'admin' ? 'Администратор' : 'Просмотр'}</div>
          </div>
        </div>
        <button onClick={() => { signOut(); navigate('/login'); }}
          className="w-full text-[13px] text-gray-500 hover:text-[#C0392B] border border-gray-200 hover:border-[#C0392B] rounded-lg py-1.5 transition-all">
          Выйти
        </button>
      </div>
    </aside>
  );
}
