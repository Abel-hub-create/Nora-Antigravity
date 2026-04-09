import React, { useEffect, useState } from 'react';
import { Users, BookOpen, Ban, Crown, UserPlus, TrendingUp } from 'lucide-react';
import { adminApi } from '../services/adminApiClient.js';
import AdminLayout from '../components/AdminLayout.jsx';

function StatCard({ icon: Icon, label, value, color = 'sky', sub }) {
  const colors = {
    sky: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
    green: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    violet: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
    indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <Icon size={20} />
        {sub && <span className="text-xs opacity-70">{sub}</span>}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value ?? '—'}</div>
      <div className="text-sm opacity-70">{label}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get('/stats').then(setStats).finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-800 bg-gray-900 h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard icon={Users} label="Utilisateurs" value={stats?.totalUsers} color="sky" />
          <StatCard icon={BookOpen} label="Synthèses" value={stats?.totalSyntheses} color="indigo" />
          <StatCard icon={Crown} label="Comptes premium" value={stats?.premiumUsers} color="amber" />
          <StatCard icon={Ban} label="Comptes bannis" value={stats?.bannedUsers} color="red" />
          <StatCard icon={UserPlus} label="Inscrits aujourd'hui" value={stats?.newUsersToday} color="green" />
          <StatCard icon={TrendingUp} label="Inscrits cette semaine" value={stats?.newUsersThisWeek} color="violet" />
        </div>
      )}
    </AdminLayout>
  );
}
