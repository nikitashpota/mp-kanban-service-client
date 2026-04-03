import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getProject, getPassport, savePassportHeader,
  patchPassportStage, savePassportIssues, initPassport
} from '../api/client';
import { useAuth } from '../context/AuthContext';

// ── Helpers ──────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function toInputDate(d) {
  if (!d) return '';
  return d.slice(0, 10);
}

function readinessCls(v) {
  const n = parseInt(v) || 0;
  if (n === 100) return 'bg-green-100 text-green-700';
  if (n >= 70)   return 'bg-blue-100 text-blue-700';
  if (n >= 30)   return 'bg-amber-100 text-amber-700';
  if (n > 0)     return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-400';
}

// ── Editable cell ─────────────────────────────────────────────
function EditCell({ value, type = 'text', onSave, placeholder = '', cls = '' }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');

  useEffect(() => { setVal(value || ''); }, [value]);

  const commit = () => {
    setEditing(false);
    if (val !== (value || '')) onSave(val);
  };

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        className={`min-h-[24px] cursor-pointer hover:bg-brand-50 hover:rounded px-1 py-0.5 transition-colors ${cls} ${!value ? 'text-gray-300 italic text-xs' : ''}`}
      >
        {type === 'date' ? fmtDate(value) : (value || placeholder)}
      </div>
    );
  }

  return (
    <input
      autoFocus
      type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
      className="w-full px-1.5 py-0.5 border border-brand-400 rounded text-xs focus:outline-none bg-white"
      value={type === 'date' ? toInputDate(val) : val}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
      min={type === 'number' ? 0 : undefined}
      max={type === 'number' ? 100 : undefined}
    />
  );
}

