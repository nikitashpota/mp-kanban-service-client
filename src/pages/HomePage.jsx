import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAnalytics, getProjectTypes } from '../api/client';

// ── Icons ──────────────────────────────────────────────────────
const IconDone = () => (
  <svg width={20} height={20} viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="10" fill="#16a34a"/>
    <path d="M6 11l3.5 3.5L16 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconCorrect = () => (
  <svg width={20} height={20} viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="10" fill="#2563eb"/>
    <path d="M11 6.5v5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="11" cy="14.5" r="1.2" fill="#fff"/>
  </svg>
);
const IconNone = () => (
  <svg width={20} height={20} viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="10" fill="#dc2626"/>
    <path d="M7 7l8 8M15 7l-8 8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconProgress = () => (
  <svg width={20} height={20} viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="10" stroke="#9ca3af" strokeWidth="2" strokeDasharray="16 6" strokeLinecap="round"/>
    <circle cx="11" cy="11" r="3.5" fill="#9ca3af" opacity="0.4"/>
    <circle cx="11" cy="11" r="1.5" fill="#9ca3af"/>
  </svg>
);
const IconExpertise = () => (
  <svg width={36} height={36} viewBox="0 0 22 22" fill="none">
    <rect x="2" y="4" width="18" height="14" rx="2.5" fill="#7c3aed" opacity="0.15"/>
    <rect x="2" y="4" width="18" height="14" rx="2.5" stroke="#7c3aed" strokeWidth="1.5"/>
    <path d="M6 9h10M6 12.5h6" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="16.5" cy="12.5" r="2" fill="#7c3aed"/>
    <path d="M15.5 12.5l.7.7 1.3-1.3" stroke="#fff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ── Clickable stat number ──────────────────────────────────────
function DrillNumber({ count, category, ids, onDrill, size = 'lg', color = 'text-green-600' }) {
  const hasIds = ids?.[category]?.length > 0;
  const sizeMap = { xl: 'text-5xl', lg: 'text-4xl', md: 'text-2xl', sm: 'text-xl' };
  const cls = `font-black leading-none ${color} ${sizeMap[size] || 'text-4xl'}`;
  if (!hasIds || count === 0) return <span className={cls}>{count}</span>;
  return (
    <button onClick={() => onDrill(category)}
      className={`${cls} hover:opacity-70 transition-opacity cursor-pointer underline underline-offset-2 decoration-dotted`}
      title="Открыть в канбане">
      {count}
    </button>
  );
}

function StatRow({ icon, count, category, ids, label, color, onDrill }) {
  return (
    <div className="flex items-center gap-2.5 py-2 px-3 rounded-xl bg-white/60">
      <div className="flex-shrink-0">{icon}</div>
      <DrillNumber count={count} category={category} ids={ids} onDrill={onDrill} size="sm" color={color} />
      <span className="text-xs text-gray-500 leading-snug flex-1">{label}</span>
    </div>
  );
}

// ── Public dashboard ───────────────────────────────────────────
function PublicDashboard({ data, onDrill }) {
  const d = data || {};
  const ids = d.ids || {};
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 2fr 2fr', gridTemplateRows: 'auto auto' }}>

      {/* Всего */}
      <div className="row-span-2 bg-gray-100 rounded-2xl p-6 flex flex-col items-center justify-center gap-1 relative overflow-hidden">
        <svg width="110" height="90" viewBox="0 0 110 90" className="absolute bottom-0 left-1/2 -translate-x-1/2 opacity-[0.08]" fill="none">
          <rect x="5" y="15" width="40" height="70" rx="2" fill="#374151"/>
          <rect x="50" y="28" width="55" height="57" rx="2" fill="#374151"/>
          {[12,24].flatMap(x => [23,36,49].map(y => <rect key={`${x}${y}`} x={x} y={y} width="8" height="8" rx="1" fill="white"/>))}
          {[58,70].flatMap(x => [38,51].map(y => <rect key={`a${x}${y}`} x={x} y={y} width="8" height="8" rx="1" fill="white"/>))}
        </svg>
        <span className="text-sm font-semibold text-gray-500 z-10">Всего</span>
        <span className="text-7xl font-black text-green-600 z-10 leading-none">{d.total ?? '—'}</span>
        <span className="text-sm font-semibold text-gray-500 z-10">объектов</span>
      </div>

      {/* ТхЗ */}
      <div className="bg-gray-100 rounded-2xl p-5">
        <div className="mb-3">
          <DrillNumber count={d.thz?.presented ?? 0} category="thz_presented" ids={ids} onDrill={onDrill} size="xl" color="text-green-600" />
          <div className="text-sm font-semibold text-gray-500 mt-1">ТхЗ представлено</div>
        </div>
        <div className="space-y-2">
          <StatRow icon={<IconDone />} count={d.thz?.done ?? 0} category="thz_done" ids={ids} label="ТхЗ утверждено" color="text-green-700" onDrill={onDrill} />
          <StatRow icon={<IconCorrect />} count={d.thz?.needs_correction ?? 0} category="thz_needs_correction" ids={ids} label="требуется корректировка" color="text-blue-700" onDrill={onDrill} />
        </div>
      </div>

      {/* АПР */}
      <div className="bg-gray-100 rounded-2xl p-5">
        <div className="mb-3">
          <DrillNumber count={d.apr?.total ?? 0} category="apr_total" ids={ids} onDrill={onDrill} size="xl" color="text-green-600" />
          <div className="text-sm font-semibold text-gray-500 mt-1">Разработано АПР</div>
        </div>
        <div className="space-y-2">
          <StatRow icon={<IconDone />} count={d.apr?.done ?? 0} category="apr_done" ids={ids} label="утверждено Заказчиками" color="text-green-700" onDrill={onDrill} />
          <StatRow icon={<IconDone />} count={d.apr?.on_approval ?? 0} category="apr_on_approval" ids={ids} label="на согласовании у Заказчика" color="text-green-700" onDrill={onDrill} />
          <StatRow icon={<IconProgress />} count={d.apr?.in_progress ?? 0} category="apr_in_progress" ids={ids} label="в работе" color="text-gray-500" onDrill={onDrill} />
        </div>
      </div>

      {/* Проблемы */}
      <div className="bg-gray-100 rounded-2xl p-5 flex flex-col justify-center gap-2">
        <StatRow icon={<IconNone />} count={d.thz?.not_provided ?? 0} category="thz_not_provided" ids={ids} label="отсутствует ТхЗ" color="text-red-600" onDrill={onDrill} />
        <StatRow icon={<IconNone />} count={d.terminated ?? 0} category="terminated" ids={ids} label="Расторжение договора" color="text-red-600" onDrill={onDrill} />
      </div>

      {/* МГЭ */}
      <div className={`rounded-2xl p-5 ${d.mge?.problem > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-gray-100'}`}>
        <div className="flex items-start gap-4">
          <IconExpertise />
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3 flex-wrap">
              <div className="text-center">
                <DrillNumber count={d.mge?.in_progress ?? 0} category="mge_in_progress" ids={ids} onDrill={onDrill} size="xl" color="text-purple-700" />
                <div className="text-[11px] text-gray-500 mt-0.5">в экспертизе</div>
              </div>
              <div className="text-gray-300 text-xl">·</div>
              <div className="text-center">
                <DrillNumber count={d.mge?.done ?? 0} category="mge_done" ids={ids} onDrill={onDrill} size="xl" color="text-green-600" />
                <div className="text-[11px] text-gray-500 mt-0.5">прошли МГЭ</div>
              </div>
              {d.mge?.problem > 0 && (
                <>
                  <div className="text-gray-300 text-xl">·</div>
                  <div className="text-center">
                    <DrillNumber count={d.mge.problem} category="mge_problem" ids={ids} onDrill={onDrill} size="xl" color="text-orange-600" />
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
  );
}

// ── Residential placeholder ────────────────────────────────────
function ResidentialDashboard() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M9 21V12h6v9" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="text-center">
        <div className="text-gray-700 font-semibold text-base">Дашборд в разработке</div>
        <div className="text-gray-400 text-sm mt-1">Аналитика по объектам жилья появится в следующем обновлении</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
const CATEGORY_LABELS = {
  thz_done: 'ТхЗ утверждено', thz_needs_correction: 'Требуется корректировка ТхЗ',
  thz_not_provided: 'Отсутствует ТхЗ', thz_in_progress: 'ТхЗ в работе',
  thz_presented: 'ТхЗ представлено', apr_done: 'АПР утверждено Заказчиком',
  apr_on_approval: 'АПР на согласовании', apr_in_progress: 'АПР в работе',
  apr_total: 'Разработано АПР', mge_in_progress: 'В экспертизе МГЭ',
  mge_done: 'Прошли МГЭ', mge_problem: 'Проблема МГЭ (не обеспечено)',
  terminated: 'Расторжение договора',
};

export default function HomePage() {
  const nav = useNavigate();

  // Основная вкладка: 'public' | 'residential'
  const [tab, setTab] = useState(() => localStorage.getItem('home_tab') || 'public');
  // Подтип для публичных: null = все, иначе id типа
  const [subTypeId, setSubTypeId] = useState(null);

  const [types, setTypes] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Загружаем типы один раз
  useEffect(() => { getProjectTypes().then(setTypes).catch(() => {}); }, []);

  const publicTypes = types.filter(t => t.kanban_type === 'administrative');

  const fetchData = useCallback(() => {
    if (tab !== 'public') return;
    setLoading(true);
    getAnalytics({ kanbanType: 'administrative', typeId: subTypeId || null })
      .then(setData).finally(() => setLoading(false));
  }, [tab, subTypeId]);

  // Загружаем при изменении фильтра
  useEffect(() => { fetchData(); }, [fetchData]);

  // Перезапрашиваем при возврате на вкладку браузера
  useEffect(() => {
    const onFocus = () => fetchData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchData]);

  const handleTabChange = (t) => {
    setTab(t);
    localStorage.setItem('home_tab', t);
    setSubTypeId(null);
  };

  const drillToKanban = (category) => {
    if (!data?.ids?.[category]?.length) return;
    localStorage.setItem('kanban_dash_filter', JSON.stringify({
      category, ids: data.ids[category],
      label: CATEGORY_LABELS[category] || category,
    }));
    nav('/kanban');
  };

  return (
    <div>
      {/* Заголовок */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 leading-tight mb-4">
          Объекты в проектировании АО «Моспроект»
        </h1>

        {/* Основные вкладки */}
        <div className="flex gap-2">
          <button
            onClick={() => handleTabChange('public')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'public'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            Общественные объекты
          </button>
          <button
            onClick={() => handleTabChange('residential')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'residential'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            Объекты жилья
          </button>
        </div>

        {/* Подтипы — только для общественных */}
        {tab === 'public' && publicTypes.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setSubTypeId(null)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                subTypeId === null
                  ? 'bg-gray-700 text-white border-gray-700'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              Показать все
            </button>
            {publicTypes.map(t => (
              <button
                key={t.id}
                onClick={() => setSubTypeId(String(t.id) === String(subTypeId) ? null : String(t.id))}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  String(subTypeId) === String(t.id)
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
                style={String(subTypeId) === String(t.id) ? { background: t.color, borderColor: t.color } : {}}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                  style={{ background: t.color }}
                />
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Контент */}
      {tab === 'residential' ? (
        <ResidentialDashboard />
      ) : loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-[3px] border-gray-200 border-t-[#C0392B] animate-spin" />
        </div>
      ) : (
        <>
          <PublicDashboard data={data} onDrill={drillToKanban} />

          {/* Quick nav */}
          <div className="grid grid-cols-3 gap-4 mt-5">
            {[
              { label: 'Карточки объектов', sub: `${data?.total ?? 0} объектов`, path: '/projects' },
              { label: 'Сводный канбан', sub: 'Статусы по этапам', path: '/kanban' },
              { label: 'Проблемные объекты', sub: `${(data?.thz?.not_provided ?? 0) + (data?.terminated ?? 0) + (data?.mge?.problem ?? 0)} требуют внимания`, path: '/kanban' },
            ].map(item => (
              <button key={item.label} onClick={() => nav(item.path)}
                className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left transition-all hover:border-gray-400 hover:-translate-y-0.5 hover:shadow-sm">
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
