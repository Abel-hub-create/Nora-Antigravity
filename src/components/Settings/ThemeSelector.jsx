import React, { useState } from 'react';
import { Moon, Sun, Lock, Check } from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { PremiumGate, usePremiumGate } from '../UI/PremiumGate';
import { useTranslation } from 'react-i18next';

const FREE_THEME_CODES = [
    { code: 'dark',  labelKey: 'settings.darkTheme',  swatch: '#020408', accent: '#38bdf8', premium: false },
    { code: 'light', labelKey: 'settings.lightTheme', swatch: '#f8fafc', accent: '#0284c7', premium: false },
];
const PREMIUM_THEMES = [
    { code: 'midnight', label: 'Midnight', swatch: '#050818', accent: '#818cf8', premium: true },
    { code: 'forest',   label: 'Forest',   swatch: '#030e08', accent: '#34d399', premium: true },
    { code: 'aurora',   label: 'Aurora',   swatch: '#07030e', accent: '#c084fc', premium: true },
];
const ALL_THEMES = [...FREE_THEME_CODES, ...PREMIUM_THEMES];

const ThemeSelector = () => {
    const { t } = useTranslation();
    const { user, updatePreferences } = useAuth();
    const isPremium = user?.plan_type === 'premium' || user?.plan_type === 'school';
    const [selectedTheme, setSelectedTheme] = useState(user?.theme || 'dark');
    const { gateProps, showGate } = usePremiumGate();

    const handleThemeChange = async (theme) => {
        if (theme.premium && !isPremium) {
            showGate(t('premiumGate.features.themes'), t('premiumGate.features.themesDesc'));
            return;
        }
        const prev = selectedTheme;
        setSelectedTheme(theme.code);
        document.documentElement.setAttribute('data-theme', theme.code);
        try {
            await updatePreferences({ theme: theme.code });
        } catch {
            setSelectedTheme(prev);
            document.documentElement.setAttribute('data-theme', prev);
        }
    };

    return (
        <div className="p-4">
            {/* Free themes */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                {FREE_THEME_CODES.map((theme) => (
                    <ThemeCard key={theme.code} theme={theme} selected={selectedTheme === theme.code}
                        locked={false} onClick={() => handleThemeChange(theme)} />
                ))}
            </div>

            {/* Premium themes */}
            <div className="flex items-center gap-2 mb-2 mt-4">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/80">✨ Premium</span>
                {!isPremium && <span className="text-[10px] text-text-muted">— {t('themeSelector.premiumHint')}</span>}
            </div>
            <div className="grid grid-cols-3 gap-2">
                {PREMIUM_THEMES.map((theme) => (
                    <ThemeCard key={theme.code} theme={theme} selected={selectedTheme === theme.code}
                        locked={!isPremium} onClick={() => handleThemeChange(theme)} />
                ))}
            </div>

            <PremiumGate {...gateProps} />
        </div>
    );
};

const ThemeCard = ({ theme, selected, locked, onClick }) => {
    const { t } = useTranslation();
    return (
    <button onClick={onClick}
        className={`theme-card relative p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
            selected ? 'border-primary' : locked ? 'border-white/5 opacity-70' : 'border-white/10 hover:border-white/20'
        }`}
        style={{ background: theme.swatch }}>
        {/* Accent dot */}
        <div className="w-5 h-5 rounded-full" style={{ background: theme.accent }} />
        <span className="text-[11px] font-medium" style={{ color: theme.swatch === '#f8fafc' ? '#0f172a' : '#ffffff' }}>
            {theme.labelKey ? t(theme.labelKey) : theme.label}
        </span>
        {selected && (
            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <Check size={9} className="text-white" />
            </div>
        )}
        {locked && (
            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-500/90 flex items-center justify-center">
                <Lock size={9} className="text-white" />
            </div>
        )}
    </button>
    );
};

export default ThemeSelector;
