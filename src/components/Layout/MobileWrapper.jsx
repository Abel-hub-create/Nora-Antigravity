import React from 'react';
import { Home, GraduationCap, PlusCircle, User, Gift } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import NotificationStack from '../UI/NotificationStack';

const MobileWrapper = ({ children }) => {
    const { t } = useTranslation();
    const location = useLocation();

    const navItems = [
        { icon: Home, labelKey: 'nav.home', path: '/' },
        { icon: GraduationCap, labelKey: 'nav.study', path: '/study' },
        { icon: Gift, labelKey: 'nav.collection', path: '/collection' },
        { icon: PlusCircle, labelKey: 'nav.import', path: '/import' },
        { icon: User, labelKey: 'nav.profile', path: '/profile' },
    ];

    return (
        <div className="min-h-screen bg-background font-sans text-text-main">
            {/* Sidebar Navigation - Desktop only */}
            <nav className="hidden md:flex flex-col w-64 bg-surface/50 border-r border-white/5 p-4 fixed h-full z-40">
                {/* Logo */}
                <div className="mb-8 px-2">
                    <h1 className="text-2xl font-bold text-primary">Nora</h1>
                    <p className="text-xs text-text-muted mt-1">{t('nav.tagline')}</p>
                </div>

                {/* Nav Items */}
                <div className="flex flex-col gap-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={clsx(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                                    isActive
                                        ? "bg-primary/20 text-primary"
                                        : "text-text-muted hover:text-text-main hover:bg-white/5"
                                )}
                            >
                                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="font-medium">{t(item.labelKey)}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Main Content Area */}
            <div className="md:ml-64 min-h-screen">
                {/* Notifications */}
                <NotificationStack />

                {/* Content */}
                <main className="pb-24 md:pb-6">
                    <div className="max-w-3xl mx-auto">
                        {children}
                    </div>
                </main>

                {/* Bottom Navigation - Mobile only */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-surface/95 backdrop-blur-md border-t border-white/5 flex justify-around items-center px-2 pb-2 z-50">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className="flex flex-col items-center justify-center w-16 h-full gap-1 group"
                            >
                                <div className={clsx(
                                    "p-1.5 rounded-xl transition-all duration-300",
                                    isActive ? "bg-primary/20 text-primary" : "text-text-muted group-hover:text-text-main"
                                )}>
                                    <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                                <span className={clsx(
                                    "text-[10px] font-medium transition-colors",
                                    isActive ? "text-primary" : "text-text-muted"
                                )}>
                                    {t(item.labelKey)}
                                </span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
};

export default MobileWrapper;
