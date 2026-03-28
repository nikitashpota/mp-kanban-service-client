import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getKanban, patchKanbanStage,
  getProjectTypes, createProjectType, deleteProjectType, assignProjectType
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePersistentState } from '../hooks/usePersistentState';
import { SortSelect, sortProjects } from '../components/SortSelect';

// ── Kanban column definitions ────────────────────────────────
// ── ADMINISTRATIVE kanban columns ────────────────────────────
const KANBAN_COLS_ADMIN = [
  // Исходные данные
  { key: 'thz',    label: 'ТхЗ',                   group: 'Исходные данные',      stageNum: '1'   },
  { key: 'bzu',    label: 'Границы ЗУ',             group: 'Исходные данные',      stageNum: 'bzu' },
  { key: 'dazu',   label: 'ДАЗУ',                  group: 'Исходные данные',      stageNum: '3'   },
  { key: 'gpzu',   label: 'ГПЗУ',                  group: 'Исходные данные',      stageNum: '2', groupEnd: true },
  // Инженерные изыскания
  { key: 'geod',   label: 'Геодезия',               group: 'Инженерные изыскания', stageNum: '5',  dual: true },
  { key: 'geol',   label: 'Геология',               group: 'Инженерные изыскания', stageNum: '6',  dual: true },
  { key: 'ecol',   label: 'Экология',               group: 'Инженерные изыскания', stageNum: '7',  dual: true, groupEnd: true },
  // Стадия Проект
  { key: 'trans',  label: 'Трансп. доступность',    group: 'Стадия Проект',        stageNum: 'trans' },
  { key: 'apr',    label: 'АПР',                    group: 'Стадия Проект',        stageNum: '10', dualSimple: true },
  { key: 'shopr',  label: 'ШОПР',                   group: 'Стадия Проект',        stageNum: 'shopr' },
  { key: 'afk',    label: 'АФК / пред.АГР',         group: 'Стадия Проект',        stageNum: '15', dualSimple: true },
  { key: 'agr',    label: 'АГР',                    group: 'Стадия Проект',        stageNum: '18' },
  { key: 'mge_in', label: 'Загрузка МГЭ',           group: 'Стадия Проект',        stageNum: '22' },
  { key: 'mge_out',label: 'МГЭ заключение',          group: 'Стадия Проект',        stageNum: '23' },
];

// ── RESIDENTIAL (Жильё) kanban columns ───────────────────────
const KANBAN_COLS_RESIDENTIAL = [
  { key: 'kvart',  label: 'Квартиро-графия',        group: 'Исходные данные',      stageNum: 'kvart' },
  { key: 'snos',   label: 'Снос',                   group: 'Исходные данные',      stageNum: 'snos', groupEnd: true },
  { key: 'geod',   label: 'Геодезия',               group: 'Инженерные изыскания', stageNum: '5',  dual: true },
  { key: 'geol',   label: 'Геология',               group: 'Инженерные изыскания', stageNum: '6',  dual: true },
  { key: 'ecol',   label: 'Экология',               group: 'Инженерные изыскания', stageNum: '7',  dual: true, groupEnd: true },
  { key: 'apr',    label: 'АПР',                    group: 'Стадия Проект',        stageNum: '10', dualSimple: true },
  { key: 'nagruz', label: 'Выдача нагрузок РСО',    group: 'Стадия Проект',        stageNum: '13' },
  { key: 'rso',    label: 'Договора с РСО (ТУ)',    group: 'Стадия Проект',        stageNum: '14' },
  { key: 'afk',    label: 'АФК / пред.АГР',         group: 'Стадия Проект',        stageNum: '15', dualSimple: true },
  { key: 'agr',    label: 'АГР',                    group: 'Стадия Проект',        stageNum: '18' },
  { key: 'mge_in', label: 'Загрузка МГЭ',           group: 'Стадия Проект',        stageNum: '22' },
  { key: 'mge_out',label: 'МГЭ заключение',          group: 'Стадия Проект',        stageNum: '23' },
  { key: 'rd_zero',label: 'Выдача РД нул. цикла',   group: 'Стадия Проект',        stageNum: 'rd_zero' },
];
// dual = 1й/2й этап с метками | dualSimple = два ряда без меток

