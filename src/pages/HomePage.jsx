import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAnalytics, getProjectTypes } from '../api/client';
import { usePersistentState } from '../hooks/usePersistentState';

// ── Icons ─────────────────────────────────────────────────────
const IconDone = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="10" fill="#16a34a"/>
    <path d="M6 11l3.5 3.5L16 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconCorrect = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="10" fill="#2563eb"/>
    <path d="M11 6.5v5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="11" cy="14.5" r="1.2" fill="#fff"/>
  </svg>
);
const IconNone = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="10" fill="#dc2626"/>
    <path d="M7 7l8 8M15 7l-8 8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconProgress = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="10" stroke="#9ca3af" strokeWidth="2" strokeDasharray="16 6" strokeLinecap="round"/>
    <circle cx="11" cy="11" r="3.5" fill="#9ca3af" opacity="0.4"/>
    <circle cx="11" cy="11" r="1.5" fill="#9ca3af"/>
  </svg>
);
const IconProblem = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="10" fill="#f97316"/>
    <path d="M11 6.5v5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="11" cy="14.5" r="1.2" fill="#fff"/>
  </svg>
);
const IconExpertise = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <rect x="2" y="4" width="18" height="14" rx="2.5" fill="#7c3aed" opacity="0.15"/>
    <rect x="2" y="4" width="18" height="14" rx="2.5" stroke="#7c3aed" strokeWidth="1.5"/>
    <path d="M6 9h10M6 12.5h6" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="16.5" cy="12.5" r="2" fill="#7c3aed"/>
    <path d="M15.5 12.5l.7.7 1.3-1.3" stroke="#fff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ── Clickable stat number → kanban drill-down ─────────────────
function DrillNumber({ count, category, ids, onDrill, size = 'lg', color = 'text-green-600' }) {
  const hasIds = ids && ids[category] && ids[category].length > 0;
  const base = `font-black leading-none ${color}`;
  const sizeMap = { xl: 'text-5xl', lg: 'text-4xl', md: 'text-2xl', sm: 'text-xl' };

  if (!hasIds || count === 0) {
    return <span className={`${base} ${sizeMap[size] || 'text-4xl'}`}>{count}</span>;
  }

  return (
    <button
      onClick={() => onDrill(category)}
      className={`${base} ${sizeMap[size] || 'text-4xl'} hover:opacity-70 transition-opacity cursor-pointer underline underline-offset-2 decoration-dotted`}
      title="Открыть в канбане"
    >
      {count}
    </button>
  );
}

