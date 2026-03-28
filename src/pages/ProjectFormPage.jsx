import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, createProject, updateProject } from '../api/client';

const STAGES = ['АПР', 'П', 'РД', 'Завершён'];
const EMPTY = { name:'',address:'',stage:'РД',area_total:'',area_building:'',area_underground:'',floors_above:'',floors_below:'',height:'',completion_date:'',description:'',gip_name:'',gip_phone:'',is_terminated:false };

const Input = (props) => <input {...props} className={`w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition ${props.className||''}`} />;
const Textarea = (props) => <textarea {...props} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition min-h-[80px] resize-y" />;
const Select = ({ children, ...props }) => <select {...props} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent transition bg-white">{children}</select>;
const Label = ({ children }) => <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50"><h3 className="text-sm font-semibold text-gray-800">{title}</h3></div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function ProjectFormPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    getProject(id).then(d => {
      const p = d.project;
      setForm({ name:p.name||'',address:p.address||'',stage:p.stage||'РД',area_total:p.area_total||'',area_building:p.area_building||'',area_underground:p.area_underground||'',floors_above:p.floors_above||'',floors_below:p.floors_below||'',height:p.height||'',completion_date:p.completion_date||'',description:p.description||'',gip_name:p.gip_name||'',gip_phone:p.gip_phone||'',is_terminated:p.is_terminated||false });
    }).finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Укажите название объекта'); return; }
    setSaving(true); setError('');
    try {
      if (isEdit) { await updateProject(id, form); nav(`/projects/${id}`); }
      else { const c = await createProject(form); nav(`/projects/${c.id}`); }
    } catch (err) { setError(err.response?.data?.error || 'Ошибка'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gray-200 border-t-accent rounded-full animate-spin" /></div>;

  return (
    <form onSubmit={submit}>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-bold text-gray-900">{isEdit ? 'Редактирование объекта' : 'Новый объект'}</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => nav(isEdit ? `/projects/${id}` : '/projects')} className="bg-white border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">Отмена</button>
          <button type="submit" disabled={saving} className="bg-accent hover:bg-accent-dark text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-60">
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

      <Card title="Основная информация">
        <div className="mb-4"><Label>Название объекта *</Label><Input value={form.name} onChange={set('name')} placeholder="Напр. Кавказский бульвар з/у 27" /></div>
        <div className="mb-4"><Label>Адрес</Label><Input value={form.address} onChange={set('address')} /></div>
        <div className="mb-4"><Label>Срок завершения</Label><Input value={form.completion_date} onChange={set('completion_date')} placeholder="Напр. Q3 2026" /></div>
        <div><Label>Описание</Label><Textarea value={form.description} onChange={set('description')} /></div>
        <label className="flex items-center gap-2.5 cursor-pointer mt-1">
          <input type="checkbox" className="w-4 h-4 accent-red-600 rounded" checked={!!form.is_terminated} onChange={e => setForm(p => ({ ...p, is_terminated: e.target.checked }))} />
          <span className="text-sm text-red-600 font-medium">Расторжение договора</span>
        </label>
      </Card>

      <Card title="Основные показатели (ТЭП)">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div><Label>Общая площадь, м²</Label><Input type="number" value={form.area_total} onChange={set('area_total')} /></div>
          <div><Label>Площадь застройки, м²</Label><Input type="number" value={form.area_building} onChange={set('area_building')} /></div>
          <div><Label>Подземная часть, м²</Label><Input type="number" value={form.area_underground} onChange={set('area_underground')} /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><Label>Этажей надземных</Label><Input type="number" value={form.floors_above} onChange={set('floors_above')} /></div>
          <div><Label>Этажей подземных</Label><Input type="number" value={form.floors_below} onChange={set('floors_below')} /></div>
          <div><Label>Высота, м</Label><Input type="number" step="0.1" value={form.height} onChange={set('height')} /></div>
        </div>
      </Card>

      <Card title="ГИП">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>ФИО ГИП</Label><Input value={form.gip_name} onChange={set('gip_name')} /></div>
          <div><Label>Телефон ГИП</Label><Input value={form.gip_phone} onChange={set('gip_phone')} placeholder="7 9XX XXX-XX-XX" /></div>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => nav(isEdit ? `/projects/${id}` : '/projects')} className="bg-white border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">Отмена</button>
        <button type="submit" disabled={saving} className="bg-accent hover:bg-accent-dark text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-60">{saving ? 'Сохранение...' : 'Сохранить'}</button>
      </div>
    </form>
  );
}
