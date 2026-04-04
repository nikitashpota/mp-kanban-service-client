import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  getKanban, patchKanbanStage,
  getProjectTypes, createProjectType, deleteProjectType, assignProjectType,
  approveDate, rejectDate,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePersistentState } from '../hooks/usePersistentState';
import { SortSelect, sortProjects } from '../components/SortSelect';

const exportToPDF = (tableEl, typeName) => {
  const printWindow = window.open('', '_blank', 'width=1400,height=900');
  const dateStr = new Date().toLocaleDateString('ru-RU');
  const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(el => el.outerHTML).join('\n');
  printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Сводный канбан — ${typeName}</title>${styleLinks}
<style>
@page { size: A4 landscape; margin: 8mm; }
body { background: white !important; padding: 0; margin: 0; font-family: 'Inter', Arial, sans-serif; }
.print-header { display: flex !important; justify-content: space-between; align-items: center; background: #C0392B !important; color: white !important; padding: 6px 12px; margin-bottom: 6px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
.overflow-auto, .overflow-x-auto, .overflow-hidden { overflow: visible !important; }
table { font-size: 9px !important; width: 100% !important; border-collapse: collapse !important; }
th, td { font-size: 9px !important; padding: 2px 3px !important; border: 1px solid #d1d5db !important; vertical-align: middle !important; text-align: center !important; }
th { background: #f9fafb !important; font-weight: 600 !important; }
tr { page-break-inside: avoid; }
thead { display: table-header-group; }
.pending-chip { display: none !important; }
</style>
</head><body>
<div class="print-header"><span style="font-size:13px;font-weight:700">Сводный канбан — ${typeName}</span><span style="font-size:10px">${dateStr}</span></div>
<div style="overflow:visible">${tableEl.outerHTML}</div>
<script>window.onload=function(){setTimeout(function(){window.print();},600);}</script>
</body></html>`);
  printWindow.document.close();
};

const KANBAN_COLS_ADMIN = [
  { key: 'thz',    label: 'ТхЗ',                   group: 'Исходные данные',      stageNum: '4'   },
  { key: 'bzu',    label: 'Границы ЗУ',             group: 'Исходные данные',      stageNum: 'bzu' },
  { key: 'dazu',   label: 'ДАЗУ',                   group: 'Исходные данные',      stageNum: '3'   },
  { key: 'gpzu',   label: 'ГПЗУ',                   group: 'Исходные данные',      stageNum: '2', groupEnd: true },
  { key: 'geod',   label: 'Геодезия',               group: 'Инженерные изыскания', stageNum: '5',  dual: true, date1Field: 'execution_actual', date2Field: 'execution_actual_2' },
  { key: 'geol',   label: 'Геология',               group: 'Инженерные изыскания', stageNum: '6',  dual: true, date1Field: 'execution_actual', date2Field: 'execution_actual_2' },
  { key: 'ecol',   label: 'Экология',               group: 'Инженерные изыскания', stageNum: '7',  dual: true, date1Field: 'execution_actual', date2Field: 'execution_actual_2', groupEnd: true },
  { key: 'trans',  label: 'Трансп. доступность',    group: 'Стадия Проект',        stageNum: 'trans' },
  { key: 'apr',    label: 'АПР',                    group: 'Стадия Проект',        stageNum: '10', dualSimple: true },
  { key: 'shopr',  label: 'ШОПР',                   group: 'Стадия Проект',        stageNum: 'shopr' },
  { key: 'afk',    label: 'АФК / пред.АГР',         group: 'Стадия Проект',        stageNum: '15', dualSimple: true },
  { key: 'agr',    label: 'АГР',                    group: 'Стадия Проект',        stageNum: '18' },
  { key: 'mge_in', label: 'Загрузка МГЭ',           group: 'Стадия Проект',        stageNum: '22' },
  { key: 'mge_out',label: 'МГЭ заключение', labelLines: ['МГЭ', 'заключение'], group: 'Стадия Проект', stageNum: '23', groupEnd: true },
];

const KANBAN_COLS_RESIDENTIAL = [
  { key: 'kvart',  label: 'Кварт.графия',           group: 'Исходные данные',      stageNum: 'kvart' },
  { key: 'snos',   label: 'Снос',                   group: 'Исходные данные',      stageNum: 'snos', groupEnd: true },
  { key: 'geod',   label: 'Геодезия',               group: 'Инженерные изыскания', stageNum: '5',  dual: true, date1Field: 'execution_actual', date2Field: 'execution_actual_2' },
  { key: 'geol',   label: 'Геология',               group: 'Инженерные изыскания', stageNum: '6',  dual: true, date1Field: 'execution_actual', date2Field: 'execution_actual_2' },
  { key: 'ecol',   label: 'Экология',               group: 'Инженерные изыскания', stageNum: '7',  dual: true, date1Field: 'execution_actual', date2Field: 'execution_actual_2', groupEnd: true },
  { key: 'apr',    label: 'АПР',                    group: 'Стадия Проект',        stageNum: '10', dualSimple: true },
  { key: 'nagruz', label: 'Выдача нагрузок РСО',    labelLines: ['Выдача', 'нагрузок РСО'], group: 'Стадия Проект', stageNum: '13' },
  { key: 'rso',    label: 'Договора с РСО (ТУ)',     labelLines: ['Договора', 'с РСО (ТУ)'],  group: 'Стадия Проект', stageNum: '14' },
  { key: 'afk',    label: 'АФК / пред.АГР',         group: 'Стадия Проект',        stageNum: '15', dualSimple: true },
  { key: 'agr',    label: 'АГР',                    group: 'Стадия Проект',        stageNum: '18' },
  { key: 'mge_in', label: 'Загрузка МГЭ',           group: 'Стадия Проект',        stageNum: '22' },
  { key: 'mge_out',label: 'МГЭ заключение', labelLines: ['МГЭ', 'заключение'], group: 'Стадия Проект', stageNum: '23' },
  { key: 'rd_zero',label: 'Выдача РД нул. цикла',   group: 'Стадия Проект',        stageNum: 'rd_zero', groupEnd: true },
];

const GROUP_COLORS = {
  'Исходные данные':      'text-[#C0392B] bg-red-50',
  'Инженерные изыскания': 'text-orange-600 bg-orange-50',
  'Стадия Проект':        'text-blue-700 bg-blue-50',
};

const StatusIcon = ({ type, size = 18 }) => {
  const icons = {
    done: (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="#16a34a"/><path d="M5.5 10l3 3 5.5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
    not_provided: (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="#dc2626"/><path d="M7 7l6 6M13 7l-6 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>),
    needs_correction: (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="#d97706"/><path d="M10 5.5v5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><circle cx="10" cy="13.5" r="1.2" fill="#fff"/></svg>),
    in_progress: (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="#2563eb" strokeWidth="2" strokeDasharray="28 8" strokeLinecap="round"/><circle cx="10" cy="10" r="4" fill="#2563eb" opacity="0.25"/><circle cx="10" cy="10" r="2" fill="#2563eb"/></svg>),
    not_required: (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="#9ca3af" strokeWidth="1.5"/><path d="M6.5 10h7" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round"/></svg>),
    developed: (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" fill="#0d9488"/><path d="M5 8h10M5 11h7" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>),
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

// ── Pending chip — показывает 🕐 и кнопки утверждения ─────────
function PendingChip({ pendingDate, pendingByName, stageId, slot, canApprove, onDone }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef();
  const popRef = useRef();

  const updatePos = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.top, left: r.left + r.width / 2 });
  };

  // Закрытие по клику вне
  useEffect(() => {
    if (!open) return;
    const onMouseDown = e => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        popRef.current && !popRef.current.contains(e.target)
      ) setOpen(false);
    };
    // Обновляем позицию при любом скролле (канбан, окно)
    const onScroll = () => updatePos();
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('scroll', onScroll, true); // capture — ловим любой скролл
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  if (!pendingDate) return null;

  const handleOpen = e => {
    e.stopPropagation();
    updatePos();
    setOpen(o => !o);
  };

  const handle = async (action, e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      if (action === 'approve') await approveDate(stageId, slot);
      else await rejectDate(stageId, slot);
      setOpen(false);
      onDone?.();
    } finally { setLoading(false); }
  };

  const shortName = pendingByName
    ? (() => {
        const parts = pendingByName.trim().split(/\s+/);
        if (parts.length === 1) return parts[0];
        const [last, first, mid] = parts;
        return `${last} ${first?.[0] || ''}.${mid?.[0] ? mid[0] + '.' : ''}`;
      })()
    : 'ГИП';

  const popover = pos && open && createPortal(
    <div
      ref={popRef}
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: pos.top - 8,
        left: pos.left,
        transform: 'translate(-50%, -100%)',
        zIndex: 99999,
        pointerEvents: 'auto',
      }}
    >
      <div style={{
        background: 'white',
        border: '1.5px solid #f59e0b',
        borderRadius: 12,
        padding: '10px 12px',
        width: 176,
        boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
          bottom: -7, width: 12, height: 12,
          background: 'white',
          borderRight: '1.5px solid #f59e0b',
          borderBottom: '1.5px solid #f59e0b',
        }} />
        <div style={{ fontSize: 9, fontWeight: 700, color: '#b45309', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 8 }}>
          Ожидает утверждения
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: '#6b7280' }}>Дата</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{fmtDate(pendingDate)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: '#6b7280' }}>ГИП</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: '#374151', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortName}</span>
        </div>
        {canApprove ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              disabled={loading}
              onClick={e => handle('approve', e)}
              style={{ flex: 1, background: '#22c55e', color: 'white', border: 'none', borderRadius: 8, padding: '7px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
            >
              {loading ? '…' : 'Принять'}
            </button>
            <button
              disabled={loading}
              onClick={e => handle('reject', e)}
              style={{ flex: 1, background: 'white', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 8, padding: '7px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
            >
              {loading ? '…' : 'Отклонить'}
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 10, color: '#d97706', textAlign: 'center', fontWeight: 500 }}>ожидает решения РП</div>
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <div className="pending-chip inline-flex items-center justify-center" onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        style={{ padding: '6px', margin: '-6px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        title={`Предложено: ${fmtDate(pendingDate)} — ${pendingByName || 'ГИП'}`}
      >
        <span className={`w-5 h-5 rounded-full flex items-center justify-center transition-all shadow-sm border flex-shrink-0 ${
          open
            ? 'bg-amber-500 border-amber-500 text-white'
            : 'bg-amber-50 border-amber-400 text-amber-500 hover:bg-amber-100'
        }`}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M8 4.5V8l2.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
      {popover}
    </div>
  );
}





// ── Shared dual cell logic hook ───────────────────────────────
function useDualCell(stage, onUpdate, projectId, stageNum, date1Field = 'execution_actual', date2Field = 'execution_actual_2') {
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

  const safeStage = stage || {};

  const pickStatus = async (which, key) => {
    if (!stage && !projectId) return;
    which === 1 ? setOpen1(false) : setOpen2(false);
    await onUpdate(stage?.id, which === 1 ? { kanban_status: key } : { kanban_status_2: key }, projectId, stageNum);
  };

  const saveDate = async () => {
    if (!stage && !projectId) return;
    const fieldName = dateEdit === 1 ? (date1Field || 'execution_actual') : (date2Field || 'execution_actual_2');
    setDateEdit(null);
    await onUpdate(stage?.id, { [fieldName]: dateVal }, projectId, stageNum);
  };

  const st1 = STATUS_MAP[safeStage.kanban_status];
  const st2 = STATUS_MAP[safeStage.kanban_status_2];
  const date1 = safeStage[date1Field];
  const date2 = date2Field === 'execution_actual_2' ? safeStage.execution_actual_2 : safeStage[date2Field];

  const Picker = ({ which, currentKey }) => (
    <div className="absolute top-0 left-full z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-52 ml-1 text-left whitespace-nowrap">
      {STATUSES.map(s => (
        <button key={s.key} onClick={() => pickStatus(which, s.key)}
          className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 ${currentKey === s.key ? 'font-semibold' : ''}`}>
          <StatusIcon type={s.key} size={14} />
          <span className={s.text}>{s.label}</span>
          {currentKey === s.key && <span className="ml-auto text-gray-300">✓</span>}
        </button>
      ))}
      <div className="border-t border-gray-100 mt-1 pt-1">
        <button onClick={() => pickStatus(which, null)} className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50">✕ Очистить</button>
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

  return { ref, open1, setOpen1, open2, setOpen2, dateEdit, setDateEdit, dateVal, setDateVal, st1, st2, date1, date2, pickStatus, saveDate, Picker, DateOverlay, safeStage };
}

