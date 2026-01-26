import React from 'react';
import { useTranslation } from 'react-i18next';
import { Moon, Sun } from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';

const themes = [
    { code: 'dark', labelKey: 'settings.darkTheme', icon: Moon },
    { code: 'light', labelKey: 'settings.lightTheme', icon: Sun }
];

const ThemeSelector = () => {
    const { t } = useTranslation();
    const { user, updatePreferences } = useAuth();
    const currentTheme = user?.theme || 'dark';

    const handleThemeChange = async (themeCode) => {
        try {
            await updatePreferences({ theme: themeCode });
        } catch (error) {
            console.error('Failed to update theme:', error);
        }
    };

    return (
        <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
                {currentTheme === 'dark' ? (
                    <Moon size={20} className="text-text-muted" />
                ) : (
                    <Sun size={20} className="text-text-muted" />
                )}
                <span className="text-text-main">{t('settings.theme')}</span>
            </div>
            <div className="flex gap-2">
                {themes.map((theme) => {
                    const Icon = theme.icon;
                    return (
                        <button
                            key={theme.code}
                            onClick={() => handleThemeChange(theme.code)}
                            className={`flex-1 p-3 rounded-xl flex items-center justify-center gap-2 transition-colors ${
                                currentTheme === theme.code
                                    ? 'bg-primary text-white'
                                    : 'bg-white/5 text-text-muted hover:bg-white/10'
                            }`}
                        >
                            <Icon size={18} />
                            <span className="font-medium">{t(theme.labelKey)}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default ThemeSelector;