// ── Header edit modal ─────────────────────────────────────────
function HeaderModal({ data, onSave, onClose }) {
  const [form, setForm] = useState({
    customer: data?.customer || '',
    functional_customer: data?.functional_customer || '',
    general_designer: data?.general_designer || '',
    developer: data?.developer || '',
    aip_cost: data?.aip_cost || '',
    completion_date: data?.completion_date || '',
    contract_pir: data?.contract_pir || '',
    area_total: data?.area_total || '',
  });
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 bg-white transition-all';

  const FIELDS = [
    ['customer', 'Заказчик'],
    ['functional_customer', 'Функциональный заказчик'],
    ['general_designer', 'Генеральный проектировщик'],
    ['developer', 'Застройщик'],
    ['area_total', 'Общая площадь объекта'],
    ['aip_cost', 'Стоимость реализации по АИП'],
    ['completion_date', 'Срок ввода'],
    ['contract_pir', 'Договор на ПИР'],
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900">Реквизиты паспорта</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
          {FIELDS.map(([field, label]) => (
            <div key={field}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
              <input className={inputCls} value={form[field]} onChange={set(field)} />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all">Отмена</button>
          <button onClick={() => onSave(form)} className="px-4 py-2 text-sm font-semibold rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all">Сохранить</button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function PassportPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { isAdmin, canApprove } = useAuth();

  const [project, setProject] = useState(null);
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [headerModal, setHeaderModal] = useState(false);
  const [issues, setIssues] = useState([]);
  const [issuesDirty, setIssuesDirty] = useState(false);
  const [savingIssues, setSavingIssues] = useState(false);

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [proj, pass] = await Promise.all([getProject(id), getPassport(id)]);
      setProject(proj.project);
      setPassport(pass);
      setIssues(pass.issues.length > 0 ? pass.issues : [{ problem: '', solution: '' }, { problem: '', solution: '' }, { problem: '', solution: '' }]);
    } catch (e) {
      flash('Ошибка загрузки', 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleInit = async () => {
    try {
      await initPassport(id);
      flash('Паспорт инициализирован — этапы созданы');
      load();
    } catch (err) {
      flash(err.response?.data?.error || 'Ошибка', 'error');
    }
  };

  const handleSaveHeader = async (form) => {
    try {
      await savePassportHeader(id, form);
      flash('Реквизиты сохранены');
      setHeaderModal(false);
      load();
    } catch { flash('Ошибка', 'error'); }
  };

  const handlePatchStage = async (stageId, field, value) => {
    try {
      await patchPassportStage(id, stageId, { [field]: value });
      load();
    } catch { flash('Ошибка сохранения ячейки', 'error'); }
  };

  const handleSaveIssues = async () => {
    setSavingIssues(true);
    try {
      await savePassportIssues(id, issues);
      flash('Проблемные вопросы сохранены');
      setIssuesDirty(false);
    } catch { flash('Ошибка', 'error'); }
    finally { setSavingIssues(false); }
  };

  const addIssueRow = () => {
    setIssues(p => [...p, { problem: '', solution: '' }]);
    setIssuesDirty(true);
  };
  const removeIssueRow = (i) => {
    setIssues(p => p.filter((_, idx) => idx !== i));
    setIssuesDirty(true);
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 rounded-full border-[3px] border-gray-200 border-t-brand-500 animate-spin" />
    </div>
  );

  const { header, stages } = passport || { header: null, stages: [] };

  const thCls = 'px-3 py-2.5 text-[11px] font-semibold text-gray-500 bg-gray-50 border-b border-r border-gray-100 text-center whitespace-nowrap';
  const tdBase = 'px-2 py-1.5 border-b border-r border-gray-100 text-xs align-middle';

  return (
    <>
      {msg && (
        <div className={`mb-4 px-4 py-2.5 rounded-xl text-sm border ${msg.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
          {msg.text}
        </div>
      )}

      {/* Top nav */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => nav(`/projects/${id}`)} className="text-sm text-gray-400 hover:text-brand-600 transition-colors">
            ← К объекту
          </button>
          <span className="text-gray-200">/</span>
          <h1 className="text-lg font-bold text-gray-900">Паспорт объекта</h1>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button onClick={() => setHeaderModal(true)} className="px-3 py-1.5 text-xs font-medium rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all border border-gray-200">
              Редактировать реквизиты
            </button>
            {stages.length === 0 && (
              <button onClick={handleInit} className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all">
                Создать паспорт (загрузить этапы)
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Header card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 text-sm font-semibold text-gray-800">
          {project?.name || 'Объект'}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-gray-100">
          {[
            ['Заказчик', header?.customer],
            ['Функциональный заказчик', header?.functional_customer],
            ['Генеральный проектировщик', header?.general_designer],
            ['Застройщик', header?.developer],
            ['Общая площадь', header?.area_total],
            ['Стоимость по АИП', header?.aip_cost],
            ['Срок ввода', header?.completion_date],
            ['Договор на ПИР', header?.contract_pir],
          ].map(([label, value]) => (
            <div key={label} className="px-4 py-3">
              <div className="text-[10px] font-semibold text-brand-500 uppercase tracking-wide mb-0.5">{label}</div>
              <div className="text-sm font-medium text-gray-800">{value || <span className="text-gray-300 italic font-normal text-xs">не указано</span>}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stages table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-800">Этапы проектирования</span>
          {canEdit && stages.length > 0 && (
            <span className="text-xs text-gray-400">Кликните на ячейку для редактирования</span>
          )}
        </div>

        {stages.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400">
            <div className="text-3xl mb-2">📋</div>
            Этапы не созданы
            {canEdit && (
              <div className="mt-3">
                <button onClick={handleInit} className="px-4 py-2 text-sm font-semibold rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all">
                  Создать паспорт (загрузить этапы)
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th className={thCls} style={{ width: 36 }}>№</th>
                  <th className={thCls} style={{ width: 160 }}>Этап</th>
                  <th className={thCls} style={{ width: 180 }}>Подэтап / детализация</th>
                  <th className={thCls} style={{ width: 70 }}>Готовность</th>
                  <th className={thCls} style={{ width: 100 }}>Срок (договор)</th>
                  <th className={thCls} style={{ width: 100 }}>Срок (директивный)</th>
                  <th className={thCls} style={{ width: 100 }}>Исп. плановое</th>
                  <th className={thCls} style={{ width: 100 }}>Исп. фактическое</th>
                  <th className={thCls} style={{ width: 90 }}>Отв.</th>
                  <th className={thCls}>Примечание</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((s, i) => {
                  const isSubOnly = !s.stage_num && !s.stage_name && s.sub_stage_name;
                  const isGroupHeader = s.stage_name && s.sub_stage_name;
                  const readiness = parseInt(s.readiness) || 0;

                  return (
                    <tr key={s.id} className={`hover:bg-gray-50/50 transition-colors ${isSubOnly ? 'bg-gray-50/30' : ''}`}>
                      <td className={`${tdBase} text-center text-gray-400 font-mono text-[11px]`}>{s.stage_num || ''}</td>

                      {/* Stage name */}
                      <td className={`${tdBase} font-semibold text-gray-800 ${isSubOnly ? 'pl-6' : ''}`}>
                        {canEdit
                          ? <EditCell value={s.stage_name} onSave={v => handlePatchStage(s.id, 'stage_name', v)} placeholder="—" />
                          : (s.stage_name || '')}
                      </td>

                      {/* Sub-stage */}
                      <td className={`${tdBase} text-gray-600`}>
                        {canEdit
                          ? <EditCell value={s.sub_stage_name} onSave={v => handlePatchStage(s.id, 'sub_stage_name', v)} placeholder="—" />
                          : (s.sub_stage_name || '')}
                      </td>

                      {/* Readiness */}
                      <td className={`${tdBase} text-center`}>
                        <div className="flex items-center justify-center">
                          {canEdit ? (
                            <EditCell
                              value={s.readiness ? String(s.readiness) : ''}
                              type="number"
                              onSave={v => handlePatchStage(s.id, 'readiness', v)}
                              placeholder="0"
                              cls="text-center w-12"
                            />
                          ) : null}
                          {readiness > 0 && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-1 ${readinessCls(readiness)}`}>
                              {readiness}%
                            </span>
                          )}
                          {!isAdmin && !readiness && <span className="text-gray-300 text-xs">—</span>}
                        </div>
                      </td>

                      {/* Dates */}
                      {['deadline_contract', 'deadline_directive', 'execution_planned', 'execution_actual'].map(field => (
                        <td key={field} className={`${tdBase} text-center`}>
                          {canEdit
                            ? <EditCell value={s[field]} type="date" onSave={v => handlePatchStage(s.id, field, v)} placeholder="—" cls="text-center text-xs" />
                            : <span className="text-gray-600">{fmtDate(s[field])}</span>}
                        </td>
                      ))}

                      {/* Responsible */}
                      <td className={`${tdBase}`}>
                        {canEdit
                          ? <EditCell value={s.responsible} onSave={v => handlePatchStage(s.id, 'responsible', v)} placeholder="—" />
                          : (s.responsible || <span className="text-gray-300">—</span>)}
                      </td>

                      {/* Note */}
                      <td className={`${tdBase}`}>
                        {canEdit
                          ? <EditCell value={s.note} onSave={v => handlePatchStage(s.id, 'note', v)} placeholder="—" />
                          : (s.note || <span className="text-gray-300">—</span>)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Issues table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-800">Проблемные вопросы</span>
          {canEdit && (
            <div className="flex gap-2">
              {issuesDirty && (
                <button onClick={handleSaveIssues} disabled={savingIssues} className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all">
                  {savingIssues ? 'Сохранение...' : 'Сохранить'}
                </button>
              )}
              <button onClick={addIssueRow} className="px-3 py-1.5 text-xs font-medium rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-all">
                + Добавить
              </button>
            </div>
          )}
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thCls} style={{ width: 36 }}>№</th>
              <th className={`${thCls} text-left`}>Проблемный вопрос</th>
              <th className={`${thCls} text-left`}>Необходимые решения</th>
              {canEdit && <th className={thCls} style={{ width: 40 }} />}
            </tr>
          </thead>
          <tbody>
            {issues.map((iss, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className={`${tdBase} text-center text-gray-400`}>{i + 1}</td>
                <td className={tdBase}>
                  {canEdit ? (
                    <textarea
                      className="w-full text-xs px-2 py-1 border-0 focus:outline-none bg-transparent resize-none min-h-[48px]"
                      value={iss.problem || ''}
                      placeholder="Описание проблемы..."
                      onChange={e => { const n = [...issues]; n[i] = { ...n[i], problem: e.target.value }; setIssues(n); setIssuesDirty(true); }}
                    />
                  ) : <span className="text-sm text-gray-700">{iss.problem}</span>}
                </td>
                <td className={tdBase}>
                  {canEdit ? (
                    <textarea
                      className="w-full text-xs px-2 py-1 border-0 focus:outline-none bg-transparent resize-none min-h-[48px]"
                      value={iss.solution || ''}
                      placeholder="Необходимые действия..."
                      onChange={e => { const n = [...issues]; n[i] = { ...n[i], solution: e.target.value }; setIssues(n); setIssuesDirty(true); }}
                    />
                  ) : <span className="text-sm text-gray-700">{iss.solution}</span>}
                </td>
                {canEdit && (
                  <td className={`${tdBase} text-center`}>
                    <button onClick={() => removeIssueRow(i)} className="text-gray-300 hover:text-red-500 transition-colors text-sm">✕</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Header modal */}
      {headerModal && (
        <HeaderModal data={header} onSave={handleSaveHeader} onClose={() => setHeaderModal(false)} />
      )}
    </>
  );
}
