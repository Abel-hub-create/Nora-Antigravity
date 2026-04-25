import React, { useEffect } from 'react';
import { Home, GraduationCap, PlusCircle, User, ShoppingBag, Settings, Bot, Crown, BookOpen } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import NotificationStack from '../UI/NotificationStack';
import OnboardingModal from '../Onboarding/OnboardingModal';
import CoinBagModal from '../Gamification/CoinBagModal';
import { useRevision } from '../../context/RevisionContext';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { playClick, playHover } from '../../utils/sounds';

const MobileWrapper = ({ children }) => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { isRevisionActive } = useRevision();
    const { user } = useAuth();

    // Global sound effects
    useEffect(() => {
        const INTERACTIVE = 'button, a, [role="button"], input[type="checkbox"], input[type="radio"], select, label';
        let lastClickAt = 0;

        const soundsOn = () => localStorage.getItem('nora_sounds_enabled') !== 'false';

        const handleClick = (e) => {
            if (e.target.closest(INTERACTIVE)) {
                lastClickAt = Date.now();
                if (soundsOn()) playClick();
            }
        };
        const handleMouseOver = (e) => {
            if (Date.now() - lastClickAt < 150) return;
            if (!soundsOn()) return;
            // Swoosh uniquement sur les éléments qui s'agrandissent au hover
            const SCALE_HOVER = '.hover-lift, [class*="hover:scale-"], [class*="hover:scale"]';
            if (e.target.closest(SCALE_HOVER)) playHover();
        };

        document.addEventListener('click', handleClick, true);
        document.addEventListener('mouseover', handleMouseOver, true);
        return () => {
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('mouseover', handleMouseOver, true);
        };
    }, []);

    // Apply user's theme when MobileWrapper mounts or user changes
    useEffect(() => {
        if (user?.theme) {
            document.documentElement.setAttribute('data-theme', user.theme);
        }
    }, [user?.theme]);

    // Show onboarding modal for new users
    const showOnboarding = user && !user.onboarding_completed;

    const allNavItems = [
        { icon: Home,          labelKey: 'nav.home',        path: '/' },
        { icon: GraduationCap, labelKey: 'nav.study',       path: '/study' },
        { icon: ShoppingBag,   labelKey: 'nav.shop',        path: '/shop' },
        { icon: BookOpen,      labelKey: 'nav.binder',      path: '/binder' },
        { icon: PlusCircle,    labelKey: 'nav.import',      path: '/import' },
        { icon: Bot,           labelKey: 'nav.assistant',   path: '/assistant' },
        { icon: User,          labelKey: 'nav.profile',     path: '/profile' },
        { icon: Settings,      labelKey: 'nav.settings',    path: '/settings' },
    ];
    const bottomNavItems = [
        { icon: Home,          labelKey: 'nav.home',        path: '/' },
        { icon: GraduationCap, labelKey: 'nav.study',       path: '/study' },
        { icon: BookOpen,      labelKey: 'nav.binder',      path: '/binder' },
        { icon: PlusCircle,    labelKey: 'nav.import',      path: '/import' },
        { icon: Bot,           labelKey: 'nav.assistant',   path: '/assistant' },
        { icon: ShoppingBag,   labelKey: 'nav.shop',        path: '/shop' },
        { icon: User,          labelKey: 'nav.profile',     path: '/profile' },
        { icon: Settings,      labelKey: 'nav.settings',    path: '/settings' },
    ];
    const isPremium = user?.plan_type && user.plan_type !== 'free';

    return (
        <div className="min-h-screen bg-background font-sans text-text-main">
            {/* Onboarding Modal for new users */}
            {showOnboarding && <OnboardingModal />}
            {/* Sac de pièces — bloque la navigation jusqu'à révélation */}
            <CoinBagModal />

            {/* Sidebar Navigation - Desktop only */}
            <nav className="hidden md:flex flex-col w-64 bg-surface/50 border-r border-white/5 p-4 fixed h-full z-40">
                {/* Logo + plan badge */}
                <div className="mb-8 px-2 flex items-center gap-3">
                    <img src="/noralogo.png" alt="Nora" className="w-12 h-12 object-contain shrink-0" />
                    <div>
                        <h1 className="text-2xl font-bold text-primary">Nora</h1>
                        <p className="text-xs text-text-muted mt-1">{t('nav.tagline')}</p>
                        {isPremium && (
                            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                                <Crown size={11} className="text-amber-400" />
                                <span className="text-[10px] font-semibold text-amber-400 capitalize">{user.plan_type}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Nav Items */}
                <div className="flex flex-col gap-2">
                    {allNavItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <a
                                key={item.path}
                                href={item.path}
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (isRevisionActive) {
                                        const confirmed = window.confirm(t('revision.leaveConfirmMessage'));
                                        if (confirmed) navigate(item.path);
                                    } else {
                                        navigate(item.path);
                                    }
                                }}
                                className={clsx(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer hover-lift",
                                    isActive
                                        ? "bg-primary/20 text-primary"
                                        : "text-text-muted hover:text-text-main hover:bg-white/5"
                                )}
                            >
                                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="font-medium">{t(item.labelKey)}</span>
                            </a>
                        );
                    })}
                </div>
            </nav>

            {/* Main Content Area */}
            <div className="md:ml-64 min-h-screen">
                {/* Notifications */}
                <NotificationStack />


                {/* Content */}
                {location.pathname === '/assistant' ? (
                    <main className="flex flex-col" style={{height: 'calc(100dvh - env(safe-area-inset-bottom, 0px))', paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))'}}>
                        {children}
                    </main>
                ) : (
                    <main className="md:pb-6" style={{paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))'}}>
                        <div className="max-w-3xl mx-auto">
                            {children}
                        </div>
                    </main>
                )}

                {/* Bottom Navigation - Mobile only */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-white/5 flex justify-around items-center px-2 z-50" style={{height:'56px', paddingBottom:'env(safe-area-inset-bottom)'}}>
                    {bottomNavItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <a
                                key={item.path}
                                href={item.path}
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (isRevisionActive) {
                                        const confirmed = window.confirm(t('revision.leaveConfirmMessage'));
                                        if (confirmed) navigate(item.path);
                                    } else {
                                        navigate(item.path);
                                    }
                                }}
                                className="flex items-center justify-center flex-1 h-full cursor-pointer"
                                title={t(item.labelKey)}
                            >
                                <div className={clsx(
                                    "p-2 rounded-xl transition-all duration-200",
                                    isActive ? "bg-primary/20 text-primary" : "text-text-muted"
                                )}>
                                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                            </a>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
};

export default MobileWrapper;
