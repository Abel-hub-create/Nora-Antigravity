import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Ban, Crown, Trash2, CheckCircle, Loader2, GraduationCap, User } from 'lucide-react';
import { adminApi } from '../services/adminApiClient.js';
import AdminLayout from '../components/AdminLayout.jsx';

function Confirm({ message, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full">
        <p className="text-white mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm hover:bg-gray-700">Annuler</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white text-sm hover:bg-red-400 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />} Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [premiumDate, setPremiumDate] = useState('');
  const [premiumForever, setPremiumForever] = useState(true);
  const [toast, setToast] = useState('');
  const [banReason, setBanReason] = useState('');
  const [showBanInput, setShowBanInput] = useState(false);

  useEffect(() => {
    adminApi.get(`/users/${id}`).then(data => {
      setUser(data.user);
      const plan = data.user.plan_type || 'free';
      setSelectedPlan(plan);
      if (data.user.premium_expires_at) {
        const expDate = new Date(data.user.premium_expires_at);
        // If expires far in the future (>2 years), treat as permanent
        const twoYearsFromNow = new Date();
        twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
        if (expDate > twoYearsFromNow) {
          setPremiumForever(true);
        } else {
          setPremiumForever(false);
          setPremiumDate(expDate.toISOString().split('T')[0]);
        }
      }
    }).finally(() => setLoading(false));
  }, [id]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleBan = async () => {
    setActionLoading('ban');
    try {
      await adminApi.patch(`/users/${id}/ban`, { reason: banReason || null });
      setUser(u => ({ ...u, is_banned: 1, banned_reason: banReason || null }));
      setConfirm(null); setShowBanInput(false); setBanReason('');
      showToast('Utilisateur banni');
    } finally { setActionLoading(''); }
  };

  const handleUnban = async () => {
    setActionLoading('unban');
    try {
      await adminApi.patch(`/users/${id}/unban`);
      setUser(u => ({ ...u, is_banned: 0, banned_reason: null }));
      showToast('Utilisateur débanni');
    } finally { setActionLoading(''); }
  };

  const handleDelete = async () => {
    setActionLoading('delete');
    try {
      await adminApi.delete(`/users/${id}`);
      navigate('/admin/users', { replace: true });
    } finally { setActionLoading(''); setConfirm(null); }
  };

  const handleSetPlan = async () => {
    setActionLoading('plan');
    try {
      const body = { plan_type: selectedPlan };
      if (selectedPlan === 'premium') {
        body.expires_at = premiumForever ? null : (premiumDate ? new Date(premiumDate).toISOString() : null);
      }
      await adminApi.patch(`/users/${id}/plan`, body);
      setUser(u => ({ ...u, plan_type: selectedPlan }));
      const labels = { free: 'Gratuit', premium: 'Premium', school: 'École' };
      showToast(`Plan mis à jour → ${labels[selectedPlan]}`);
    } finally { setActionLoading(''); }
  };

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" /></div>
    </AdminLayout>
  );
  if (!user) return <AdminLayout><p className="text-gray-500">Utilisateur introuvable</p></AdminLayout>;

  return (
    <AdminLayout>
      {confirm && <Confirm message={confirm.msg} onConfirm={confirm.fn} onCancel={() => setConfirm(null)} loading={!!actionLoading} />}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}

      <button onClick={() => navigate('/admin/users')} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> Retour
      </button>

      <div className="grid gap-6 md:grid-cols-3">
        {/* User info */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-white">{user.name || '—'}</h1>
                <p className="text-gray-500 text-sm mt-1">{user.email}</p>
              </div>
              <div className="flex gap-2">
                {user.is_banned && (
                  <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-full">Banni</span>
                )}
                {user.plan_type === 'premium' ? (
                  <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-full">✨ Premium</span>
                ) : user.plan_type === 'school' ? (
                  <span className="text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-1 rounded-full">🏫 École</span>
                ) : (
                  <span className="text-xs text-gray-600 border border-gray-700 px-2 py-1 rounded-full">Gratuit</span>
                )}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Niveau', user.level], ['XP', user.exp],
                ['Synthèses', user.syntheses_count],
                ['Inscrit le', new Date(user.created_at).toLocaleDateString('fr-FR')],
                ['Dernière connexion', user.last_login_at ? new Date(user.last_login_at).toLocaleDateString('fr-FR') : '—'],
                ['Premium expire', user.premium_expires_at ? new Date(user.premium_expires_at).toLocaleDateString('fr-FR') : '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-gray-500 text-xs">{k}</dt>
                  <dd className="text-white font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {user.is_banned && user.banned_reason && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                Raison du ban : {user.banned_reason}
              </div>
            )}
          </div>

          {/* Recent syntheses */}
          {user.recentSyntheses?.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Synthèses récentes</h2>
              <ul className="space-y-2">
                {user.recentSyntheses.map(s => (
                  <li key={s.id} className="flex items-center justify-between text-sm">
                    <span className="text-white truncate flex-1">{s.title}</span>
                    <span className="text-gray-600 text-xs ml-4 shrink-0">{new Date(s.created_at).toLocaleDateString('fr-FR')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-4">
          {/* Plan */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Crown size={14} /> Plan
            </h2>

            {/* Plan selector */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { value: 'free', label: 'Gratuit', icon: <User size={13} />, color: 'gray' },
                { value: 'premium', label: 'Premium', icon: <Crown size={13} />, color: 'amber' },
                { value: 'school', label: 'École', icon: <GraduationCap size={13} />, color: 'violet' },
              ].map(({ value, label, icon, color }) => {
                const active = selectedPlan === value;
                const styles = {
                  gray: active ? 'bg-gray-700 border-gray-500 text-white' : 'bg-gray-800/50 border-gray-700 text-gray-500 hover:text-gray-300',
                  amber: active ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-gray-800/50 border-gray-700 text-gray-500 hover:text-amber-400/70',
                  violet: active ? 'bg-violet-500/20 border-violet-500 text-violet-400' : 'bg-gray-800/50 border-gray-700 text-gray-500 hover:text-violet-400/70',
                }[color];
                return (
                  <button key={value} onClick={() => setSelectedPlan(value)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${styles}`}>
                    {icon}
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Expiration (only for premium) */}
            {selectedPlan === 'premium' && (
              <div className="mb-4 space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={premiumForever} onChange={e => setPremiumForever(e.target.checked)}
                    className="accent-amber-400" />
                  Permanent (sans expiration)
                </label>
                {!premiumForever && (
                  <input type="date" value={premiumDate} onChange={e => setPremiumDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                )}
              </div>
            )}

            <button onClick={handleSetPlan} disabled={actionLoading === 'plan'}
              className="w-full bg-sky-500/20 border border-sky-500/30 hover:bg-sky-500/30 text-sky-400 text-sm font-medium py-2 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {actionLoading === 'plan' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Appliquer le plan
            </button>
          </div>

          {/* Danger zone */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Actions</h2>

            {user.is_banned ? (
              <button onClick={handleUnban} disabled={actionLoading === 'unban'}
                className="w-full flex items-center gap-2 justify-center bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 text-sm py-2 rounded-xl transition-colors disabled:opacity-50">
                {actionLoading === 'unban' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Débannir
              </button>
            ) : (
              <>
                {showBanInput ? (
                  <div className="space-y-2">
                    <input value={banReason} onChange={e => setBanReason(e.target.value)}
                      placeholder="Raison (optionnel)"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-400" />
                    <div className="flex gap-2">
                      <button onClick={() => setShowBanInput(false)} className="flex-1 py-2 rounded-xl bg-gray-800 text-gray-400 text-sm">Annuler</button>
                      <button onClick={handleBan} disabled={actionLoading === 'ban'}
                        className="flex-1 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm disabled:opacity-50 flex items-center justify-center gap-1">
                        {actionLoading === 'ban' ? <Loader2 size={12} className="animate-spin" /> : null} Bannir
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowBanInput(true)}
                    className="w-full flex items-center gap-2 justify-center bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-sm py-2 rounded-xl transition-colors">
                    <Ban size={14} /> Bannir le compte
                  </button>
                )}
              </>
            )}

            <button onClick={() => setConfirm({ msg: `Supprimer définitivement ${user.email} et toutes ses données ?`, fn: handleDelete })}
              className="w-full flex items-center gap-2 justify-center bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-sm py-2 rounded-xl transition-colors">
              <Trash2 size={14} /> Supprimer le compte
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