const GROUP_COLORS = {
  'Исходные данные':      'text-[#C0392B] bg-red-50',
  'Инженерные изыскания': 'text-orange-600 bg-orange-50',
  'Стадия Проект':        'text-blue-700 bg-blue-50',
};

// ── Status config ─────────────────────────────────────────────
// ── Status icons (SVG, no emoji) ─────────────────────────────
const StatusIcon = ({ type, size = 18 }) => {
  const icons = {
    done: (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" fill="#16a34a"/>
        <path d="M5.5 10l3 3 5.5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    not_provided: (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" fill="#dc2626"/>
        <path d="M7 7l6 6M13 7l-6 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    needs_correction: (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" fill="#d97706"/>
        <path d="M10 5.5v5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="10" cy="13.5" r="1.2" fill="#fff"/>
      </svg>
    ),
    in_progress: (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="#2563eb" strokeWidth="2" strokeDasharray="28 8" strokeLinecap="round"/>
        <circle cx="10" cy="10" r="4" fill="#2563eb" opacity="0.25"/>
        <circle cx="10" cy="10" r="2" fill="#2563eb"/>
      </svg>
    ),
    not_required: (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="#9ca3af" strokeWidth="1.5"/>
        <path d="M6.5 10h7" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    developed: (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <rect x="2" y="4" width="16" height="12" rx="2" fill="#0d9488"/>
        <path d="M5 8h10M5 11h7" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  };
  return icons[type] || null;
};

const STATUSES = [
  { key: 'done',             label: 'Исполнено',             bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-300' },
  { key: 'not_provided',     label: 'Не обеспечено',         bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-300'   },
  { key: 'needs_correction', label: 'Требует корректировки', bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-300' },
  { key: 'in_progress',      label: 'В работе',              bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-300'  },
  { key: 'not_required',     label: 'Не требуется',          bg: 'bg-gray-50',   text: 'text-gray-500',   border: 'border-gray-300'  },
  { key: 'developed',        label: 'Разработано',           bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-300'  },
];

const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.key, s]));

function fmtDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getFullYear()).slice(-2)}`;
}

// ── Shared dual cell logic hook ───────────────────────────────
function useDualCell(stage, onUpdate) {
  const [open1, setOpen1] = useState(false);
  const [open2, setOpen2] = useState(false);
  const [dateEdit, setDateEdit] = useState(null);
  const [dateVal, setDateVal] = useState('');
  const ref = useRef();

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen1(false); setOpen2(false); }};
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Guard — stage может быть null если паспорт не создан
  const safeStage = stage || {};

  const pickStatus = async (which, key) => {
    if (!stage) return;
    which === 1 ? setOpen1(false) : setOpen2(false);
    await onUpdate(stage.id, which === 1 ? { kanban_status: key } : { kanban_status_2: key });
  };
  const saveDate = async () => {
    if (!stage) return;
    const field = dateEdit === 1 ? { execution_planned: dateVal } : { execution_planned_2: dateVal };
    setDateEdit(null);
    await onUpdate(stage.id, field);
  };

  const st1 = STATUS_MAP[safeStage.kanban_status];
  const st2 = STATUS_MAP[safeStage.kanban_status_2];
  const date1 = safeStage.execution_actual || safeStage.execution_planned || safeStage.deadline_contract;
  const date2 = safeStage.execution_actual_2 || safeStage.execution_planned_2;

  const Picker = ({ which, currentKey }) => (
    <div className="absolute top-0 left-full z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-52 ml-1">
      {STATUSES.map(s => (
        <button key={s.key} onClick={() => pickStatus(which, s.key)}
          className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 ${currentKey === s.key ? 'font-semibold' : ''}`}>
          <StatusIcon type={s.key} size={14} />
          <span className={s.text}>{s.label}</span>
          {currentKey === s.key && <span className="ml-auto text-gray-300">✓</span>}
        </button>
      ))}
      <div className="border-t border-gray-100 mt-1 pt-1">
        <button onClick={() => pickStatus(which, null)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50">✕ Очистить</button>
      </div>
    </div>
  );

  const DateOverlay = () => (
    <div className="absolute top-0 left-full z-30 bg-white border border-[#C0392B] rounded-lg shadow-lg p-2 w-36 ml-1">
      <input type="date" autoFocus className="w-full text-xs border border-gray-200 rounded px-2 py-1 mb-2 focus:outline-none"
        value={dateVal} onChange={e => setDateVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') saveDate(); if (e.key === 'Escape') setDateEdit(null); }} />
      <div className="flex gap-1">
        <button onClick={saveDate} className="flex-1 text-xs bg-[#C0392B] text-white rounded px-1.5 py-1">OK</button>
        <button onClick={() => setDateEdit(null)} className="flex-1 text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-1">✕</button>
      </div>
    </div>
  );

  return { ref, open1, setOpen1, open2, setOpen2, dateEdit, setDateEdit, dateVal, setDateVal, st1, st2, date1, date2, pickStatus, saveDate, Picker, DateOverlay };
}