// ── DualStatusCell ────────────────────────────────────────────
function DualStatusCell({ stage, projectId, stageNum, isAdmin, onUpdate, onReload, canApprove, groupBorderStyle = {}, date1Field, date2Field }) {
  const { ref, open1, setOpen1, open2, setOpen2, dateEdit, setDateEdit, dateVal, setDateVal, st1, st2, date1, date2, Picker, DateOverlay, safeStage } = useDualCell(stage, onUpdate, projectId, stageNum, date1Field, date2Field);

  const SubRow = ({ which, st, date, open, setOpen, pendingDate, pendingByName, slot }) => (
    <div
      className={`w-full flex-1 flex flex-col items-center justify-center border-b border-gray-100 last:border-0 ${st ? st.bg : ''} ${isAdmin ? 'cursor-pointer hover:brightness-95' : ''} px-1`}
      style={{ gap: '0.4rem', paddingTop: '5px', paddingBottom: '5px' }}
      onClick={() => isAdmin && setOpen(o => !o)}>
      <span className="text-[9px] text-gray-400 font-bold leading-none">{which}эт</span>
      {st ? <StatusIcon type={st.key} size={16} /> : <span className="text-gray-200 text-base">·</span>}
      <span
        className={`text-[9px] font-semibold leading-none transition-colors ${date ? (st ? st.text : 'text-gray-400') : 'text-gray-300'} ${isAdmin ? 'hover:text-blue-500 hover:underline cursor-pointer' : ''}`}
        onClick={e => { if (isAdmin) { e.stopPropagation(); setDateEdit(which); setDateVal((date || '').slice(0, 10)); }}}>
        {date ? fmtDate(date) : (isAdmin ? 'дата' : '—')}
      </span>
      {pendingDate && (
        <PendingChip pendingDate={pendingDate} pendingByName={pendingByName} stageId={stage?.id} slot={slot} canApprove={canApprove} onDone={onReload} />
      )}
    </div>
  );

  return (
    <td className="border border-gray-100 p-0 relative" style={{ height: '1px', padding: 0, ...groupBorderStyle }} ref={ref}>
      <div style={{ height: '100%', minHeight: '100%' }} className="flex flex-col dual-cell-wrapper">
        <SubRow which={1} st={st1} date={date1} open={open1} setOpen={setOpen1} pendingDate={stage?.execution_actual_pending} pendingByName={stage?.pending_by_name} slot={1} />
        <SubRow which={2} st={st2} date={date2} open={open2} setOpen={setOpen2} pendingDate={stage?.execution_actual_pending_2} pendingByName={stage?.pending_by_name} slot={2} />
      </div>
      {open1 && <Picker which={1} currentKey={stage?.kanban_status} />}
      {open2 && (
        <div className="absolute bottom-0 left-full z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-52 ml-1 text-left whitespace-nowrap">
          {STATUSES.map(s => (
            <button key={s.key} onClick={async () => { setOpen2(false); await onUpdate(stage?.id, { kanban_status_2: s.key }, projectId, stageNum); }}
              className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 ${safeStage.kanban_status_2 === s.key ? 'font-semibold' : ''}`}>
              <StatusIcon type={s.key} size={14} /><span className={s.text}>{s.label}</span>
              {safeStage.kanban_status_2 === s.key && <span className="ml-auto text-gray-300">✓</span>}
            </button>
          ))}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button onClick={async () => { setOpen2(false); await onUpdate(stage?.id, { kanban_status_2: null }, projectId, stageNum); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50">✕ Очистить</button>
          </div>
        </div>
      )}
      {dateEdit && <DateOverlay />}
    </td>
  );
}

// ── DualSimpleCell ────────────────────────────────────────────
function DualSimpleCell({ stage, projectId, stageNum, isAdmin, onUpdate, onReload, canApprove, groupBorderStyle = {}, date1Field, date2Field }) {
  const { ref, open1, setOpen1, open2, setOpen2, dateEdit, setDateEdit, dateVal, setDateVal, st1, st2, date1, date2, Picker, DateOverlay, safeStage } = useDualCell(stage, onUpdate, projectId, stageNum, date1Field, date2Field);

  const SimpleRow = ({ which, st, date, open, setOpen, pendingDate, pendingByName, slot }) => (
    <div
      className={`w-full flex-1 flex flex-col items-center justify-center border-b border-gray-100 last:border-0 ${st ? st.bg : ''} ${isAdmin ? 'cursor-pointer hover:brightness-95' : ''} px-1`}
      style={{ gap: '0.4rem', paddingTop: '5px', paddingBottom: '5px' }}
      onClick={() => isAdmin && setOpen(o => !o)}>
      {st ? <StatusIcon type={st.key} size={17} /> : <span className="text-gray-200 text-base">·</span>}
      <span
        className={`text-[9px] font-semibold leading-none transition-colors ${date ? (st ? st.text : 'text-gray-400') : 'text-gray-300'} ${isAdmin ? 'hover:text-blue-500 hover:underline cursor-pointer' : ''}`}
        onClick={e => { if (isAdmin) { e.stopPropagation(); setDateEdit(which); setDateVal((date || '').slice(0, 10)); }}}>
        {date ? fmtDate(date) : (isAdmin ? 'дата' : '—')}
      </span>
      {pendingDate && (
        <PendingChip pendingDate={pendingDate} pendingByName={pendingByName} stageId={stage?.id} slot={slot} canApprove={canApprove} onDone={onReload} />
      )}
    </div>
  );

  return (
    <td className="border border-gray-100 p-0 relative" style={{ height: '1px', padding: 0, ...groupBorderStyle }} ref={ref}>
      <div style={{ height: '100%', minHeight: '100%' }} className="flex flex-col dual-cell-wrapper">
        <SimpleRow which={1} st={st1} date={date1} open={open1} setOpen={setOpen1} pendingDate={stage?.execution_actual_pending} pendingByName={stage?.pending_by_name} slot={1} />
        <SimpleRow which={2} st={st2} date={date2} open={open2} setOpen={setOpen2} pendingDate={stage?.execution_actual_pending_2} pendingByName={stage?.pending_by_name} slot={2} />
      </div>
      {open1 && <Picker which={1} currentKey={safeStage.kanban_status} />}
      {open2 && (
        <div className="absolute bottom-0 left-full z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-52 ml-1 text-left whitespace-nowrap">
          {STATUSES.map(s => (
            <button key={s.key} onClick={async () => { setOpen2(false); await onUpdate(stage?.id, { kanban_status_2: s.key }, projectId, stageNum); }}
              className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 ${safeStage.kanban_status_2 === s.key ? 'font-semibold' : ''}`}>
              <StatusIcon type={s.key} size={14} /><span className={s.text}>{s.label}</span>
              {safeStage.kanban_status_2 === s.key && <span className="ml-auto text-gray-300">✓</span>}
            </button>
          ))}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button onClick={async () => { setOpen2(false); await onUpdate(stage?.id, { kanban_status_2: null }, projectId, stageNum); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50">✕ Очистить</button>
          </div>
        </div>
      )}
      {dateEdit && <DateOverlay />}
    </td>
  );
}

// ── StatusCell ────────────────────────────────────────────────
function StatusCell({ stage, projectId, stageNum, isAdmin, onUpdate, onReload, canApprove, groupBorderStyle = {} }) {
  const [open, setOpen] = useState(false);
  const [dateEdit, setDateEdit] = useState(false);
  const [dateVal, setDateVal] = useState('');
  const ref = useRef();

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!stage && !isAdmin) {
    return (
      <td className="border border-gray-100 text-center" style={groupBorderStyle}>
        <div className="text-gray-200 text-xs">—</div>
      </td>
    );
  }

  const st = STATUS_MAP[stage?.kanban_status];
  const date = stage?.execution_actual;
  const pendingDate = stage?.execution_actual_pending;
  const pendingByName = stage?.pending_by_name;

  const handleStatusPick = async (statusKey) => {
    setOpen(false);
    await onUpdate(stage?.id, { kanban_status: statusKey }, projectId, stageNum);
  };

  const handleDateSave = async () => {
    setDateEdit(false);
    await onUpdate(stage?.id, { execution_actual: dateVal }, projectId, stageNum);
  };

  return (
    <td className={`border border-gray-100 p-0 relative ${st ? st.bg : 'bg-white'}`} style={groupBorderStyle}>
      <div ref={ref} className="relative">
        <div
          onClick={() => isAdmin && setOpen(o => !o)}
          className={`flex flex-col items-center justify-center py-2 px-1 ${isAdmin ? 'cursor-pointer hover:brightness-95' : ''}`}
          style={{ gap: '0.6rem' }}
        >
          {st ? <StatusIcon type={stage?.kanban_status} size={20} /> : <span className="text-gray-200 text-lg">·</span>}
          {date ? (
            <span
              className={`text-[10px] font-semibold leading-none transition-colors ${st ? st.text : 'text-gray-400'} ${isAdmin ? 'hover:text-blue-500 hover:underline cursor-pointer' : ''}`}
              onClick={e => { if (isAdmin) { e.stopPropagation(); setDateEdit(true); setDateVal(date.slice(0, 10)); }}}
            >{fmtDate(date)}</span>
          ) : isAdmin ? (
            <span className="text-[10px] text-gray-300 leading-none hover:text-blue-500 hover:underline cursor-pointer transition-colors"
              onClick={e => { e.stopPropagation(); setDateEdit(true); setDateVal(''); }}>дата</span>
          ) : null}

          {/* Pending chip */}
          {pendingDate && (
            <PendingChip
              pendingDate={pendingDate}
              pendingByName={pendingByName}
              stageId={stage?.id}
              slot={1}
              canApprove={canApprove}
              onDone={onReload}
            />
          )}
        </div>

        {open && (
          <div className="absolute top-full left-0 z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-52 whitespace-nowrap" style={{ minWidth: 200 }}>
            {STATUSES.map(s => (
              <button key={s.key} onClick={() => handleStatusPick(s.key)}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${stage?.kanban_status === s.key ? 'font-semibold' : ''}`}>
                <StatusIcon type={s.key} size={16} />
                <span className={s.text}>{s.label}</span>
                {stage?.kanban_status === s.key && <span className="ml-auto text-gray-300">✓</span>}
              </button>
            ))}
            <div className="border-t border-gray-100 mt-1 pt-1">
              <button onClick={() => handleStatusPick(null)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:bg-gray-50">
                <span>✕</span> Очистить
              </button>
            </div>
          </div>
        )}

        {dateEdit && (
          <div className="absolute top-full left-0 z-30 bg-white border border-[#C0392B] rounded-lg shadow-lg p-2 w-36">
            <input type="date" autoFocus
              className="w-full text-xs border border-gray-200 rounded px-2 py-1 mb-2 focus:outline-none"
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

// ── TypesModal ────────────────────────────────────────────────
function TypesModal({ types, onClose, onCreated, onDeleted }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6b7280');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try { const t = await createProjectType({ name, color }); onCreated(t); setName(''); }
    catch {} finally { setSaving(false); }
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
            <input type="color" className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" value={color} onChange={e => setColor(e.target.value)} />
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

// ── SmartSortModal ────────────────────────────────────────────
function SmartSortModal({ cols, onApply, onClose, initial }) {
  const [selCols, setSelCols] = useState(initial?.cols || []);
  const [selStatuses, setSelStatuses] = useState(initial?.statuses || []);
  const [dateDir, setDateDir] = useState(initial?.dateDir || 'asc');
  const toggleCol = (key) => setSelCols(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key]);
  const toggleStatus = (key) => setSelStatuses(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key]);
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900">Умная сортировка</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">1. Выберите столбцы</div>
            <div className="flex flex-wrap gap-2">
              {cols.map(col => (
                <button key={col.key} onClick={() => toggleCol(col.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${selCols.includes(col.key) ? 'bg-[#C0392B] text-white border-[#C0392B]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                  {col.label}
                  {selCols.includes(col.key) && <span className="ml-0.5 text-[10px] bg-white/30 text-white rounded-full px-1.5 font-bold">{selCols.indexOf(col.key) + 1}</span>}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">2. Приоритет статусов</div>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map(s => (
                <button key={s.key} onClick={() => toggleStatus(s.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${selStatuses.includes(s.key) ? 'border-gray-400 bg-gray-50' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}>
                  <StatusIcon type={s.key} size={13} />
                  <span className={selStatuses.includes(s.key) ? s.text : 'text-gray-400'}>{s.label}</span>
                  {selStatuses.includes(s.key) && <span className="ml-1 text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5 font-bold">{selStatuses.indexOf(s.key) + 1}</span>}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">3. Сортировка по дате</div>
            <div className="flex gap-2">
              {[['asc','По возрастанию'],['desc','По убыванию'],['none','Не сортировать']].map(([v, label]) => (
                <button key={v} onClick={() => setDateDir(v)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${dateDir === v ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={() => onApply(null)} className="text-xs text-gray-400 hover:text-gray-600">Сбросить сортировку</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-medium rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50">Отмена</button>
            <button onClick={() => onApply(selCols.length > 0 ? { cols: selCols, statuses: selStatuses, dateDir } : null)}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#C0392B] hover:bg-[#a93226] text-white shadow-sm">
              Применить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function KanbanPage() {
  const { isAdmin, canApprove, canEdit } = useAuth();
  const nav = useNavigate();

  const [rows, setRows] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const tableRef = useRef();
  const [filterType, setFilterType] = usePersistentState('kanban_filterType', '');
  const [search, setSearch] = usePersistentState('kanban_search', '');
  const [showProblematic, setShowProblematic] = usePersistentState('kanban_problematic', false);
  const [dashFilter, setDashFilter] = useState(() => {
    try { const stored = localStorage.getItem('kanban_dash_filter'); return stored ? JSON.parse(stored) : null; } catch { return null; }
  });
  const [sortValue, setSortValue] = usePersistentState('kanban_sort', 'name_asc');
  const [statusFilter, setStatusFilter] = usePersistentState('kanban_statusFilter', []);
  const [smartSort, setSmartSort] = usePersistentState('kanban_smartSort', null);
  const [smartSortModal, setSmartSortModal] = useState(false);
  const [typesModal, setTypesModal] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  // canApprove = РП+admin могут менять статусы в канбане
  const cellAdmin = canApprove;

  const load = async () => {
    setLoading(true);
    try {
      const [data, typesData] = await Promise.all([getKanban(), getProjectTypes()]);
      setRows(data);
      setTypes(typesData);
      setFilterType(prev => (!prev && typesData.length > 0) ? String(typesData[0].id) : prev);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleUpdate = async (stageId, data, projectId, stageNum) => {
    const id = stageId || 'new';
    await patchKanbanStage(id, { ...data, ...(id === 'new' ? { project_id: projectId, stage_num: stageNum } : {}) });
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

  // Pending в рамках текущей вкладки типа
  const totalPending = rows.filter(p =>
    !filterType || String(p.project_type_id) === filterType
  ).reduce((acc, p) => {
    Object.values(p.stages || {}).forEach(s => {
      if (s.execution_actual_pending) acc++;
      if (s.execution_actual_pending_2) acc++;
    });
    return acc;
  }, 0);

  let visible = sortProjects(
    rows.filter(p => {
      if (dashFilter) return dashFilter.ids.includes(p.id);
      // Pending-only filter: только проекты текущей вкладки с ожиданием
      if (showPendingOnly) {
        if (filterType && String(p.project_type_id) !== filterType) return false;
        return Object.values(p.stages || {}).some(
          s => s.execution_actual_pending || s.execution_actual_pending_2
        );
      }
      if (showProblematic && p.issue_count === 0) return false;
      if (filterType && String(p.project_type_id) !== filterType) return false;
      if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter.length > 0) {
        const allStatuses = Object.values(p.stages || {}).flatMap(s => [s.kanban_status, s.kanban_status_2]).filter(Boolean);
        if (!statusFilter.some(sf => allStatuses.includes(sf))) return false;
      }
      return true;
    }),
    sortValue
  );

  if (smartSort?.cols?.length > 0) {
    visible = [...visible].sort((a, b) => {
      for (const colKey of smartSort.cols) {
        const col = KANBAN_COLS_ADMIN.concat(KANBAN_COLS_RESIDENTIAL).find(c => c.key === colKey);
        if (!col) continue;
        const sa = a.stages?.[col.stageNum];
        const sb = b.stages?.[col.stageNum];
        const statusScore = (s) => {
          if (!s) return 99;
          const st = s.kanban_status;
          if (smartSort.statuses?.length > 0) { const idx = smartSort.statuses.indexOf(st); return idx >= 0 ? idx : 98; }
          const order = ['not_provided','needs_correction','in_progress','developed','done','not_required'];
          const i = order.indexOf(st); return i >= 0 ? i : 97;
        };
        const scoreDiff = statusScore(sa) - statusScore(sb);
        if (scoreDiff !== 0) return scoreDiff;
        if (smartSort.dateDir) {
          const da = sa?.execution_actual || sa?.deadline_directive || '';
          const db = sb?.execution_actual || sb?.deadline_directive || '';
          if (da !== db) return smartSort.dateDir === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
        }
      }
      return 0;
    });
  }

  const activeType = types.find(t => String(t.id) === filterType);
  const KANBAN_COLS = activeType?.kanban_type === 'residential' ? KANBAN_COLS_RESIDENTIAL : KANBAN_COLS_ADMIN;
  const GROUPS = [...new Set(KANBAN_COLS.map(c => c.group))];
  const groupedCols = GROUPS.map(g => ({ group: g, cols: KANBAN_COLS.filter(c => c.group === g) }));

  const thCls = 'border border-gray-100 bg-gray-50 text-[11px] font-semibold text-gray-500 text-center px-1 py-2 leading-tight align-middle';
  const thFixedCls = 'border border-gray-100 bg-gray-50 text-[11px] font-semibold text-gray-500 text-center px-1 py-2 whitespace-nowrap align-middle';

  return (
    <div className="print-kanban-root flex flex-col h-full" style={{ height: 'calc(100vh - 56px - 48px)' }}>

      {/* Type tabs */}
      {types.length > 0 && !dashFilter && (
        <div className="mb-5 print-hide">
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
      <div className="print-hide flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Сводный канбан</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-sm text-gray-400">{visible.length} объект(ов)</p>
            {/* Pending badge — кликабельный фильтр для PM/admin */}
            {canApprove && totalPending > 0 && (
              <button
                onClick={() => setShowPendingOnly(p => !p)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                  showPendingOnly
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                }`}>
                🕐 {totalPending} на утверждении
                {showPendingOnly && <span className="ml-1.5 text-[10px] opacity-80">× сбросить</span>}
              </button>
            )}
          </div>
          {dashFilter && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-semibold text-white bg-[#C0392B] px-2.5 py-1 rounded-full">{dashFilter.label}</span>
              <button onClick={clearDashFilter} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">× сбросить фильтр</button>
            </div>
          )}
          {showPendingOnly && !dashFilter && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-amber-500 px-2.5 py-1 rounded-full">
                🕐 Только ожидающие утверждения
              </span>
              <button onClick={() => setShowPendingOnly(false)} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">× сбросить</button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SortSelect value={sortValue} onChange={setSortValue} />
          {!dashFilter && (
            <>
              <input
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:border-[#C0392B] transition-all w-52"
                placeholder="Поиск по названию..."
                value={search} onChange={e => setSearch(e.target.value)}
              />
              <button onClick={() => setShowProblematic(p => !p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${showProblematic ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-500 border-gray-200 hover:border-red-400 hover:text-red-600'}`}>
                ⚠ Проблемные
              </button>
              <button onClick={() => setSmartSortModal(true)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${smartSort ? 'bg-[#C0392B] text-white border-[#C0392B]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#C0392B] hover:text-[#C0392B]'}`}>
                {smartSort ? `⇅ Сортировка (${smartSort.cols.length})` : '⇅ Сортировка'}
              </button>
              {smartSort && (
                <button onClick={() => setSmartSort(null)}
                  className="px-2 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-red-500 hover:border-red-300 transition-all">✕</button>
              )}
            </>
          )}
          {canEdit && !dashFilter && (
            <button onClick={() => nav('/settings')}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-all">
              ⚙ Настройки
            </button>
          )}
          <button onClick={() => { if (tableRef.current) exportToPDF(tableRef.current, activeType?.name || 'Все объекты'); }}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-all">
            ⬇ PDF
          </button>
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
        {canApprove && totalPending > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium ml-2 pl-2 border-l border-gray-200">
            <span>🕐</span>
            <span>Нажмите на дату в ячейке для утверждения</span>
          </div>
        )}
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
          <div className="overflow-auto flex-1" ref={tableRef}>
            <table className="border-collapse w-full" style={{ tableLayout: 'fixed', minWidth: 900 }}>
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className={`${thFixedCls} w-8`} rowSpan={2}>№</th>
                  <th className={`${thFixedCls} text-left`} style={{ width: '16%', borderRight: '1.5px solid #d1d5db' }} rowSpan={2}>Объект</th>
                  <th className={`${thFixedCls}`} style={{ width: '7%', borderRight: '1.5px solid #d1d5db' }} rowSpan={2}>Договор</th>
                  {groupedCols.map(({ group, cols }, gi) => (
                    <th key={group} className={`${thFixedCls} text-center font-bold`} colSpan={cols.length}
                      style={{ borderRight: gi < groupedCols.length - 1 ? '1.5px solid #d1d5db' : undefined }}>
                      <span className={`px-2 py-0.5 rounded ${GROUP_COLORS[group] || ''}`}>{group}</span>
                    </th>
                  ))}
                  <th className={`${thFixedCls}`} style={{ width: '11%', borderLeft: '1.5px solid #d1d5db' }} rowSpan={2}>Примечание</th>
                </tr>
                <tr>
                  {KANBAN_COLS.map(col => (
                    <th key={col.key} className={thCls}
                      style={{ maxWidth: 56, borderRight: col.groupEnd ? '1.5px solid #d1d5db' : undefined }}>
                      {col.labelLines ? (
                        <div className="text-[10px] leading-tight text-center">
                          {col.labelLines.map((line, i) => <div key={i}>{line}</div>)}
                        </div>
                      ) : col.label.length > 10 ? (
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
                  const hasStages = Object.keys(p.stages || {}).length > 0;
                  // Check if this project has pending
                  const projectPending = Object.values(p.stages || {}).some(s => s.execution_actual_pending || s.execution_actual_pending_2);

                  return (
                    <tr key={p.id} className={`hover:bg-gray-50/50 transition-colors ${isProblematic ? 'border-l-2 border-l-red-400' : ''} ${projectPending && canApprove ? 'border-l-2 border-l-amber-400' : ''}`}>
                      <td className="border border-gray-100 text-center text-xs text-gray-400 px-2 py-2">{idx + 1}</td>

                      <td className="border border-gray-100 px-3 py-2" style={{ borderRight: '1.5px solid #d1d5db' }}>
                        <button onClick={() => nav(`/projects/${p.id}`)}
                          className="text-xs font-semibold text-gray-800 hover:text-[#C0392B] text-left leading-snug transition-colors block w-full break-words">
                          {p.name}
                        </button>
                        {p.address && <div className="text-[10px] text-gray-400 mt-0.5 leading-snug text-left">📍 {p.address}</div>}
                        {p.area_total && (
                          <div className="text-[10px] text-gray-500 mt-0.5 font-medium text-left">
                            {Number(p.area_total).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} м²
                          </div>
                        )}
                        <div className="print-hide mt-1 flex items-center gap-1.5 flex-wrap">
                          {p.type_name && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
                              style={{ background: p.type_color || '#6b7280' }}>
                              {p.type_name}
                            </span>
                          )}
                          {canEdit && (
                            <button onClick={() => setAssigningId(p.id)}
                              className="text-[10px] text-gray-300 hover:text-[#C0392B] transition-colors">
                              {p.type_name ? '✏' : '+ тип'}
                            </button>
                          )}
                          {isProblematic && <span className="text-[10px] text-red-500 font-semibold">⚠ {p.issue_count} пр.</span>}
                          {projectPending && canApprove && (
                            <button onClick={() => nav(`/projects/${p.id}?tab=2`)}
                              className="text-[10px] text-amber-600 font-semibold hover:underline">
                              🕐 ожидают
                            </button>
                          )}
                          {!hasStages && isAdmin && <span className="text-[9px] text-gray-400 italic">нет этапов</span>}
                        </div>
                      </td>

                      <td className="border border-gray-100 px-2 py-2 text-center" style={{ borderRight: '1.5px solid #d1d5db' }}>
                        <span className="text-[11px] text-gray-600">{p.contract_pir || '—'}</span>
                      </td>

                      {(() => {
                        if (!hasStages) {
                          return KANBAN_COLS.map(col => (
                            <td key={col.key} className="border border-gray-100 p-0 bg-gray-50/50"
                              style={col.groupEnd ? { borderRight: '1.5px solid #d1d5db' } : {}}>
                              <div className="text-gray-200 text-center text-[8px] py-2">—</div>
                            </td>
                          ));
                        }
                        return KANBAN_COLS.map(col => {
                          const groupBorderStyle = col.groupEnd ? { borderRight: '1.5px solid #d1d5db' } : {};
                          const stage = p.stages[col.stageNum];
                          const cellProps = {
                            stage, isAdmin: cellAdmin, onUpdate: handleUpdate, onReload: load, canApprove,
                            groupBorderStyle, projectId: p.id, stageNum: col.stageNum,
                            date1Field: col.date1Field, date2Field: col.date2Field,
                          };
                          if (col.dual) return <DualStatusCell key={col.key} {...cellProps} />;
                          if (col.dualSimple) return <DualSimpleCell key={col.key} {...cellProps} />;
                          return <StatusCell key={col.key} {...cellProps} />;
                        });
                      })()}

                      <td className="border border-gray-100 px-2 py-2" style={{ borderLeft: '1.5px solid #d1d5db' }}>
                        {p.issues_preview?.length > 0 ? (
                          <button onClick={() => nav(`/projects/${p.id}#issues`)}
                            className="text-left w-full space-y-1">
                            {p.issues_preview.map((iss, i) => (
                              <div key={i} className="flex items-start gap-1">
                                <span className="text-red-400 text-[9px] leading-tight flex-shrink-0 mt-0.5">▸</span>
                                <span className="text-[10px] text-gray-600 leading-snug line-clamp-2">{iss}</span>
                              </div>
                            ))}
                            {parseInt(p.issue_count) > 3 && (
                              <div className="text-[9px] text-gray-400">+{parseInt(p.issue_count) - 3} ещё</div>
                            )}
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

      {/* Type assignment modal */}
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
                <div className="w-3 h-3 rounded-full bg-gray-300" />Без типа
              </button>
              {types.map(t => (
                <button key={t.id} onClick={() => handleAssignType(assigningId, t.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-800 transition-all">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.color }} />
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {smartSortModal && (
        <SmartSortModal cols={KANBAN_COLS} initial={smartSort}
          onApply={v => { setSmartSort(v); setSmartSortModal(false); }}
          onClose={() => setSmartSortModal(false)} />
      )}

      {typesModal && (
        <TypesModal types={types} onClose={() => setTypesModal(false)}
          onCreated={handleTypeCreated} onDeleted={handleTypeDeleted} />
      )}
    </div>
  );
}
