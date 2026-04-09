import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Crown, Ban, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminApi } from '../services/adminApiClient.js';
import AdminLayout from '../components/AdminLayout.jsx';

const FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'premium', label: 'Premium' },
  { value: 'banned', label: 'Bannis' },
  { value: 'free', label: 'Gratuit' },
];

export default function AdminUsers() {
  const navigate = useNavigate();
  const [data, setData] = useState({ users: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50, search, filter });
      const res = await adminApi.get(`/users?${params}`);
      setData(res);
    } finally { setLoading(false); }
  }, [page, search, filter]);

  useEffect(() => { load(); }, [load]);

  const isPremium = (u) => u.premium_expires_at && new Date(u.premium_expires_at) > new Date();

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Utilisateurs <span className="text-gray-500 font-normal text-lg">({data.total})</span></h1>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="search"
              placeholder="Rechercher par email ou nom..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div className="flex gap-2">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => { setFilter(f.value); setPage(1); }}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filter === f.value ? 'bg-sky-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-gray-500">Chargement...</div>
          ) : data.users.length === 0 ? (
            <div className="py-12 text-center text-gray-500">Aucun utilisateur trouvé</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Utilisateur</th>
                    <th className="text-left px-5 py-3 hidden md:table-cell">Inscription</th>
                    <th className="text-left px-5 py-3 hidden sm:table-cell">Synthèses</th>
                    <th className="text-left px-5 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {data.users.map(u => (
                    <tr
                      key={u.id}
                      onClick={() => navigate(`/admin/users/${u.id}`)}
                      className="hover:bg-gray-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-sm text-white">{u.name || '—'}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell text-sm text-gray-400">
                        {new Date(u.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell text-sm text-gray-400">
                        {u.syntheses_count}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-2">
                          {u.is_banned ? (
                            <span className="flex items-center gap-1 text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">
                              <Ban size={10} /> Banni
                            </span>
                          ) : isPremium(u) ? (
                            <span className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                              <Crown size={10} /> Premium
                            </span>
                          ) : (
                            <span className="text-xs text-gray-600">Gratuit</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-lg bg-gray-800 disabled:opacity-30 hover:bg-gray-700 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-gray-400">Page {page} / {data.totalPages}</span>
            <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}
              className="p-2 rounded-lg bg-gray-800 disabled:opacity-30 hover:bg-gray-700 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