// ── DualStatusCell — с метками 1эт/2эт (изыскания) ───────────
function DualStatusCell({ stage, isAdmin, onUpdate, groupBorderStyle = {} }) {
  const { ref, open1, setOpen1, open2, setOpen2, dateEdit, setDateEdit, dateVal, st1, st2, date1, date2, Picker, DateOverlay } = useDualCell(stage, onUpdate);

  if (!stage) return <td className="border border-gray-100 p-0" style={groupBorderStyle}><div className="text-gray-200 text-xs text-center py-2">—</div></td>;

  const SubRow = ({ which, st, date, open, setOpen }) => (
    <div className={`w-full flex-1 flex flex-col items-center justify-center border-b border-gray-100 last:border-0 ${st ? st.bg : ''} ${isAdmin ? 'cursor-pointer hover:brightness-95' : ''}`}
      style={{ gap: '0.5rem', paddingTop: '6px', paddingBottom: '6px' }}
      onClick={() => isAdmin && setOpen(o => !o)}>
      <span className="text-[9px] text-gray-400 font-bold leading-none">{which}эт</span>
      {st ? <StatusIcon type={st.key} size={16} /> : <span className="text-gray-200 text-base">·</span>}
      <span className={`text-[9px] font-semibold leading-none ${st ? st.text : 'text-gray-300'}`}
        onClick={e => { if (isAdmin) { e.stopPropagation(); setDateEdit(which); setDateVal((date || '').slice(0, 10)); }}}>
        {date ? fmtDate(date) : (isAdmin ? 'дата' : '')}
      </span>
    </div>
  );

  return (
    <td className="border border-gray-100 p-0 relative" style={{height:"1px", padding:0, ...groupBorderStyle}} ref={ref}>
      <div style={{height:"100%", minHeight:"100%"}} className="flex flex-col">
        <SubRow which={1} st={st1} date={date1} open={open1} setOpen={setOpen1} />
        <SubRow which={2} st={st2} date={date2} open={open2} setOpen={setOpen2} />
      </div>
      {open1 && <Picker which={1} currentKey={stage.kanban_status} />}
      {open2 && <div className="absolute bottom-0 left-full z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-52 ml-1">
        {STATUSES.map(s => (
          <button key={s.key} onClick={async () => { setOpen2(false); await onUpdate(stage.id, { kanban_status_2: s.key }); }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 ${stage.kanban_status_2 === s.key ? 'font-semibold' : ''}`}>
            <StatusIcon type={s.key} size={14} /><span className={s.text}>{s.label}</span>
            {stage.kanban_status_2 === s.key && <span className="ml-auto text-gray-300">✓</span>}
          </button>
        ))}
        <div className="border-t border-gray-100 mt-1 pt-1">
          <button onClick={async () => { setOpen2(false); await onUpdate(stage.id, { kanban_status_2: null }); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50">✕ Очистить</button>
        </div>
      </div>}
      {dateEdit && <DateOverlay />}
    </td>
  );
}

// ── DualSimpleCell — без меток (АПР, АФК) — просто 2 строки ──
function DualSimpleCell({ stage, isAdmin, onUpdate, groupBorderStyle = {} }) {
  const { ref, open1, setOpen1, open2, setOpen2, dateEdit, setDateEdit, st1, st2, date1, date2, Picker, DateOverlay } = useDualCell(stage, onUpdate);

  if (!stage) return <td className="border border-gray-100 p-0" style={groupBorderStyle}><div className="text-gray-200 text-xs text-center py-2">—</div></td>;

  const SimpleRow = ({ which, st, date, open, setOpen }) => (
    <div className={`w-full flex-1 flex flex-col items-center justify-center border-b border-gray-100 last:border-0 ${st ? st.bg : ''} ${isAdmin ? 'cursor-pointer hover:brightness-95' : ''}`}
      style={{ gap: '0.5rem', paddingTop: '6px', paddingBottom: '6px' }}
      onClick={() => isAdmin && setOpen(o => !o)}>
      {st ? <StatusIcon type={st.key} size={17} /> : <span className="text-gray-200 text-base">·</span>}
      <span className={`text-[9px] font-semibold leading-none ${st ? st.text : 'text-gray-300'}`}
        onClick={e => { if (isAdmin) { e.stopPropagation(); setDateEdit(which); setDateVal((date || '').slice(0, 10)); }}}>
        {date ? fmtDate(date) : (isAdmin ? 'дата' : '')}
      </span>
    </div>
  );

  return (
    <td className="border border-gray-100 p-0 relative" style={{height:"1px", padding:0, ...groupBorderStyle}} ref={ref}>
      <div style={{height:"100%", minHeight:"100%"}} className="flex flex-col">
        <SimpleRow which={1} st={st1} date={date1} open={open1} setOpen={setOpen1} />
        <SimpleRow which={2} st={st2} date={date2} open={open2} setOpen={setOpen2} />
      </div>
      {open1 && <Picker which={1} currentKey={stage?.kanban_status} />}
      {open2 && <div className="absolute bottom-0 left-full z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-52 ml-1">
        {STATUSES.map(s => (
          <button key={s.key} onClick={async () => { setOpen2(false); await onUpdate(stage.id, { kanban_status_2: s.key }); }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 ${stage.kanban_status_2 === s.key ? 'font-semibold' : ''}`}>
            <StatusIcon type={s.key} size={14} /><span className={s.text}>{s.label}</span>
            {stage.kanban_status_2 === s.key && <span className="ml-auto text-gray-300">✓</span>}
          </button>
        ))}
        <div className="border-t border-gray-100 mt-1 pt-1">
          <button onClick={async () => { setOpen2(false); await onUpdate(stage.id, { kanban_status_2: null }); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50">✕ Очистить</button>
        </div>
      </div>}
      {dateEdit && <DateOverlay />}
    </td>
  );
}


// ── Status cell with click-to-change ─────────────────────────
function StatusCell({ stage, projectId, isAdmin, onUpdate, groupBorderStyle = {} }) {
  const [open, setOpen] = useState(false);
  const [dateEdit, setDateEdit] = useState(false);
  const [dateVal, setDateVal] = useState('');
  const ref = useRef();

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!stage) {
    return (
      <td className="border border-gray-100 text-center" style={groupBorderStyle}>
        {isAdmin ? (
          <div className="text-gray-200 text-xs py-2 cursor-not-allowed">—</div>
        ) : <div className="text-gray-200 text-xs">—</div>}
      </td>
    );
  }

  const st = STATUS_MAP[stage.kanban_status];
  const date = stage.execution_actual || stage.execution_planned || stage.deadline_contract;

  const handleStatusPick = async (statusKey) => {
    setOpen(false);
    await onUpdate(stage.id, { kanban_status: statusKey });
  };

  const handleDateSave = async () => {
    setDateEdit(false);
    await onUpdate(stage.id, { execution_planned: dateVal });
  };

  return (
    <td className={`border border-gray-100 p-0 relative ${st ? st.bg : 'bg-white'}`} style={groupBorderStyle}>
      <div ref={ref} className="relative">
        {/* Status icon */}
        <div
          onClick={() => isAdmin && setOpen(o => !o)}
          className={`flex flex-col items-center justify-center py-2 px-1 ${isAdmin ? 'cursor-pointer hover:brightness-95' : ''}`}
          style={{ gap: '0.75rem' }}
        >
          {st ? <StatusIcon type={stage.kanban_status} size={20} /> : <span className="text-gray-200 text-lg">·</span>}
          {date && (
            <span
              className={`text-[10px] font-semibold leading-none ${st ? st.text : 'text-gray-400'}`}
              onClick={e => { if (isAdmin) { e.stopPropagation(); setDateEdit(true); setDateVal(date.slice(0, 10)); }}}
            >
              {fmtDate(date)}
            </span>
          )}
          {!date && isAdmin && (
            <span className="text-[10px] text-gray-300 leading-none"
              onClick={e => { e.stopPropagation(); setDateEdit(true); setDateVal(''); }}>
              дата
            </span>
          )}
        </div>

        {/* Status picker dropdown */}
        {open && (
          <div className="absolute top-full left-0 z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-52" style={{ minWidth: 200 }}>
            {STATUSES.map(s => (
              <button key={s.key} onClick={() => handleStatusPick(s.key)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${stage.kanban_status === s.key ? 'font-semibold' : ''}`}>
                <StatusIcon type={s.key} size={16} />
                <span className={s.text}>{s.label}</span>
                {stage.kanban_status === s.key && <span className="ml-auto text-gray-300">✓</span>}
              </button>
            ))}
            <div className="border-t border-gray-100 mt-1 pt-1">
              <button onClick={() => handleStatusPick(null)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:bg-gray-50">
                <span>✕</span> Очистить
              </button>
            </div>
          </div>
        )}

        {/* Date input overlay */}
        {dateEdit && (
          <div className="absolute top-0 left-0 z-30 bg-white border border-brand-400 rounded-lg shadow-lg p-2 w-40">
            <input type="date" autoFocus
              className="w-full text-xs border border-gray-200 rounded px-2 py-1 mb-2 focus:outline-none focus:border-brand-400"
              value={dateVal} onChange={e => setDateVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleDateSave(); if (e.key === 'Escape') setDateEdit(false); }}
            />
            <div className="flex gap-1">
              <button onClick={handleDateSave} className="flex-1 text-xs bg-[#C0392B] text-white rounded px-2 py-1">OK</button>
              <button onClick={() => setDateEdit(false)} className="flex-1 text-xs bg-gray-100 text-gray-600 rounded px-2 py-1">✕</button>
            </div>
          </div>
        )}
      </div>
    </td>
  );
}

// ── Project type manager modal ────────────────────────────────
function TypesModal({ types, onClose, onCreated, onDeleted }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6b7280');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try { const t = await createProjectType({ name, color }); onCreated(t); setName(''); }
    catch {}
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900">Типы объектов</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-6">
          <div className="flex gap-2 mb-4">
            <input className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C0392B]"
              placeholder="Название типа..." value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && save()} />
            <input type="color" className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              value={color} onChange={e => setColor(e.target.value)} />
            <button onClick={save} disabled={saving || !name.trim()}
              className="px-4 py-2 bg-[#C0392B] hover:bg-[#96281B] text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50">
              + Добавить
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {types.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Типы не добавлены</p>}
            {types.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.color }} />
                <span className="flex-1 text-sm font-medium text-gray-800">{t.name}</span>
                <button onClick={() => onDeleted(t.id)} className="text-gray-300 hover:text-red-500 transition-colors text-sm">✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function KanbanPage() {
  const { isAdmin } = useAuth();
  const nav = useNavigate();

  const [rows, setRows] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = usePersistentState('kanban_filterType', '');
  const [search, setSearch] = usePersistentState('kanban_search', '');
  const [showProblematic, setShowProblematic] = usePersistentState('kanban_problematic', false);
  const [dashFilter, setDashFilter] = useState(() => {
    try { const stored = localStorage.getItem('kanban_dash_filter'); return stored ? JSON.parse(stored) : null; } catch { return null; }
  });
  const [sortValue, setSortValue] = usePersistentState('kanban_sort', 'name_asc');
  const [statusFilter, setStatusFilter] = usePersistentState('kanban_statusFilter', []);
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [typesModal, setTypesModal] = useState(false);
  const [assigningId, setAssigningId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [data, typesData] = await Promise.all([getKanban(), getProjectTypes()]);
      setRows(data);
      setTypes(typesData);
      setFilterType(prev => (!prev && typesData.length > 0) ? String(typesData[0].id) : prev);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleUpdate = async (stageId, data) => {
    await patchKanbanStage(stageId, data);
    load();
  };

  const handleAssignType = async (projectId, typeId) => {
    await assignProjectType(projectId, typeId || null);
    setAssigningId(null);
    load();
  };

  const handleTypeCreated = (t) => { setTypes(p => [...p, t]); };
  const handleTypeDeleted = async (id) => {
    await deleteProjectType(id);
    setTypes(p => p.filter(t => t.id !== id));
    load();
  };

  const clearDashFilter = () => {
    localStorage.removeItem('kanban_dash_filter');
    setDashFilter(null);
  };

  // Filter + sort
  const visible = sortProjects(
    rows.filter(p => {
      if (dashFilter) return dashFilter.ids.includes(p.id);
      if (showProblematic && p.issue_count === 0) return false;
      if (filterType && String(p.project_type_id) !== filterType) return false;
      if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false;
      // Status filter: show row if ANY stage cell matches ANY selected status
      if (statusFilter.length > 0) {
        const allStatuses = Object.values(p.stages || {}).flatMap(s => [s.kanban_status, s.kanban_status_2]).filter(Boolean);
        if (!statusFilter.some(sf => allStatuses.includes(sf))) return false;
      }
      return true;
    }),
    sortValue
  );

  // ── Determine active column set based on selected type ──────
  const activeType = types.find(t => String(t.id) === filterType);
  const KANBAN_COLS = activeType?.kanban_type === 'residential'
    ? KANBAN_COLS_RESIDENTIAL
    : KANBAN_COLS_ADMIN;
  const GROUPS = [...new Set(KANBAN_COLS.map(c => c.group))];

  // Group columns by group
  const groupedCols = GROUPS.map(g => ({
    group: g,
    cols: KANBAN_COLS.filter(c => c.group === g),
  }));

  const thCls = 'border border-gray-100 bg-gray-50 text-[11px] font-semibold text-gray-500 text-center px-1 py-2 leading-tight align-middle';
  const thFixedCls = 'border border-gray-100 bg-gray-50 text-[11px] font-semibold text-gray-500 text-center px-1 py-2 whitespace-nowrap align-middle';

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 56px - 48px)' }}>
      {/* ── TYPE TABS — обособлены сверху ── */}
      {types.length > 0 && !dashFilter && (
        <div className="mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            {types.map(t => (
              <button key={t.id} onClick={() => setFilterType(String(t.id))}
                className={`px-5 py-2 text-sm font-bold rounded-xl border-2 transition-all ${filterType === String(t.id) ? 'text-white shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                style={filterType === String(t.id) ? { background: t.color, borderColor: t.color } : {}}>
                {t.name}
              </button>
            ))}
          </div>
          <div className="mt-3 border-b border-gray-200" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Сводный канбан</h1>
          <p className="text-sm text-gray-400 mt-0.5">{visible.length} объект(ов)</p>
          {dashFilter && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-semibold text-white bg-[#C0392B] px-2.5 py-1 rounded-full">
                {dashFilter.label}
              </span>
              <button onClick={clearDashFilter}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
                × сбросить фильтр дашборда
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort always visible */}
          <SortSelect value={sortValue} onChange={setSortValue} />

          {/* Regular filters — hidden when dash filter active */}
          {!dashFilter && (
            <>
              {/* Search */}
              <input
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:border-[#C0392B] transition-all w-52"
                placeholder="Поиск по названию..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />

              {/* Problematic filter */}
              <button onClick={() => setShowProblematic(p => !p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${showProblematic ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-500 border-gray-200 hover:border-red-400 hover:text-red-600'}`}>
                ⚠ Проблемные
              </button>

              {/* Status filter */}
              <div className="relative">
                <button onClick={() => setShowStatusPanel(p => !p)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${statusFilter.length > 0 ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-400 hover:text-blue-600'}`}>
                  Статус {statusFilter.length > 0 ? `(${statusFilter.length})` : '▾'}
                </button>
                {showStatusPanel && (
                  <div className="absolute top-full right-0 mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-2 w-52">
                    <div className="px-3 pb-1 text-[10px] font-bold text-gray-400 uppercase">Фильтр по статусу</div>
                    {STATUSES.map(s => (
                      <label key={s.key} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" className="accent-[#C0392B]"
                          checked={statusFilter.includes(s.key)}
                          onChange={e => setStatusFilter(prev => e.target.checked ? [...prev, s.key] : prev.filter(x => x !== s.key))} />
                        <StatusIcon type={s.key} size={14} />
                        <span className={`text-xs ${s.text}`}>{s.label}</span>
                      </label>
                    ))}
                    {statusFilter.length > 0 && (
                      <div className="border-t border-gray-100 mt-1 pt-1 px-3">
                        <button onClick={() => setStatusFilter([])} className="text-xs text-gray-400 hover:text-gray-700">× Сбросить</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Manage types */}
          {isAdmin && !dashFilter && (
            <button onClick={() => nav('/settings')}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-all">
              ⚙ Настройки
            </button>
          )}

          {/* Switch to cards */}
          <button onClick={() => nav('/projects')}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-all">
            ☰ Карточки
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        {STATUSES.map(s => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs text-gray-500">
            <StatusIcon type={s.key} size={14} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-[3px] border-gray-200 border-t-[#C0392B] animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <div className="font-medium">Объекты не найдены</div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="overflow-auto flex-1">
            <table className="border-collapse w-full" style={{ tableLayout: 'fixed', minWidth: 900 }}>
              <thead className="sticky top-0 z-10">
                {/* Group header row */}
                <tr>
                  <th className={`${thFixedCls} w-8`} rowSpan={2}>№</th>
                  <th className={`${thFixedCls} text-left`} style={{ width: '16%' }} rowSpan={2}>Объект</th>
                  <th className={`${thFixedCls}`} style={{ width: '7%' }} rowSpan={2}>Договор</th>
                  {groupedCols.map(({ group, cols }, gi) => (
                    <th key={group}
                      className={`${thFixedCls} text-center font-bold`}
                      colSpan={cols.length}
                      style={{ borderRight: gi < groupedCols.length - 1 ? '2px solid #d1d5db' : undefined }}>
                      <span className={`px-2 py-0.5 rounded ${GROUP_COLORS[group] || ''}`}>{group}</span>
                    </th>
                  ))}
                  <th className={`${thFixedCls}`} style={{ width: '11%' }} rowSpan={2}>Примечание</th>
                </tr>
                {/* Column labels */}
                <tr>
                  {KANBAN_COLS.map(col => (
                    <th key={col.key}
                      className={thCls}
                      style={{ maxWidth: 56, borderRight: col.groupEnd ? '2px solid #d1d5db' : undefined }}>
                      {col.label.length > 10 ? (
                        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', margin: '0 auto', fontSize: 10, lineHeight: 1.2, maxHeight: 80, overflow: 'hidden' }}>
                          {col.label}
                        </div>
                      ) : col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {visible.map((p, idx) => {
                  const isProblematic = p.issue_count > 0;
                  return (
                    <tr key={p.id} className={`hover:bg-gray-50/50 transition-colors ${isProblematic ? 'border-l-2 border-l-red-400' : ''}`}>
                      {/* № */}
                      <td className="border border-gray-100 text-center text-xs text-gray-400 px-2 py-2">{idx + 1}</td>

                      {/* Project name */}
                      <td className="border border-gray-100 px-3 py-2">
                        <button
                          onClick={() => nav(`/projects/${p.id}`)}
                          className="text-xs font-semibold text-gray-800 hover:text-[#C0392B] text-left leading-snug transition-colors block w-full break-words"
                        >
                          {p.name}
                        </button>
                        {p.address && (
                          <div className="text-[10px] text-gray-400 mt-0.5 leading-snug">📍 {p.address}</div>
                        )}
                        {p.area_total && (
                          <div className="text-[10px] text-gray-500 mt-0.5 font-medium">
                            {Number(p.area_total).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} м²
                          </div>
                        )}
                        {/* Type + flags */}
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {p.type_name ? (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
                              style={{ background: p.type_color || '#6b7280' }}>
                              {p.type_name}
                            </span>
                          ) : null}
                          {isAdmin && (
                            <button onClick={() => setAssigningId(p.id)}
                              className="text-[10px] text-gray-300 hover:text-[#C0392B] transition-colors">
                              {p.type_name ? '✏' : '+ тип'}
                            </button>
                          )}
                          {isProblematic && (
                            <span className="text-[10px] text-red-500 font-semibold">⚠ {p.issue_count} пр.</span>
                          )}
                        </div>
                      </td>

                      {/* Contract */}
                      <td className="border border-gray-100 px-2 py-2 text-center">
                        <span className="text-[11px] text-gray-600">{p.contract_pir || '—'}</span>
                      </td>

                      {/* Stage cells */}
                      {KANBAN_COLS.map(col => {
                        const groupBorderStyle = col.groupEnd ? { borderRight: '2px solid #d1d5db' } : {};
                        if (col.noRenovation && p.type_is_renovation) {
                          return <td key={col.key} className="border border-gray-100 p-0 bg-gray-50" style={groupBorderStyle}>
                            <div className="text-[9px] text-gray-300 text-center py-2">н/п</div>
                          </td>;
                        }
                        if (col.dual) return <DualStatusCell key={col.key} stage={p.stages[col.stageNum]} isAdmin={isAdmin} onUpdate={handleUpdate} groupBorderStyle={groupBorderStyle} />;
                        if (col.dualSimple) return <DualSimpleCell key={col.key} stage={p.stages[col.stageNum]} isAdmin={isAdmin} onUpdate={handleUpdate} groupBorderStyle={groupBorderStyle} />;
                        return <StatusCell key={col.key} stage={p.stages[col.stageNum]} projectId={p.id} isAdmin={isAdmin} onUpdate={handleUpdate} groupBorderStyle={groupBorderStyle} />;
                      })}

                      {/* Примечание */}
                      <td className="border border-gray-100 px-2 py-2">
                        {p.issue_count > 0 ? (
                          <button onClick={() => nav(`/projects/${p.id}#issues`)}
                            className="text-[11px] text-red-600 hover:underline text-left leading-snug">
                            ⚠ {p.issue_count} {p.issue_count === 1 ? 'примечание' : 'примечания'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Type assignment dropdown */}
      {assigningId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setAssigningId(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-gray-900">Назначить тип объекта</span>
              <button onClick={() => setAssigningId(null)} className="text-gray-400">✕</button>
            </div>
            <div className="space-y-2">
              <button onClick={() => handleAssignType(assigningId, null)}
                className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm text-gray-500 transition-all">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                Без типа
              </button>
              {types.map(t => (
                <button key={t.id} onClick={() => handleAssignType(assigningId, t.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-800 transition-all">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.color }} />
                  {t.name}
                </button>
              ))}
              {types.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Сначала создайте типы объектов</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Types manager modal */}
      {typesModal && (
        <TypesModal
          types={types}
          onClose={() => setTypesModal(false)}
          onCreated={handleTypeCreated}
          onDeleted={handleTypeDeleted}
        />
      )}
    </div>
  );
}
