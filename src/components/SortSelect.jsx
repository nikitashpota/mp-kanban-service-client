// Shared sort options and utility for projects/kanban

export const SORT_OPTIONS = [
  { value: 'name_asc',     label: 'По имени (А→Я)' },
  { value: 'name_desc',    label: 'По имени (Я→А)' },
  { value: 'contract_asc', label: 'По договору (А→Я)' },
  { value: 'contract_desc',label: 'По договору (Я→А)' },
  { value: 'mge_asc',      label: 'По дате МГЭ (↑ ранние)' },
  { value: 'mge_desc',     label: 'По дате МГЭ (↓ поздние)' },
];

// Sort an array of projects.
// For kanban rows, stage data lives in p.stages['22'] (stageNum for МГЭ загрузка)
// For card rows, there's no stages — falls back gracefully
export function sortProjects(projects, sortValue) {
  if (!sortValue || sortValue === 'name_asc') {
    return [...projects].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'ru')
    );
  }

  return [...projects].sort((a, b) => {
    switch (sortValue) {
      case 'name_desc':
        return (b.name || '').localeCompare(a.name || '', 'ru');

      case 'contract_asc':
        return (a.contract_pir || '').localeCompare(b.contract_pir || '', 'ru');
      case 'contract_desc':
        return (b.contract_pir || '').localeCompare(a.contract_pir || '', 'ru');

      case 'mge_asc':
      case 'mge_desc': {
        // Try kanban stages first (stageNum '22')
        const dateA = getMgeDate(a);
        const dateB = getMgeDate(b);
        // Null dates go to the end
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        const diff = new Date(dateA) - new Date(dateB);
        return sortValue === 'mge_asc' ? diff : -diff;
      }

      default:
        return 0;
    }
  });
}

function getMgeDate(p) {
  // Kanban row has p.stages['22']
  if (p.stages && p.stages['22']) {
    const s = p.stages['22'];
    return s.execution_actual || s.execution_planned || s.deadline_contract || null;
  }
  return null;
}

// Reusable sort select UI
export function SortSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:border-[#C0392B] transition-all"
    >
      {SORT_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
