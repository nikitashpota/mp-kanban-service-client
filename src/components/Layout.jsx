import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getProjects } from '../api/client';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  const { user, isAdmin, role } = useAuth();
  const [projects, setProjects] = useState([]);
  const lastUpdate = useRef(null);
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sidebar_collapsed') || 'false'); } catch { return false; }
  });

  useEffect(() => { getProjects().then(setProjects).catch(() => {}); }, []);

  useEffect(() => {
    const id = setInterval(() => {
      try {
        setCollapsed(JSON.parse(localStorage.getItem('sidebar_collapsed') || 'false'));
        const updated = localStorage.getItem('projects_updated');
        if (updated !== lastUpdate.current) {
          lastUpdate.current = updated;
          getProjects().then(setProjects).catch(() => {});
        }
      } catch {}
    }, 150);
    return () => clearInterval(id);
  }, []);

  const ROLE_LABELS = { admin: 'Администратор', pm: 'РП', gip: 'ГИП', viewer: 'Наблюдатель' };
  const ROLE_COLORS = {
    admin:  'bg-red-50 text-[#C0392B]',
    pm:     'bg-blue-50 text-blue-700',
    gip:    'bg-green-50 text-green-700',
    viewer: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar projects={projects} />
      <div className={`flex-1 flex flex-col h-screen transition-all duration-200 ${collapsed ? 'ml-12' : 'ml-56'}`}>
        <header className="h-14 flex-shrink-0 bg-white border-b border-gray-100 flex items-center px-6 gap-4 z-40 shadow-sm">
          <div className="flex-1" />
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[role] || ROLE_COLORS.viewer}`}>
            {ROLE_LABELS[role] || 'Наблюдатель'}
          </span>
          <span className="text-sm text-gray-500">{user?.full_name || user?.username}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
