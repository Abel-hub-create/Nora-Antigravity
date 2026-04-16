import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Loader2, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../features/auth/hooks/useAuth';
import UserProfileModal, { useUserProfileModal } from '../components/UI/UserProfileModal';
import api from '../lib/api';

const Leaderboard = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { openUserId, openProfile, closeProfile } = useUserProfileModal();

  const [leaderboard, setLeaderboard] = useState([]);
  const [season, setSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get('/seasons/leaderboard');
      setLeaderboard(data.leaderboard || []);
      setSeason(data.season || null);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Countdown
  useEffect(() => {
    if (!season?.ends_at) { setTimeLeft(null); return; }

    const update = () => {
      const diff = new Date(season.ends_at) - new Date();
      if (diff <= 0) { setTimeLeft(null); return; }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft({ days, hours, mins, totalMs: diff });
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [season]);

  const rankStyle = (pos) => {
    if (pos === 1) return 'text-yellow-400';
    if (pos === 2) return 'text-slate-300';
    if (pos === 3) return 'text-amber-600';
    return 'text-text-muted';
  };

  const rankIcon = (pos) => {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return `#${pos}`;
  };

  return (
    <div className="min-h-full bg-background p-6 pb-24">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Trophy size={22} className="text-primary" />
          <h1 className="text-2xl font-bold text-text-main">{t('leaderboard.title')}</h1>
        </div>
        <p className="text-sm text-text-muted">{t('leaderboard.subtitle')}</p>
      </header>

      {/* Season info */}
      {season ? (
        <div className="bg-surface/50 border border-white/8 rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-text-main">{season.name}</p>
            {timeLeft !== null ? (
              <p className={`text-xs mt-0.5 ${timeLeft.totalMs < 3600000 ? 'text-orange-400' : 'text-text-muted'}`}>
                {timeLeft.totalMs < 3600000
                  ? t('leaderboard.resetSoon')
                  : t('leaderboard.endsIn', { time: t('season.timeRemaining', { days: timeLeft.days, hours: timeLeft.hours }) })}
              </p>
            ) : (
              <p className="text-xs text-text-muted mt-0.5">{t('season.ended')}</p>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
            <Trophy size={18} className="text-primary" />
          </div>
        </div>
      ) : !loading && (
        <div className="bg-surface/50 border border-white/8 rounded-2xl p-4 mb-6 text-center">
          <p className="text-sm font-semibold text-text-muted">{t('leaderboard.noSeason')}</p>
          <p className="text-xs text-text-muted mt-1">{t('leaderboard.noSeasonDesc')}</p>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <Trophy size={40} className="mx-auto mb-3 opacity-30" />
          <p>{t('leaderboard.empty')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((player, index) => {
            const pos = index + 1;
            const isMe = player.id === currentUser?.id;
            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => {
                  if (isMe) return; // own profile handled via nav
                  openProfile(player.id);
                }}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors cursor-pointer ${
                  isMe
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-surface/50 border-white/5 hover:border-white/15'
                }`}
              >
                {/* Rank */}
                <div className={`w-8 text-center font-bold text-sm shrink-0 ${rankStyle(pos)}`}>
                  {rankIcon(pos)}
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/50 to-secondary/50 flex items-center justify-center shrink-0 overflow-hidden">
                  {player.avatar ? (
                    <img src={player.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-white">
                      {player.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>

                {/* Name + plan */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-sm font-semibold truncate ${isMe ? 'text-primary' : 'text-text-main'}`}>
                      {player.name}
                    </p>
                    {isMe && (
                      <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold shrink-0">
                        {t('leaderboard.you')}
                      </span>
                    )}
                    {player.plan_type !== 'free' && (
                      <Crown size={11} className="text-amber-400 shrink-0" />
                    )}
                  </div>
                </div>

                {/* Level */}
                <div className="flex items-center gap-1 shrink-0">
                  <Star size={13} className="text-primary fill-current" />
                  <span className="text-sm font-bold text-text-main">{player.level}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal profil */}
      {openUserId && (
        <UserProfileModal userId={openUserId} onClose={closeProfile} />
      )}
    </div>
  );
};

export default Leaderboard;