// ── Stat row ──────────────────────────────────────────────────
function StatRow({ icon, count, category, ids, label, color, onDrill, highlight }) {
  return (
    <div className={`flex items-center gap-2.5 py-2 px-3 rounded-xl ${highlight ? 'bg-red-100 border border-red-200' : 'bg-white/60'}`}>
      <div className="flex-shrink-0">{icon}</div>
      <DrillNumber count={count} category={category} ids={ids} onDrill={onDrill} size="sm" color={color} />
      <span className="text-xs text-gray-500 leading-snug flex-1">{label}</span>
      {highlight && <span className="text-[10px] text-red-500 font-bold">⚠</span>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function HomePage() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState([]);
  const [typeFilter, setTypeFilter] = usePersistentState('home_typeFilter', 'all');

  useEffect(() => { getProjectTypes().then(setTypes).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    getAnalytics(typeFilter !== 'all' ? typeFilter : null)
      .then(setData).finally(() => setLoading(false));
  }, [typeFilter]);

  // Navigate to kanban with project IDs filter
  const drillToKanban = (category) => {
    if (!data?.ids?.[category]?.length) return;
    // Store filter in localStorage — KanbanPage reads it on mount
    localStorage.setItem('kanban_dash_filter', JSON.stringify({
      category,
      ids: data.ids[category],
      label: CATEGORY_LABELS[category] || category,
      typeFilter,
    }));
    nav('/kanban');
  };

  const selectedType = types.find(t => String(t.id) === typeFilter);
  const d = data || {};
  const ids = d.ids || {};

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900 leading-tight">
            Объекты в проектировании АО «Моспроект»
          </h1>
          {selectedType && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-semibold text-white px-2.5 py-1 rounded-full"
                style={{ background: selectedType.color || '#6b7280' }}>
                {selectedType.name}
              </span>
              <button onClick={() => setTypeFilter('all')}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
                × сбросить
              </button>
            </div>
          )}
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:border-[#C0392B] transition-all">
          <option value="all">Все типы объектов</option>
          {types.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-[3px] border-gray-200 border-t-[#C0392B] animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 2fr 2fr', gridTemplateRows: 'auto auto' }}>

            {/* ── Всего (row-span-2) ── */}
            <div className="row-span-2 bg-gray-100 rounded-2xl p-6 flex flex-col items-center justify-center gap-1 relative overflow-hidden">
              <svg width="110" height="90" viewBox="0 0 110 90" className="absolute bottom-0 left-1/2 -translate-x-1/2 opacity-[0.08]" fill="none">
                <rect x="5" y="15" width="40" height="70" rx="2" fill="#374151"/>
                <rect x="50" y="28" width="55" height="57" rx="2" fill="#374151"/>
                <rect x="12" y="23" width="8" height="8" rx="1" fill="white"/>
                <rect x="24" y="23" width="8" height="8" rx="1" fill="white"/>
                <rect x="12" y="36" width="8" height="8" rx="1" fill="white"/>
                <rect x="24" y="36" width="8" height="8" rx="1" fill="white"/>
                <rect x="12" y="49" width="8" height="8" rx="1" fill="white"/>
                <rect x="24" y="49" width="8" height="8" rx="1" fill="white"/>
                <rect x="58" y="38" width="8" height="8" rx="1" fill="white"/>
                <rect x="70" y="38" width="8" height="8" rx="1" fill="white"/>
                <rect x="58" y="51" width="8" height="8" rx="1" fill="white"/>
                <rect x="70" y="51" width="8" height="8" rx="1" fill="white"/>
              </svg>
              <span className="text-sm font-semibold text-gray-500 z-10">Всего</span>
              <span className="text-7xl font-black text-green-600 z-10 leading-none">{d.total ?? '—'}</span>
              <span className="text-sm font-semibold text-gray-500 z-10">объектов</span>
              <button onClick={() => nav('/projects')}
                className="mt-4 text-xs text-gray-400 hover:text-[#C0392B] transition-colors z-10 underline underline-offset-2">
                Все объекты →
              </button>
            </div>

            {/* ── ТхЗ представлено ── */}
            <div className="bg-gray-100 rounded-2xl p-5">
              <div className="mb-3">
                <DrillNumber count={d.thz?.presented ?? 0} category="thz_presented" ids={ids} onDrill={drillToKanban} size="xl" color="text-green-600" />
                <div className="text-sm font-semibold text-gray-500 mt-1">ТхЗ представлено</div>
              </div>
              <div className="space-y-2">
                <StatRow icon={<IconDone />} count={d.thz?.done ?? 0} category="thz_done" ids={ids} label="ТхЗ утверждено" color="text-green-700" onDrill={drillToKanban} />
                <StatRow icon={<IconCorrect />} count={d.thz?.needs_correction ?? 0} category="thz_needs_correction" ids={ids} label="требуется корректировка ТхЗ" color="text-blue-700" onDrill={drillToKanban} />
              </div>
            </div>

            {/* ── АПР ── */}
            <div className="bg-gray-100 rounded-2xl p-5">
              <div className="mb-3">
                <DrillNumber count={d.apr?.total ?? 0} category="apr_total" ids={ids} onDrill={drillToKanban} size="xl" color="text-green-600" />
                <div className="text-sm font-semibold text-gray-500 mt-1">Разработано АПР</div>
              </div>
              <div className="space-y-2">
                <StatRow icon={<IconDone />} count={d.apr?.done ?? 0} category="apr_done" ids={ids} label="утверждено Заказчиками" color="text-green-700" onDrill={drillToKanban} />
                <StatRow icon={<IconDone />} count={d.apr?.on_approval ?? 0} category="apr_on_approval" ids={ids} label="на согласовании у Заказчика" color="text-green-700" onDrill={drillToKanban} />
                <StatRow icon={<IconProgress />} count={d.apr?.in_progress ?? 0} category="apr_in_progress" ids={ids} label="в работе" color="text-gray-500" onDrill={drillToKanban} />
              </div>
            </div>

            {/* ── ТхЗ проблемы ── */}
            <div className="bg-gray-100 rounded-2xl p-5 flex flex-col justify-center gap-2">
              <StatRow icon={<IconNone />} count={d.thz?.not_provided ?? 0} category="thz_not_provided" ids={ids} label="отсутствует ТхЗ" color="text-red-600" onDrill={drillToKanban} />
              <StatRow icon={<IconNone />} count={d.terminated ?? 0} category="terminated" ids={ids} label="Расторжение договора" color="text-red-600" onDrill={drillToKanban} />
            </div>

            {/* ── МГЭ / экспертиза ── */}
            <div className={`rounded-2xl p-5 ${d.mge?.problem > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-gray-100'}`}>
              <div className="flex items-start gap-4">
                <IconExpertise size={36} />
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3 flex-wrap">
                    {/* В экспертизе */}
                    <div className="text-center">
                      <DrillNumber count={d.mge?.in_progress ?? 0} category="mge_in_progress" ids={ids} onDrill={drillToKanban} size="xl" color="text-purple-700" />
                      <div className="text-[11px] text-gray-500 mt-0.5">в экспертизе</div>
                    </div>
                    <div className="text-gray-300 text-xl">·</div>
                    {/* Прошли */}
                    <div className="text-center">
                      <DrillNumber count={d.mge?.done ?? 0} category="mge_done" ids={ids} onDrill={drillToKanban} size="xl" color="text-green-600" />
                      <div className="text-[11px] text-gray-500 mt-0.5">прошли МГЭ</div>
                    </div>
                    {d.mge?.problem > 0 && (
                      <>
                        <div className="text-gray-300 text-xl">·</div>
                        <div className="text-center">
                          <DrillNumber count={d.mge.problem} category="mge_problem" ids={ids} onDrill={drillToKanban} size="xl" color="text-orange-600" />
                          <div className="text-[11px] text-orange-500 font-semibold mt-0.5">⚠ проблема МГЭ</div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 leading-snug">
                    Загрузка исполнена → в экспертизе · Заключение исполнено → прошли
                    {d.mge?.problem > 0 && ' · Заключение не обеспечено → проблема'}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Quick nav */}
          <div className="grid grid-cols-3 gap-4 mt-5">
            {[
              { label: 'Карточки объектов', sub: `${d.total ?? 0} объектов`, path: '/projects', cls: 'bg-blue-50 border-blue-100 hover:border-blue-300' },
              { label: 'Сводный канбан', sub: 'Статусы по этапам', path: '/kanban', cls: 'bg-amber-50 border-amber-100 hover:border-amber-300' },
              { label: 'Проблемные объекты', sub: `${(d.thz?.not_provided ?? 0) + (d.terminated ?? 0) + (d.mge?.problem ?? 0)} требуют внимания`, path: '/kanban', cls: 'bg-red-50 border-red-100 hover:border-red-300' },
            ].map(item => (
              <button key={item.label} onClick={() => nav(item.path)}
                className={`${item.cls} border rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm`}>
                <div className="text-sm font-bold text-gray-800">{item.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.sub}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const CATEGORY_LABELS = {
  thz_done: 'ТхЗ утверждено',
  thz_needs_correction: 'Требуется корректировка ТхЗ',
  thz_not_provided: 'Отсутствует ТхЗ',
  thz_in_progress: 'ТхЗ в работе',
  thz_presented: 'ТхЗ представлено',
  apr_done: 'АПР утверждено Заказчиком',
  apr_on_approval: 'АПР на согласовании',
  apr_in_progress: 'АПР в работе',
  apr_total: 'Разработано АПР',
  mge_in_progress: 'В экспертизе МГЭ',
  mge_done: 'Прошли МГЭ',
  mge_problem: 'Проблема МГЭ (не обеспечено)',
  terminated: 'Расторжение договора',
};
