import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

const parseBadgeText = (text) => {
  const parts = (text || '').split(' - ');
  return { pos: parts[0] || '', season: parts[1] || '' };
};

const BadgeOnAvatar = ({ badge, size = 52 }) => {
  const { pos, season } = parseBadgeText(badge?.badge_text);
  const emboss = '0 1px 0 rgba(255,220,80,0.5), 0 -1px 1px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.7), 1px 1px 2px rgba(0,0,0,0.8)';
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <img src="/badge-s1.png" alt="Badge" className="w-full h-full object-contain drop-shadow-lg" />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingTop: '2px' }}>
        <span className="font-black leading-none" style={{ fontSize: size * 0.24, color: '#FFE066', textShadow: emboss, letterSpacing: '-0.5px' }}>{pos}</span>
        <span className="font-bold leading-none" style={{ fontSize: size * 0.17, color: '#FFD54F', textShadow: emboss, marginTop: '2px' }}>{season}</span>
      </div>
    </div>
  );
};
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Crown, Flame, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import api from '../../lib/api';

const UserProfileModal = ({ userId, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(false);
      const data = await api.get(`/auth/users/${userId}/public`);
      setProfile(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleOwnProfile = () => {
    onClose();
    navigate('/profile');
  };

  const planLabel = (plan) => {
    const map = {
      free: t('userProfile.subscription.free'),
      premium: t('userProfile.subscription.premium'),
      school: t('userProfile.subscription.school'),
    };
    return map[plan] || plan;
  };

  const planColor = (plan) => {
    if (plan === 'premium') return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
    if (plan === 'school') return 'text-sky-400 bg-sky-500/15 border-sky-500/30';
    return 'text-text-muted bg-white/5 border-white/10';
  };

  const modal = (
    <AnimatePresence>
      {userId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-sm bg-surface border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              {/* Close button */}
              <div className="flex justify-end px-4 pt-4">
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-text-muted hover:text-text-main hover:bg-white/10 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={28} className="animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="text-center py-10 px-6 text-text-muted text-sm">
                  {t('common.error')}
                </div>
              ) : profile ? (
                <div className="px-6 pb-6">
                  {/* Avatar + Nom */}
                  <div className="flex flex-col items-center gap-3 mb-6">
                    <div className="relative" style={{ paddingBottom: profile.activeBadge ? '28px' : '0' }}>
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary p-[2px]">
                        <div className="w-full h-full rounded-full bg-surface flex items-center justify-center overflow-hidden">
                          {profile.user.avatar ? (
                            <img src={profile.user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-3xl font-bold text-text-main">
                              {profile.user.name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Badge centré en bas, dépasse de l'avatar */}
                      {profile.activeBadge && (
                        <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 0 }}>
                          <BadgeOnAvatar badge={profile.activeBadge} size={48} />
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <h2 className="text-lg font-bold text-text-main">{profile.user.name}</h2>
                      <div className="flex items-center justify-center gap-1.5 mt-1">
                        <Star size={13} className="text-primary fill-current" />
                        <span className="text-sm text-primary font-medium">
                          {t('userProfile.level', { level: profile.user.level })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex gap-3 mb-5">
                    {/* Plan */}
                    <div className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold ${planColor(profile.user.plan_type)}`}>
                      {profile.user.plan_type !== 'free' && <Crown size={12} />}
                      {planLabel(profile.user.plan_type)}
                    </div>
                    {/* Winstreak */}
                    <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-orange-500/20 bg-orange-500/10 text-xs font-semibold text-orange-300">
                      <Flame size={12} />
                      {profile.user.winstreak}
                    </div>
                  </div>

                  {/* Badges */}
                  {profile.badges && profile.badges.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                        {t('badges.title')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {profile.badges.map((badge) => (
                          <span
                            key={badge.id}
                            className="px-3 py-1 bg-primary/15 border border-primary/30 rounded-full text-xs font-bold text-primary"
                          >
                            {badge.badge_text}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CTA si c'est son propre profil */}
                  {isOwnProfile && (
                    <button
                      onClick={handleOwnProfile}
                      className="mt-5 w-full py-2.5 rounded-2xl bg-primary/15 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/25 transition-colors"
                    >
                      {t('userProfile.viewProfile')}
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return ReactDOM.createPortal(modal, document.body);
};

export function useUserProfileModal() {
  const [openUserId, setOpenUserId] = useState(null);
  const open = (userId) => setOpenUserId(userId);
  const close = () => setOpenUserId(null);
  return { openUserId, openProfile: open, closeProfile: close };
}

export default UserProfileModal;
