import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects, getProjectTypes } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ProjectCard from '../components/ProjectCard';
import { usePersistentState } from '../hooks/usePersistentState';
import { SortSelect, sortProjects } from '../components/SortSelect';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = usePersistentState('cards_filterType', '');
  const [sortValue, setSortValue] = usePersistentState('cards_sort', 'name_asc');
  const { isAdmin, canApprove } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    Promise.all([getProjects(), getProjectTypes()])
      .then(([p, t]) => {
        setProjects(p);
        setTypes(t);
        // Auto-select first type, or reset if saved filterType no longer exists
        setFilterType(prev => {
          if (!prev && t.length > 0) return String(t[0].id);
          if (prev && !t.find(x => String(x.id) === prev) && t.length > 0) return String(t[0].id);
          return prev;
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const visible = sortProjects(
    projects.filter(p => {
      if (filterType && String(p.project_type_id) !== filterType) return false;
      const q = search.toLowerCase();
      return !q || p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q) || p.gip_name?.toLowerCase().includes(q);
    }),
    sortValue
  );

  return (
    <>
      {/* ── TYPE TABS — визуально обособлены сверху ── */}
      {types.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            {types.map(t => (
              <button key={t.id} onClick={() => setFilterType(String(t.id))}
                className={`px-5 py-2 text-sm font-bold rounded-xl border-2 transition-all ${
                  filterType === String(t.id) ? 'text-white shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
                style={filterType === String(t.id) ? { background: t.color, borderColor: t.color } : {}}>
                {t.name}
              </button>
            ))}
          </div>
          <div className="mt-3 border-b border-gray-200" />
        </div>
      )}

      {/* ── TOOLBAR ── */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <p className="text-sm text-gray-400">{visible.length} из {projects.length} объект(ов)</p>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:border-[#C0392B] transition-all w-52"
            placeholder="Поиск по названию..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <SortSelect value={sortValue} onChange={setSortValue} />
          {canEdit && (
            <button onClick={() => nav('/admin/projects/new')}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#C0392B] hover:bg-[#96281B] text-white shadow-sm transition-all">
              + Добавить
            </button>
          )}
          <button onClick={() => nav('/kanban')}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-all">
            📋 Канбан
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-[3px] border-gray-200 border-t-[#C0392B] rounded-full animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-3">🏗</div>
          <div className="font-medium">Объекты не найдены</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {visible.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}
    </>
  );
}
