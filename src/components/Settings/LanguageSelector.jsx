import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';

const languages = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English', flag: '🇬🇧' }
];

const LanguageSelector = () => {
    const { t } = useTranslation();
    const { user, updatePreferences } = useAuth();
    const currentLang = user?.language || 'fr';

    const handleLanguageChange = async (langCode) => {
        try {
            await updatePreferences({ language: langCode });
        } catch (error) {
            console.error('Failed to update language:', error);
        }
    };

    return (
        <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
                <Globe size={20} className="text-text-muted" />
                <span className="text-text-main">{t('settings.language')}</span>
            </div>
            <div className="flex gap-2">
                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`flex-1 p-3 rounded-xl flex items-center justify-center gap-2 transition-colors ${
                            currentLang === lang.code
                                ? 'bg-primary text-white'
                                : 'bg-white/5 text-text-muted hover:bg-white/10'
                        }`}
                    >
                        <span className="text-lg">{lang.flag}</span>
                        <span className="font-medium">{lang.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default LanguageSelector;
