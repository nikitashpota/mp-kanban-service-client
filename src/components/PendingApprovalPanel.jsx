import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001/api';

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
      const { data } = await axios.get(`${API}/pending/${projectId}`);
      setItems(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [projectId]);

  const act = async (id, action, slot) => {
    setProcessing(p => ({ ...p, [`${id}_${slot}`]: true }));
    try {
      await axios.post(`${API}/pending/${action}/${id}`, { slot });
      await load();
      onApproved?.();
    } finally {
      setProcessing(p => ({ ...p, [`${id}_${slot}`]: false }));
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Загрузка...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Нет дат на утверждении</div>
          ) : (
            <div className="space-y-3">
              {items.map(item => {
                const rows = [];
                if (item.execution_actual_pending) {
                  rows.push({ slot: 1, date: item.execution_actual_pending });
                }
                if (item.execution_actual_pending_2) {
                  rows.push({ slot: 2, date: item.execution_actual_pending_2 });
                }
                return rows.map(({ slot, date }) => (
                  <div key={`${item.id}_${slot}`}
                    className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-800 truncate">
                        {item.stage_name || ''} {item.sub_stage_name ? `/ ${item.sub_stage_name}` : ''}{slot === 2 ? ' (2эт)' : ''}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold text-amber-700">{fmtDate(date)}</span>
                        <span className="text-[10px] text-gray-400">
                          предложил <span className="font-medium text-gray-600">{item.pending_by_name}</span> · {fmtDt(item.pending_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        disabled={processing[`${item.id}_${slot}`]}
                        onClick={() => act(item.id, 'approve', slot)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-green-500 hover:bg-green-600 text-white transition-all disabled:opacity-50">
                        ✓ Утвердить
                      </button>
                      <button
                        disabled={processing[`${item.id}_${slot}`]}
                        onClick={() => act(item.id, 'reject', slot)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-red-200 text-red-500 hover:bg-red-50 transition-all disabled:opacity-50">
                        ✕
                      </button>
                    </div>
                  </div>
                ));
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
