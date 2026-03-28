import { useNavigate } from 'react-router-dom';
import { photoUrl } from '../api/client';

function fmt(v) {
  if (!v && v !== 0) return '—';
  return Number(v).toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

export default function ProjectCard({ project }) {
  const nav = useNavigate();

  return (
    <div
      onClick={() => nav(`/projects/${project.id}`)}
      className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
    >
      {/* Photo */}
      <div className="h-48 bg-gray-100 overflow-hidden relative">
        {project.main_photo
          ? <img src={photoUrl(project.main_photo)} alt={project.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300">🏢</div>
        }
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-[15px] leading-snug mb-1">{project.name}</h3>
        {project.address && (
          <p className="text-xs text-gray-400 mb-2 truncate">📍 {project.address}</p>
        )}
        {project.type_name && (
          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full text-white mb-2"
            style={{ background: project.type_color || '#6b7280' }}>
            {project.type_name}
          </span>
        )}

        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Общая, м²',     val: fmt(project.area_total) },
            { label: 'Застройка, м²', val: fmt(project.area_building) },
            { label: 'Подземная, м²', val: fmt(project.area_underground) },
          ].map(m => (
            <div key={m.label} className="bg-gray-50 rounded-xl p-2 text-center">
              <div className="text-sm font-bold text-gray-800">{m.val}</div>
              <div className="text-[10px] text-gray-400 leading-tight mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>

        {project.gip_name && (
          <div className="pt-3 border-t border-gray-50 text-xs text-gray-400 flex items-center justify-between">
            <span>ГИП: <span className="text-gray-600 font-medium">{project.gip_name}</span></span>
            {parseInt(project.notes_count) > 0 && (
              <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
                ⚠ {project.notes_count}
              </span>
            )}
          </div>
        )}
        {!project.gip_name && parseInt(project.notes_count) > 0 && (
          <div className="pt-3 border-t border-gray-50">
            <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">⚠ {project.notes_count} примечания</span>
          </div>
        )}
      </div>
    </div>
  );
}
