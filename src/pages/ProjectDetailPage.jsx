import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  getProject, uploadPhotos, deletePhoto, setPhotoType,
  addContact, updateContact, deleteContact,
  saveNetworks, savePassportHeader, patchPassportStage,
  savePassportIssues, initPassportV2, importPassportXlsx, deleteProject, photoUrl
} from '../api/client';
import { useAuth } from '../context/AuthContext';

// ── Utils ─────────────────────────────────────────────────────
const fmtDate = d => d ? new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const toInputDate = d => d ? d.slice(0, 10) : '';

const KANBAN_STATUS_COLORS = {
  done:             { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
  not_provided:     { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
  needs_correction: { bg: '#fffbeb', border: '#fed7aa', text: '#d97706' },
  in_progress:      { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb' },
  not_required:     { bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280' },
  developed:        { bg: '#ecfeff', border: '#a5f3fc', text: '#0891b2' },
};

const readinessCls = v => {
  const n = parseInt(v) || 0;
  if (n === 100) return 'bg-green-100 text-green-700';
  if (n >= 70)   return 'bg-blue-100 text-blue-700';
  if (n >= 30)   return 'bg-amber-100 text-amber-700';
  if (n > 0)     return 'bg-red-100 text-red-700';
  return '';
};

const DEFAULT_NETWORKS = [
  { name: 'Теплосеть', specification: 'd=' },
  { name: 'Водопровод (чугун)', specification: 'd=' },
  { name: 'Канализация (чугун, керамика, асбоцемент)', specification: 'd=' },
  { name: 'Газопровод (сталь, полиэтилен)', specification: 'd=' },
  { name: 'Телефонная канализация', specification: '3 отв.' },
  { name: 'Кабельная линия', specification: 'd=' },
  { name: 'Кабель наружного освещения', specification: '1к' },
];

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 bg-white transition-all';
const thCls = 'px-3 py-2 text-[11px] font-semibold text-gray-500 bg-gray-50 border-b border-r border-gray-100 text-center whitespace-nowrap';
const tdCls = 'px-2 py-1.5 border-b border-r border-gray-100 text-xs align-middle';

// ── Inline editable cell ──────────────────────────────────────
function EC({ value, type = 'text', onSave, placeholder = '' }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');
  useEffect(() => setVal(value || ''), [value]);
  const commit = () => { setEditing(false); if (val !== (value || '')) onSave(val); };
  if (!editing) return (
    <div onClick={() => setEditing(true)}
      className={`min-h-[22px] cursor-pointer hover:bg-brand-50 hover:rounded px-1 py-0.5 transition-colors text-xs leading-relaxed ${!value ? 'text-gray-300 italic' : ''}`}>
      {type === 'date' ? fmtDate(value) : (value || placeholder)}
    </div>
  );
  return <input autoFocus type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
    className="w-full px-1.5 py-0.5 border border-brand-400 rounded text-xs focus:outline-none bg-white"
    value={type === 'date' ? toInputDate(val) : val}
    onChange={e => setVal(e.target.value)}
    onBlur={commit}
    onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
    min={type === 'number' ? 0 : undefined} max={type === 'number' ? 100 : undefined} />;
}

// ── Photo slot ────────────────────────────────────────────────
function PhotoSlot({ type, photo, photos, isAdmin, onAssign, onUpload, label }) {
  const [showPicker, setShowPicker] = useState(false);
  const fileRef = useRef();
  return (
    <div>
      <div className="rounded-xl overflow-hidden bg-gray-100 aspect-[4/3] relative group">
        {photo
          ? <img src={photoUrl(photo.filename)} alt={label} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-1">
              <span className="text-2xl">📷</span>
              <span className="text-xs px-2 text-center">{label}</span>
            </div>
        }
        {isAdmin && (
          <div className="absolute inset-0 bg-black/0 hover:bg-black/35 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-all rounded-xl">
            <button onClick={() => setShowPicker(true)} className="bg-white/90 text-gray-800 text-xs px-2.5 py-1.5 rounded-lg font-medium">Выбрать</button>
            <button onClick={() => fileRef.current.click()} className="bg-brand-500/90 text-white text-xs px-2.5 py-1.5 rounded-lg font-medium">Загрузить</button>
          </div>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-400 text-center leading-tight">{label}</p>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { if (e.target.files[0]) onUpload(type, e.target.files[0]); e.target.value = ''; }} />
      {showPicker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPicker(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-gray-900">Выбрать: {label}</span>
              <button onClick={() => setShowPicker(false)} className="text-gray-400">✕</button>
            </div>
            {photos.length === 0 ? <p className="text-center py-8 text-gray-400 text-sm">Нет загруженных фото</p> : (
              <div className="grid grid-cols-3 gap-3">
                {photos.map(p => (
                  <div key={p.id} onClick={() => { onAssign(p.id, type); setShowPicker(false); }}
                    className={`aspect-square rounded-lg overflow-hidden cursor-pointer ring-2 transition-all hover:ring-brand-400 ${p.photo_type === type ? 'ring-brand-500' : 'ring-transparent'}`}>
                    <img src={photoUrl(p.filename)} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────
function Modal({ title, onClose, onSave, children, wide }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto w-full ${wide ? 'max-w-2xl' : 'max-w-lg'}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <span className="font-semibold text-gray-900">{title}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <div className="p-6 space-y-4">{children}</div>
        {onSave && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all">Отмена</button>
            <button onClick={onSave} className="px-4 py-2 text-sm font-semibold rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all">Сохранить</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</label>{children}</div>;
}

// ══════════════════════════════════════════════════════════════
export default function ProjectDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const { isAdmin, canEdit, canApprove } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [activeBlock, setActiveBlock] = useState(1); // 1 = Сводка, 2 = ТЭП

  const [networks, setNetworks] = useState([]);
  const [networksDirty, setNetworksDirty] = useState(false);
  const [savingNetworks, setSavingNetworks] = useState(false);

  const [issues, setIssues] = useState([{ problem: '', solution: '' }, { problem: '', solution: '' }]);
  const [issuesDirty, setIssuesDirty] = useState(false);
  const [savingIssues, setSavingIssues] = useState(false);

  const [passportModal, setPassportModal] = useState(false);
  const [passportForm, setPassportForm] = useState({});

  const [contactModal, setContactModal] = useState(null);
  const [contactForm, setContactForm] = useState({ legal_entity: '', position: '', person_name: '', email: '' });

  const [lightIndex, setLightIndex] = useState(null); // lightbox

  const galleryInputRef = useRef();
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getProject(id);
      setData(d);
      setNetworks(d.networks?.length > 0 ? d.networks : DEFAULT_NETWORKS.map((n, i) => ({ ...n, id: null, sort_order: i })));
      setIssues(d.passportIssues?.length > 0 ? d.passportIssues : [{ problem: '', solution: '' }, { problem: '', solution: '' }]);
      setPassportForm({
        customer: d.passport?.customer || '',
        functional_customer: d.passport?.functional_customer || '',
        general_designer: d.passport?.general_designer || '',
        developer: d.passport?.developer || '',
        aip_cost: d.passport?.aip_cost || '',
        completion_date: d.passport?.completion_date || '',
        contract_pir: d.passport?.contract_pir || '',
        area_total: d.passport?.area_total || '',
      });
    } catch { flash('Ошибка загрузки', 'error'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Handle #issues hash — switch to block 2 and scroll
  useEffect(() => {
    if (location.hash === '#issues' && !loading) {
      setActiveBlock(2);
      setTimeout(() => {
        const el = document.getElementById('issues');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [location.hash, loading]);

  // Photos
  const handleUploadTyped = async (type, file) => {
    try {
      const uploaded = await uploadPhotos(id, [file]);
      if (uploaded[0]) await setPhotoType(id, uploaded[0].id, type);
      flash('Фото загружено'); load();
    } catch { flash('Ошибка загрузки', 'error'); }
  };
  const handleAssignType = async (photoId, type) => {
    try { await setPhotoType(id, photoId, type); flash('Тип фото установлен'); load(); }
    catch { flash('Ошибка', 'error'); }
  };
  const handleUploadGallery = async (e) => {
    const files = Array.from(e.target.files); if (!files.length) return;
    try { await uploadPhotos(id, files); flash('Фото добавлены'); load(); }
    catch { flash('Ошибка', 'error'); }
    finally { e.target.value = ''; }
  };
  const handleDeletePhoto = async (photoId) => {
    if (!confirm('Удалить фото?')) return;
    try { await deletePhoto(id, photoId); flash('Удалено'); load(); }
    catch { flash('Ошибка', 'error'); }
  };

  // Passport header
  const handleSavePassport = async () => {
    try { await savePassportHeader(id, passportForm); flash('Реквизиты сохранены'); setPassportModal(false); load(); }
    catch { flash('Ошибка', 'error'); }
  };
  const handleInitPassport = async () => {
    try { await initPassportV2(id); flash('Этапы созданы'); load(); }
    catch (err) { flash(err.response?.data?.error || 'Ошибка', 'error'); }
  };

  const importRef = useRef();
  const handleImportXlsx = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      flash('Импортируем...', 'info');
      const result = await importPassportXlsx(id, file);
      flash(`${result.message}${result.skipped > 0 ? ` (пропущено: ${result.skipped})` : ''}`, 'success');
      load();
    } catch (err) {
      flash(err.response?.data?.error || 'Ошибка импорта', 'error');
    }
  };
  const handlePatchStage = async (stageId, field, value) => {
    try {
      await patchPassportStage(id, stageId, { [field]: value });
      // Update local state — no full reload, no scroll reset
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          passportStages: prev.passportStages.map(s =>
            s.id === stageId ? { ...s, [field]: value || null } : s
          ),
        };
      });
    }
    catch { flash('Ошибка', 'error'); }
  };

  // Networks
  const handleSaveNetworks = async () => {
    setSavingNetworks(true);
    try { await saveNetworks(id, networks); flash('Сохранено'); setNetworksDirty(false); load(); }
    catch { flash('Ошибка', 'error'); }
    finally { setSavingNetworks(false); }
  };

  // Issues
  const handleSaveIssues = async () => {
    setSavingIssues(true);
    try { await savePassportIssues(id, issues); flash('Сохранено'); setIssuesDirty(false); }
    catch { flash('Ошибка', 'error'); }
    finally { setSavingIssues(false); }
  };

  // Contacts
  const openContactAdd = () => { setContactForm({ legal_entity: '', position: '', person_name: '', email: '' }); setContactModal({ mode: 'add' }); };
  const openContactEdit = c => { setContactForm({ legal_entity: c.legal_entity || '', position: c.position || '', person_name: c.person_name || '', email: c.email || '' }); setContactModal({ mode: 'edit', id: c.id }); };
  const saveContact = async () => {
    try {
      if (contactModal.mode === 'add') await addContact(id, contactForm);
      else await updateContact(id, contactModal.id, contactForm);
      flash('Сохранено'); setContactModal(null); load();
    } catch { flash('Ошибка', 'error'); }
  };
  const handleDeleteContact = async cid => {
    if (!confirm('Удалить?')) return;
    try { await deleteContact(id, cid); flash('Удалено'); load(); }
    catch { flash('Ошибка', 'error'); }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Удалить объект?')) return;
    try {
      await deleteProject(id);
      localStorage.setItem('projects_updated', Date.now());
      nav('/projects');
    }
    catch { flash('Ошибка', 'error'); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-[3px] border-gray-200 border-t-brand-500 animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-gray-400">Объект не найден</div>;

  const { project, photos, contacts, passportStages = [] } = data;
  const passport = data.passport;
  const photoByType = type => photos.find(p => p.photo_type === type);
  const galleryPhotos = photos.filter(p => !p.photo_type || p.photo_type === 'gallery');

  return (
    <>
      {msg && (
        <div className={`mb-4 px-4 py-2.5 rounded-xl text-sm border ${msg.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
          {msg.text}
        </div>
      )}

      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">{project.name}</h1>
          {project.address && <p className="text-sm text-gray-400 mt-0.5">📍 {project.address}</p>}
        </div>
        {canEdit && (
          <div className="flex gap-2 flex-wrap flex-shrink-0">
            <button onClick={() => nav(`/admin/projects/${id}/edit`)} className="px-3 py-1.5 text-xs font-medium rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-all">Редактировать</button>
            <button onClick={handleDeleteProject} className="px-3 py-1.5 text-xs font-medium rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all">Удалить</button>
          </div>
        )}
      </div>

      {/* ── Block tabs ── */}
      <div className="flex gap-1 mb-5 p-1 bg-gray-100 rounded-xl w-fit">
        {[{ id: 1, label: 'Сводная информация' }, { id: 2, label: 'Ход проектирования' }].map(b => (
          <button key={b.id} onClick={() => setActiveBlock(b.id)}
            className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all ${activeBlock === b.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {b.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          BLOCK 1 — СВОДНАЯ ИНФОРМАЦИЯ
      ══════════════════════════════════════════ */}
      {activeBlock === 1 && (
        <div className="space-y-5">

          {/* Row 1: Main photo + Info table */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <PhotoSlot type="main" photo={photoByType('main')} photos={photos} isAdmin={canApprove}
                onAssign={handleAssignType} onUpload={handleUploadTyped} label="Визуализация фасада" />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full h-full border-collapse">
                <tbody>
                  {[
                    ['Заказчик', passport?.customer],
                    ['Функциональный заказчик', passport?.functional_customer],
                    ['Генеральный проектировщик', passport?.general_designer],
                    ['Стоимость реализации по АИП', passport?.aip_cost],
                    ['Срок ввода', passport?.completion_date],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 text-xs font-semibold text-brand-600 uppercase tracking-wide bg-brand-50/60 w-[45%] border-r border-gray-100 align-top">{label}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {value || <span className="text-gray-300 italic font-normal text-xs">не указано</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 2: Location + Elevation */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <PhotoSlot type="location" photo={photoByType('location')} photos={photos} isAdmin={canApprove}
                onAssign={handleAssignType} onUpload={handleUploadTyped} label="Местоположение участка планируемой застройки" />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <PhotoSlot type="elevation" photo={photoByType('elevation')} photos={photos} isAdmin={canApprove}
                onAssign={handleAssignType} onUpload={handleUploadTyped} label="План участка на карте высот" />
            </div>
          </div>

          {/* Row 3: Site plan + Engineering networks */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <PhotoSlot type="site_plan" photo={photoByType('site_plan')} photos={photos} isAdmin={canApprove}
                onAssign={handleAssignType} onUpload={handleUploadTyped} label="Схема планировочной организации ЗУ и план инженерных сетей" />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-800">Инженерные сети (существующее положение)</span>
                {canEdit && networksDirty && (
                  <button onClick={handleSaveNetworks} disabled={savingNetworks}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all disabled:opacity-60">
                    {savingNetworks ? '...' : 'Сохранить'}
                  </button>
                )}
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={thCls} style={{ width: 32 }}>№</th>
                    <th className={`${thCls} text-left`}>Наименование</th>
                    <th className={thCls} style={{ width: 90 }}>Характ.</th>
                  </tr>
                </thead>
                <tbody>
                  {networks.map((net, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className={`${tdCls} text-center text-gray-400`}>{i + 1}</td>
                      <td className={tdCls}>
                        {canEdit
                          ? <input className="w-full text-xs border-0 focus:outline-none bg-transparent" value={net.name || ''} onChange={e => { const a = [...networks]; a[i] = { ...a[i], name: e.target.value }; setNetworks(a); setNetworksDirty(true); }} />
                          : <span className="text-xs text-gray-700">{net.name}</span>}
                      </td>
                      <td className={`${tdCls} text-center`}>
                        {canEdit
                          ? <input className="w-full text-xs text-center border-0 focus:outline-none bg-transparent" value={net.specification || ''} onChange={e => { const a = [...networks]; a[i] = { ...a[i], specification: e.target.value }; setNetworks(a); setNetworksDirty(true); }} />
                          : <span className="text-xs text-gray-600">{net.specification}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 4: Gallery */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800">Фотографии объекта</span>
              {canEdit && (
                <label className="cursor-pointer px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all">
                  + Загрузить
                  <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUploadGallery} />
                </label>
              )}
            </div>
            {galleryPhotos.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto p-4 pb-3">
                {galleryPhotos.map((ph, i) => (
                  <div key={ph.id} className="flex-shrink-0 w-36 h-24 rounded-xl overflow-hidden relative group ring-2 ring-transparent hover:ring-brand-400 transition-all cursor-pointer"
                    onClick={() => setLightIndex(i)}>
                    <img src={photoUrl(ph.filename)} alt="" className="w-full h-full object-cover" loading="lazy" />
                    {canEdit && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={e => { e.stopPropagation(); handleDeletePhoto(ph.id); }} className="text-white text-xs bg-red-500/80 rounded px-2 py-1">Удалить</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-gray-400">Загрузите фотографии объекта</div>
            )}
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════
          BLOCK 2 — ТЭП И ДОКУМЕНТАЦИЯ
      ══════════════════════════════════════════ */}
      {activeBlock === 2 && (
        <div className="space-y-5">

          {/* Passport header sub-info */}
          {passport && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-800">{project.name}</div>
              <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
                {[['Заказчик', passport.customer], ['Застройщик', passport.developer], ['Общая площадь', project.area_total ? `${project.area_total} м²` : null], ['Договор на ПИР', passport.contract_pir]].map(([l, v]) => (
                  <div key={l} className="px-4 py-3">
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{l}</div>
                    <div className="text-xs font-medium text-gray-700">{v || <span className="text-gray-300 italic">не указано</span>}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Passport stages table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800">Этапы проектирования</span>
              <div className="flex items-center gap-2">
                {canEdit && <span className="text-xs text-gray-400">Кликните ячейку для редактирования</span>}
                {canEdit && (
                  <>
                    <input ref={importRef} type="file" accept=".xlsx" className="hidden" onChange={handleImportXlsx} />
                    <button onClick={() => importRef.current?.click()}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 shadow-sm transition-all">
                      ⬆ Импорт XLSX
                    </button>
                  </>
                )}
                {canEdit && passportStages.length === 0 && (
                  <button onClick={handleInitPassport} className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all">
                    Создать все этапы
                  </button>
                )}
              </div>
            </div>

            {passportStages.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">
                <div className="text-4xl mb-3">📋</div>
                Этапы не созданы
                {canEdit && <div className="mt-4"><button onClick={handleInitPassport} className="px-4 py-2 text-sm font-semibold rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all">Создать все 29 этапов</button></div>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: 980 }}>
                  <thead>
                    <tr>
                      <th className={thCls} style={{ width: 36 }}>№</th>
                      <th className={`${thCls} text-left`} style={{ width: 175 }}>Этап</th>
                      <th className={`${thCls} text-left`} style={{ width: 195 }}>Детализация</th>
                      <th className={thCls} style={{ width: 70 }}>Готов-ность</th>
                      <th className={thCls} style={{ width: 110 }}>Срок<br/><span className="text-[10px] font-normal text-gray-400">договор / директ.</span></th>
                      <th className={thCls} style={{ width: 110 }}>Исполнение<br/><span className="text-[10px] font-normal text-gray-400">план / факт</span></th>
                      <th className={thCls} style={{ width: 75 }}>Отв.</th>
                      <th className={`${thCls} text-left`}>Примечание</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Precompute which rows are documentation sub-rows
                      const docNums = new Set(['26', '27']);
                      const NON_NUMERIC_NUMS = new Set(['bzu','trans','shopr','kvart','snos','rd_zero']);
                      // Survey rows that show 1эт/2эт (deadline_directive / execution_actual)
                      const SURVEY_NUMS = new Set(['5','6','7','8','9']);
                      let lastParentNum = null;
                      const rowMeta = passportStages.map(s => {
                        if (s.stage_num) lastParentNum = s.stage_num;
                        const isCountRow = docNums.has(s.stage_num) || (!s.stage_num && docNums.has(lastParentNum));
                        const isSurveyRow = SURVEY_NUMS.has(s.stage_num);
                        return { isCountRow, isSurveyRow };
                      });

                      const rows = [];
                      passportStages.forEach((s, idx) => {
                        const { isCountRow, isSurveyRow } = rowMeta[idx];
                        const isSubRow = !s.stage_num && !s.stage_name;
                        const isSlot2 = s.kanban_slot === 2;
                        const displayNum = s.stage_num && !NON_NUMERIC_NUMS.has(s.stage_num) ? s.stage_num : '';
                        const planDate   = isSlot2 ? s.parent_planned_2 : s.execution_planned;
                        const actualDate = isSlot2 ? s.parent_actual_2  : s.execution_actual;
                        const rd = parseInt(s.readiness) || 0;
                        const statusKey = isSlot2 ? s.parent_kanban_status_2 : s.kanban_status;
                        const statusColor = KANBAN_STATUS_COLORS[statusKey];
                        const dateCellStyle = statusColor
                          ? { background: statusColor.bg, borderColor: statusColor.border }
                          : {};

                        if (isSurveyRow) {
                          const sc = KANBAN_STATUS_COLORS[s.kanban_status];
                          const scStyle = sc ? { background: sc.bg, borderColor: sc.border } : {};

                          rows.push(
                            // Main row — срок (договор/директивный), без разбивки на этапы
                            <tr key={`${s.id}-main`} className="hover:bg-gray-50/30">
                              <td className={`${tdCls} text-center text-gray-400 font-mono text-[11px]`}>{displayNum}</td>
                              <td className={`${tdCls} font-semibold text-gray-800 text-xs`}>
                                {canEdit ? <EC value={s.stage_name} onSave={v => handlePatchStage(s.id, 'stage_name', v)} placeholder="—" /> : (s.stage_name || '')}
                              </td>
                              <td className={`${tdCls} text-gray-500 text-xs`}>
                                {canEdit ? <EC value={s.sub_stage_name} onSave={v => handlePatchStage(s.id, 'sub_stage_name', v)} placeholder="—" /> : (s.sub_stage_name || '')}
                              </td>
                              <td className={`${tdCls} text-center`}><span className="text-gray-300 text-xs">—</span></td>
                              {/* Срок — единый, без разбивки */}
                              <td className={`${tdCls} text-center`} style={{ minWidth: 90 }}>
                                <div className="flex flex-col gap-0.5">
                                  {canEdit ? <><EC value={s.deadline_contract} type="date" onSave={v => handlePatchStage(s.id, 'deadline_contract', v)} placeholder="дог." /><EC value={s.deadline_directive} type="date" onSave={v => handlePatchStage(s.id, 'deadline_directive', v)} placeholder="дир." /></>
                                    : <><span className="text-xs text-gray-600">{fmtDate(s.deadline_contract) || '—'}</span><span className="text-xs text-gray-400">{fmtDate(s.deadline_directive)}</span></>}
                                </div>
                              </td>
                              <td className={`${tdCls} text-center`} style={{ minWidth: 90 }}><span className="text-gray-200 text-xs">—</span></td>
                              <td className={tdCls}>
                                {canEdit ? <EC value={s.responsible} onSave={v => handlePatchStage(s.id, 'responsible', v)} placeholder="—" /> : (s.responsible || <span className="text-gray-300 text-xs">—</span>)}
                              </td>
                              <td className={tdCls}>
                                {canEdit ? <EC value={s.note} onSave={v => handlePatchStage(s.id, 'note', v)} placeholder="—" /> : (s.note || <span className="text-gray-300 text-xs">—</span>)}
                              </td>
                            </tr>,

                            // 1й этап — план/факт
                            <tr key={`${s.id}-e1`} className="bg-gray-50/40 hover:bg-gray-50">
                              <td className={`${tdCls} text-center text-gray-300 text-[10px]`}></td>
                              <td className={`${tdCls} text-xs text-gray-400`}></td>
                              <td className={`${tdCls} text-gray-500 text-xs`}>
                                <span className="text-[10px] font-semibold text-gray-400 mr-1">1эт</span>
                              </td>
                              <td className={`${tdCls} text-center`}>
                                <div className="flex items-center justify-center gap-0.5">
                                  {canEdit && <EC value={rd > 0 ? String(rd) : ''} type="number" onSave={v => handlePatchStage(s.id, 'readiness', v)} placeholder="%" />}
                                  {rd > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${readinessCls(rd)}`}>{rd}%</span>}
                                  {!isAdmin && !rd && <span className="text-gray-300 text-xs">—</span>}
                                </div>
                              </td>
                              <td className={`${tdCls} text-center`} style={{ minWidth: 90 }}><span className="text-gray-200 text-xs">—</span></td>
                              <td className={`${tdCls} text-center`} style={{ minWidth: 90, ...scStyle }}>
                                <div className="flex flex-col gap-0.5">
                                  {canEdit
                                    ? <><EC value={s.execution_planned} type="date" onSave={v => handlePatchStage(s.id, 'execution_planned', v)} placeholder="план" /><EC value={s.execution_actual} type="date" onSave={v => handlePatchStage(s.id, 'execution_actual', v)} placeholder="факт" /></>
                                    : <><span className="text-xs text-gray-500">{fmtDate(s.execution_planned) || '—'}</span>{s.execution_actual && <span className="text-xs font-semibold px-1 rounded" style={sc ? { color: sc.text } : {}}>{fmtDate(s.execution_actual)}</span>}</>}
                                </div>
                              </td>
                              <td className={tdCls}></td>
                              <td className={tdCls}></td>
                            </tr>,

                            // 2й этап — план/факт
                            <tr key={`${s.id}-e2`} className="bg-gray-50/40 hover:bg-gray-50">
                              <td className={`${tdCls} text-center text-gray-300 text-[10px]`}></td>
                              <td className={`${tdCls} text-xs text-gray-400`}></td>
                              <td className={`${tdCls} text-gray-500 text-xs`}>
                                <span className="text-[10px] font-semibold text-gray-400 mr-1">2эт</span>
                              </td>
                              <td className={`${tdCls} text-center`}><span className="text-gray-300 text-xs">—</span></td>
                              <td className={`${tdCls} text-center`} style={{ minWidth: 90 }}><span className="text-gray-200 text-xs">—</span></td>
                              <td className={`${tdCls} text-center`} style={{ minWidth: 90, ...scStyle }}>
                                <div className="flex flex-col gap-0.5">
                                  {canEdit
                                    ? <><EC value={s.execution_planned_2} type="date" onSave={v => handlePatchStage(s.id, 'execution_planned_2', v)} placeholder="план" /><EC value={s.execution_actual_2} type="date" onSave={v => handlePatchStage(s.id, 'execution_actual_2', v)} placeholder="факт" /></>
                                    : <><span className="text-xs text-gray-500">{fmtDate(s.execution_planned_2) || '—'}</span>{s.execution_actual_2 && <span className="text-xs font-semibold px-1 rounded" style={sc ? { color: sc.text } : {}}>{fmtDate(s.execution_actual_2)}</span>}</>}
                                </div>
                              </td>
                              <td className={tdCls}></td>
                              <td className={tdCls}></td>
                            </tr>
                          );
                          return;
                        }

                        rows.push(
                          <tr key={s.id} className={`transition-colors ${isSubRow ? 'bg-gray-50/60 hover:bg-gray-50' : 'hover:bg-gray-50/30'} ${isSlot2 ? 'bg-blue-50/20' : ''}`}>
                            <td className={`${tdCls} text-center text-gray-400 font-mono text-[11px]`}>{displayNum}</td>
                            <td className={`${tdCls} font-semibold text-gray-800 text-xs`}>
                              {canEdit ? <EC value={s.stage_name} onSave={v => handlePatchStage(s.id, 'stage_name', v)} placeholder="—" /> : (s.stage_name || '')}
                            </td>
                            <td className={`${tdCls} text-gray-500 text-xs`}>
                              {canEdit ? <EC value={s.sub_stage_name} onSave={v => handlePatchStage(s.id, 'sub_stage_name', v)} placeholder="—" /> : (s.sub_stage_name || '')}
                            </td>

                            {isCountRow ? (
                              <td className={`${tdCls} text-center`} colSpan={3}>
                                {canEdit
                                  ? <EC value={s.note} onSave={v => handlePatchStage(s.id, 'note', v)} placeholder="кол-во" />
                                  : <span className="text-xs text-gray-700 font-semibold">{s.note || <span className="text-gray-300">—</span>}</span>}
                              </td>
                            ) : (
                              <>
                                <td className={`${tdCls} text-center`}>
                                  <div className="flex items-center justify-center gap-0.5">
                                    {canEdit && !isSlot2 && <EC value={rd > 0 ? String(rd) : ''} type="number" onSave={v => handlePatchStage(s.id, 'readiness', v)} placeholder="%" />}
                                    {rd > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${readinessCls(rd)}`}>{rd}%</span>}
                                    {!isAdmin && !rd && <span className="text-gray-300 text-xs">—</span>}
                                  </div>
                                </td>
                                <td className={`${tdCls} text-center`} style={{ minWidth: 90, ...dateCellStyle }}>
                                  <div className="flex flex-col gap-0.5">
                                    {canEdit && !isSlot2
                                      ? <><EC value={s.deadline_contract} type="date" onSave={v => handlePatchStage(s.id, 'deadline_contract', v)} placeholder="дог." /><EC value={s.deadline_directive} type="date" onSave={v => handlePatchStage(s.id, 'deadline_directive', v)} placeholder="дир." /></>
                                      : <><span className="text-xs text-gray-600">{fmtDate(s.deadline_contract) || (isSlot2 ? '' : '—')}</span><span className="text-xs text-gray-400">{fmtDate(s.deadline_directive)}</span></>}
                                  </div>
                                </td>
                                <td className={`${tdCls} text-center`} style={{ minWidth: 90, ...dateCellStyle }}>
                                  <div className="flex flex-col gap-0.5">
                                    {canEdit
                                      ? <><EC value={planDate} type="date" onSave={v => handlePatchStage(s.id, 'execution_planned', v)} placeholder="план" /><EC value={actualDate} type="date" onSave={v => handlePatchStage(s.id, 'execution_actual', v)} placeholder="факт" /></>
                                      : <><span className="text-xs" style={{ color: '#6b7280' }}>{fmtDate(planDate) || '—'}</span>{actualDate && <span className="text-xs font-semibold px-1 rounded" style={statusColor ? { color: statusColor.text } : { color: '#15803d', background: '#f0fdf4' }}>{fmtDate(actualDate)}</span>}</>}
                                  </div>
                                </td>
                              </>
                            )}

                            <td className={tdCls}>
                              {canEdit ? <EC value={s.responsible} onSave={v => handlePatchStage(s.id, 'responsible', v)} placeholder="—" /> : (s.responsible || <span className="text-gray-300 text-xs">—</span>)}
                            </td>
                            <td className={tdCls}>
                              {canEdit ? <EC value={s.note} onSave={v => handlePatchStage(s.id, 'note', v)} placeholder="—" /> : (s.note || <span className="text-gray-300 text-xs">—</span>)}
                            </td>
                          </tr>
                        );
                      });
                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Авторский коллектив */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800">Авторский коллектив</span>
              {canEdit && <button onClick={openContactAdd} className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all">+ Добавить</button>}
            </div>
            {contacts.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">Список не заполнен</div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {['Юр. лицо', 'Должность / роль', 'Ф.И.О.', 'Email'].map(h => (
                      <th key={h} className={`${thCls} text-left`}>{h}</th>
                    ))}
                    {canEdit && <th className={thCls} style={{ width: 72 }} />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {contacts.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className={`${tdCls} text-gray-600`}>{c.legal_entity || '—'}</td>
                      <td className={`${tdCls} font-medium text-gray-800`}>{c.position || '—'}</td>
                      <td className={`${tdCls} text-gray-700`}>{c.person_name || '—'}</td>
                      <td className={`${tdCls}`}>
                        {c.email
                          ? <a href={`mailto:${c.email}`} className="text-brand-600 hover:underline">{c.email}</a>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      {canEdit && (
                        <td className={tdCls}>
                          <div className="flex gap-1.5">
                            <button onClick={() => openContactEdit(c)} className="p-1.5 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-all">✏️</button>
                            <button onClick={() => handleDeleteContact(c.id)} className="p-1.5 text-xs rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 transition-all">✕</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Примечание */}
          <div id="issues" className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800">Примечание</span>
              {canEdit && (
                <div className="flex gap-2">
                  {issuesDirty && (
                    <button onClick={handleSaveIssues} disabled={savingIssues}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all disabled:opacity-60">
                      {savingIssues ? 'Сохранение...' : 'Сохранить'}
                    </button>
                  )}
                  <button onClick={() => { setIssues(p => [...p, { problem: '', solution: '' }]); setIssuesDirty(true); }}
                    className="px-3 py-1.5 text-xs font-medium rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-all">
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
                  {canEdit && <th className={thCls} style={{ width: 36 }} />}
                </tr>
              </thead>
              <tbody>
                {issues.map((iss, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className={`${tdCls} text-center text-gray-400`}>{i + 1}</td>
                    <td className={tdCls}>
                      {canEdit
                        ? <textarea className="w-full text-xs border-0 focus:outline-none bg-transparent resize-none min-h-[44px] leading-relaxed" value={iss.problem || ''} placeholder="Текст примечания..."
                            onChange={e => { const a = [...issues]; a[i] = { ...a[i], problem: e.target.value }; setIssues(a); setIssuesDirty(true); }} />
                        : <span className="text-xs text-gray-700">{iss.problem}</span>}
                    </td>
                    <td className={tdCls}>
                      {canEdit
                        ? <textarea className="w-full text-xs border-0 focus:outline-none bg-transparent resize-none min-h-[44px] leading-relaxed" value={iss.solution || ''} placeholder="Решение / комментарий..."
                            onChange={e => { const a = [...issues]; a[i] = { ...a[i], solution: e.target.value }; setIssues(a); setIssuesDirty(true); }} />
                        : <span className="text-xs text-gray-700">{iss.solution}</span>}
                    </td>
                    {canEdit && (
                      <td className={`${tdCls} text-center`}>
                        <button onClick={() => { setIssues(p => p.filter((_, idx) => idx !== i)); setIssuesDirty(true); }}
                          className="text-gray-300 hover:text-red-500 transition-colors text-sm leading-none">✕</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ── Modals ── */}
      {contactModal && (
        <Modal title={contactModal.mode === 'add' ? 'Добавить в авторский коллектив' : 'Редактировать'} onClose={() => setContactModal(null)} onSave={saveContact}>
          <Field label="Юр. лицо"><input className={inputCls} value={contactForm.legal_entity} onChange={e => setContactForm(p => ({ ...p, legal_entity: e.target.value }))} /></Field>
          <Field label="Должность / роль"><input className={inputCls} value={contactForm.position} onChange={e => setContactForm(p => ({ ...p, position: e.target.value }))} /></Field>
          <Field label="Ф.И.О."><input className={inputCls} value={contactForm.person_name} onChange={e => setContactForm(p => ({ ...p, person_name: e.target.value }))} /></Field>
          <Field label="Email"><input type="email" className={inputCls} placeholder="name@company.ru" value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} /></Field>
        </Modal>
      )}

      {/* ── Lightbox ── */}
      {lightIndex !== null && galleryPhotos.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
          onClick={() => setLightIndex(null)}>
          {/* Close */}
          <button className="absolute top-5 right-6 text-white text-3xl leading-none hover:text-gray-300 z-10"
            onClick={() => setLightIndex(null)}>✕</button>
          {/* Counter */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {lightIndex + 1} / {galleryPhotos.length}
          </div>
          {/* Prev */}
          {galleryPhotos.length > 1 && (
            <button className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white text-2xl transition-all z-10"
              onClick={e => { e.stopPropagation(); setLightIndex(i => (i - 1 + galleryPhotos.length) % galleryPhotos.length); }}>
              ‹
            </button>
          )}
          {/* Image */}
          <img src={photoUrl(galleryPhotos[lightIndex].filename)} alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()} />
          {/* Next */}
          {galleryPhotos.length > 1 && (
            <button className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white text-2xl transition-all z-10"
              onClick={e => { e.stopPropagation(); setLightIndex(i => (i + 1) % galleryPhotos.length); }}>
              ›
            </button>
          )}
        </div>
      )}
    </>
  );
}
