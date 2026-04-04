import { useState, useEffect } from 'react';
import { getPending, approveDate, rejectDate } from '../api/client';

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getFullYear()).slice(2)}`;
}
function fmtDt(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${fmtDate(d)} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
}

export default function PendingApprovalPanel({ projectId, projectName, onClose, onApproved }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPending(projectId);
      setItems(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [projectId]);

  const act = async (id, action, slot) => {
    const key = `${id}_${slot}`;
    setProcessing(p => ({ ...p, [key]: true }));
    try {
      if (action === 'approve') await approveDate(id, slot);
      else await rejectDate(id, slot);
      await load();
      onApproved?.();
    } finally {
      setProcessing(p => ({ ...p, [key]: false }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <span className="font-semibold text-gray-900">Ожидают утверждения</span>
            <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{projectName}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Загрузка...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Нет дат на утверждении</div>
          ) : (
            <div className="space-y-3">
              {items.flatMap(item => {
                const rows = [];
                if (item.execution_actual_pending) {
                  rows.push({ id: item.id, slot: 1, date: item.execution_actual_pending, item });
                }
                if (item.execution_actual_pending_2) {
                  rows.push({ id: item.id, slot: 2, date: item.execution_actual_pending_2, item });
                }
                return rows;
              }).map(({ id, slot, date, item }) => (
                <div key={`${id}_${slot}`}
                  className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-800 truncate">
                      {item.stage_name || ''}{item.sub_stage_name ? ` / ${item.sub_stage_name}` : ''}{slot === 2 ? ' (2-й этап)' : ''}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-amber-700">{fmtDate(date)}</span>
                      <span className="text-[10px] text-gray-400">
                        предложил <span className="font-medium text-gray-600">{item.pending_by_name || '?'}</span>
                        {item.pending_at ? ` · ${fmtDt(item.pending_at)}` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <button
                      disabled={processing[`${id}_${slot}`]}
                      onClick={() => act(id, 'approve', slot)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-green-500 hover:bg-green-600 text-white border border-green-500 transition-all disabled:opacity-50">
                      Утвердить
                    </button>
                    <button
                      disabled={processing[`${id}_${slot}`]}
                      onClick={() => act(id, 'reject', slot)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50">
                      Отклонить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
