import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, createProject, updateProject, getProjectTypes, assignProjectType, savePassportHeader } from '../api/client';

const EMPTY = {
  name:'', address:'', area_total:'', area_building:'', area_underground:'',
  floors_above:'', floors_below:'', height:'', completion_date:'', description:'',
  gip_name:'', gip_phone:'', is_terminated: false, project_type_id:'',
  // Реквизиты паспорта
  customer:'', functional_customer:'', general_designer:'', developer:'',
  aip_cost:'', passport_completion_date:'', contract_pir:'', passport_area_total:'',
};

const inputCls = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#C0392B] focus:ring-2 focus:ring-red-100 transition bg-white';
const Input = (props) => <input {...props} className={inputCls} />;
const Textarea = (props) => <textarea {...props} className={`${inputCls} min-h-[80px] resize-y`} />;
const Select = ({ children, ...props }) => <select {...props} className={`${inputCls} cursor-pointer`}>{children}</select>;
const Label = ({ children }) => <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{children}</label>;

function Card({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function ProjectFormPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(EMPTY);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getProjectTypes().then(setTypes).catch(() => {});
    if (!isEdit) return;
    getProject(id).then(d => {
      const p = d.project;
      const pp = d.passport || {};
      setForm({
        name: p.name||'', address: p.address||'', area_total: p.area_total||'',
        area_building: p.area_building||'', area_underground: p.area_underground||'',
        floors_above: p.floors_above||'', floors_below: p.floors_below||'',
        height: p.height||'', completion_date: p.completion_date||'',
        description: p.description||'', gip_name: p.gip_name||'', gip_phone: p.gip_phone||'',
        is_terminated: p.is_terminated||false,
        project_type_id: p.project_type_id ? String(p.project_type_id) : '',
        // Реквизиты
        customer: pp.customer||'', functional_customer: pp.functional_customer||'',
        general_designer: pp.general_designer||'', developer: pp.developer||'',
        aip_cost: pp.aip_cost||'', passport_completion_date: pp.completion_date||'',
        contract_pir: pp.contract_pir||'', passport_area_total: pp.area_total||'',
      });
    }).finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Укажите название объекта'); return; }
    setSaving(true); setError('');
    try {
      let projectId = id;
      if (isEdit) {
        await updateProject(id, form);
      } else {
        const c = await createProject(form);
        projectId = c.id;
      }
      // Assign type
      await assignProjectType(projectId, form.project_type_id || null);
      // Save passport header
      await savePassportHeader(projectId, {
        customer: form.customer,
        functional_customer: form.functional_customer,
        general_designer: form.general_designer,
        developer: form.developer,
        aip_cost: form.aip_cost,
        completion_date: form.passport_completion_date,
        contract_pir: form.contract_pir,
        area_total: form.passport_area_total,
      });
      nav(`/projects/${projectId}`);
    } catch (err) { setError(err.response?.data?.error || 'Ошибка'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-[3px] border-gray-200 border-t-[#C0392B] rounded-full animate-spin" /></div>;

  return (
    <form onSubmit={submit}>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-bold text-gray-900">{isEdit ? 'Редактирование объекта' : 'Новый объект'}</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => nav(isEdit ? `/projects/${id}` : '/projects')}
            className="border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
            Отмена
          </button>
          <button type="submit" disabled={saving}
            className="bg-[#C0392B] hover:bg-[#96281B] text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm transition-all disabled:opacity-60">
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

      {/* ── Основная информация ── */}
      <Card title="Основная информация">
        <div className="mb-4"><Label>Название объекта *</Label><Input value={form.name} onChange={set('name')} placeholder="Напр. Кавказский бульвар з/у 27" /></div>
        <div className="mb-4"><Label>Адрес</Label><Input value={form.address} onChange={set('address')} /></div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label>Тип объекта</Label>
            <Select value={form.project_type_id} onChange={set('project_type_id')}>
              <option value="">— не выбран —</option>
              {types.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
            </Select>
          </div>
          <div><Label>Срок завершения</Label><Input value={form.completion_date} onChange={set('completion_date')} placeholder="Напр. Q3 2026" /></div>
        </div>
        <div className="mb-4"><Label>Описание</Label><Textarea value={form.description} onChange={set('description')} /></div>
      </Card>

      {/* ── Реквизиты паспорта ── */}
      <Card title="Реквизиты паспорта" subtitle="Отображаются на странице объекта в блоке «Сводная информация»">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Заказчик</Label><Input value={form.customer} onChange={set('customer')} /></div>
          <div><Label>Функциональный заказчик</Label><Input value={form.functional_customer} onChange={set('functional_customer')} /></div>
          <div><Label>Генеральный проектировщик</Label><Input value={form.general_designer} onChange={set('general_designer')} placeholder="АО «Моспроект»" /></div>
          <div><Label>Застройщик</Label><Input value={form.developer} onChange={set('developer')} /></div>
          <div><Label>Стоимость по АИП</Label><Input value={form.aip_cost} onChange={set('aip_cost')} placeholder="Напр. 5804,00 млн. руб." /></div>
          <div><Label>Срок ввода</Label><Input value={form.passport_completion_date} onChange={set('passport_completion_date')} placeholder="Напр. Октябрь 2028 г." /></div>
          <div><Label>Договор на ПИР</Label>
            <div className="flex items-center gap-3">
              <Input value={form.contract_pir} onChange={set('contract_pir')} />
              <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap flex-shrink-0">
                <input type="checkbox" className="w-4 h-4 rounded" style={{accentColor:'#C0392B'}}
                  checked={!!form.is_terminated} onChange={e => setForm(p => ({ ...p, is_terminated: e.target.checked }))} />
                <span className="text-sm text-red-600 font-medium">Расторжение</span>
              </label>
            </div>
          </div>
          <div><Label>Общая площадь объекта</Label><Input value={form.passport_area_total} onChange={set('passport_area_total')} /></div>
        </div>
      </Card>

      {/* ── ТЭП ── */}
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

      {/* ── ГИП ── */}
      <Card title="ГИП">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>ФИО ГИП</Label><Input value={form.gip_name} onChange={set('gip_name')} /></div>
          <div><Label>Телефон ГИП</Label><Input value={form.gip_phone} onChange={set('gip_phone')} /></div>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => nav(isEdit ? `/projects/${id}` : '/projects')}
          className="border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
          Отмена
        </button>
        <button type="submit" disabled={saving}
          className="bg-[#C0392B] hover:bg-[#96281B] text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm transition-all disabled:opacity-60">
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
}
