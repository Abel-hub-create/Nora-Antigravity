import React from 'react';
import { Home, BookOpen, PlusCircle, User, Battery, Wifi, Signal, Gift } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';

const MobileWrapper = ({ children }) => {
    const location = useLocation();

    const navItems = [
        { icon: Home, label: 'Accueil', path: '/' },
        { icon: BookOpen, label: 'Cours', path: '/summary' }, // Placeholder for learning/summary
        { icon: Gift, label: 'Collection', path: '/collection' },
        { icon: PlusCircle, label: 'Importer', path: '/import' },
        { icon: User, label: 'Profil', path: '/profile' },
    ];

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans text-text-main">
            {/* Phone Frame */}
            <div className="w-full max-w-[400px] h-[850px] bg-background rounded-[3rem] overflow-hidden relative border-[8px] border-surface shadow-2xl flex flex-col">

                {/* Status Bar */}
                <div className="h-12 bg-background flex justify-between items-center px-6 pt-2 shrink-0 z-50">
                    <span className="text-sm font-semibold">9:41</span>
                    <div className="flex items-center gap-2">
                        <Signal size={16} />
                        <Wifi size={16} />
                        <Battery size={20} />
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto scrollbar-hide relative">
                    {children}
                </div>

                {/* Bottom Navigation */}
                <nav className="h-20 bg-surface/80 backdrop-blur-md border-t border-white/5 flex justify-around items-center px-2 shrink-0 pb-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.label}
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
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Home Indicator */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full" />
            </div>
        </div>
    );
};

export default MobileWrapper;
