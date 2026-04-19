import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DailyProgress from '../components/Home/DailyProgress';
import QuickActionCard from '../components/Home/QuickActionCard';
import { Plus, BookOpen, ShoppingBag, MessageSquare, Crown, Coins } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useAuth } from '../features/auth/hooks/useAuth';
import AnimatedNumber from '../components/UI/AnimatedNumber';

const Home = () => {
    const { t } = useTranslation();
    const { user } = useUser();
    const { user: authUser } = useAuth();
    const isPremium = authUser?.plan_type && authUser.plan_type !== 'free';
    const tagline = t('home.tagline');
    const [displayed, setDisplayed] = useState('');
    const [cursorVisible, setCursorVisible] = useState(true);

    useEffect(() => {
        setDisplayed('');
        setCursorVisible(true);
        let i = 0;
        const interval = setInterval(() => {
            i++;
            setDisplayed(tagline.slice(0, i));
            if (i >= tagline.length) {
                clearInterval(interval);
                setTimeout(() => setCursorVisible(false), 900);
            }
        }, 38);
        return () => clearInterval(interval);
    }, [tagline]);

    return (
        <div className="p-6 pt-8 pb-24 space-y-6">
            {/* Header */}
            <header className="mb-6 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-text-main">{t('home.greeting', { name: user.name?.split(' ')[0] || t('common.user') })}</h1>
                    <p className="text-text-muted italic">
                        {displayed}
                        {cursorVisible && <span className="animate-pulse opacity-60">|</span>}
                    </p>
                </div>
                {/* Winstreak + Pièces */}
                <div className="flex items-center gap-2 shrink-0 mt-1 pr-1">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface/80 border border-white/10 rounded-full">
                        <span className="text-base leading-none">🔥</span>
                        <AnimatedNumber value={user.winstreak ?? 1} duration={600} className="text-sm font-bold text-text-main" />
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface/80 border border-amber-500/20 rounded-full">
                        <Coins size={14} className="text-amber-400" />
                        <AnimatedNumber value={user.coins ?? 0} duration={600} className="text-sm font-bold text-amber-300" />
                    </div>
                </div>
            </header>

            {/* Premium Banner (free users only) */}
            {!isPremium && (
                <Link to="/pricing" className="block bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 hover:from-amber-500/20 hover:to-orange-500/15 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/25">
                        <Crown size={18} className="text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-amber-300">{t('home.premiumBanner.title')}</p>
                        <p className="text-xs text-amber-300/70 truncate">{t('home.premiumBanner.subtitle')}</p>
                    </div>
                    <span className="ml-auto text-xs font-semibold text-amber-400 shrink-0">{t('home.premiumBanner.cta')}</span>
                </Link>
            )}

            {/* Daily Progress */}
            <DailyProgress />

            {/* Quick Actions Grid */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">{t('home.quickActions')}</h3>

                <QuickActionCard
                    title={t('home.viewSyntheses')}
                    subtitle={t('home.allStudies')}
                    icon={BookOpen}
                    to="/study"
                />

                <QuickActionCard
                    title={t('home.viewShop')}
                    subtitle={t('home.shopSubtitle')}
                    icon={ShoppingBag}
                    to="/shop"
                />

                <QuickActionCard
                    title={t('home.newImport')}
                    subtitle={t('home.textOrVoice')}
                    icon={Plus}
                    to="/import"
                />

                <QuickActionCard
                    title={t('home.feedback')}
                    subtitle={t('home.feedbackSubtitle')}
                    icon={MessageSquare}
                    to="/feedback"
                />
            </div>
        </div>
    );
};

export default Home;
