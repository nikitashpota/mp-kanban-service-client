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
  const [search, setSearch] = usePersistentState('cards_search', '');
  const [filterType, setFilterType] = usePersistentState('cards_filterType', 'all');
  const [sortValue, setSortValue] = usePersistentState('cards_sort', 'name_asc');
  const { isAdmin } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    Promise.all([getProjects(), getProjectTypes()])
      .then(([p, t]) => { setProjects(p); setTypes(t); })
      .finally(() => setLoading(false));
  }, []);

  const visible = sortProjects(
    projects.filter(p => {
      if (filterType !== 'all' && String(p.project_type_id) !== filterType) return false;
      const q = search.toLowerCase();
      return !q || p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q) || p.gip_name?.toLowerCase().includes(q);
    }),
    sortValue
  );

  return (
    <>
      {/* Toolbar — same height/structure as KanbanPage */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Объекты проектирования</h1>
          <p className="text-sm text-gray-400 mt-0.5">{visible.length} из {projects.length} объект(ов)</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <input
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:border-[#C0392B] transition-all w-52"
            placeholder="Поиск по названию..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {/* Sort */}
          <SortSelect value={sortValue} onChange={setSortValue} />

          {/* Type filter */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:border-[#C0392B] transition-all"
          >
            <option value="all">Все типы</option>
            {types.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
          </select>

          {/* Add project */}
          {isAdmin && (
            <button onClick={() => nav('/admin/projects/new')}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#C0392B] hover:bg-[#96281B] text-white shadow-sm transition-all">
              + Добавить объект
            </button>
          )}

          {/* Switch to kanban */}
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
          <div className="text-sm mt-1">Измените фильтр или поисковый запрос</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {visible.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}
    </>
  );
}
