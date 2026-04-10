import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';

const languages = [
    { code: 'fr', label: 'Français', countryCode: 'fr' },
    { code: 'en', label: 'English', countryCode: 'gb' }
];

const LanguageSelector = () => {
    const { t, i18n } = useTranslation();
    const { user, updatePreferences } = useAuth();
    const [selectedLang, setSelectedLang] = useState(user?.language || 'fr');

    const handleLanguageChange = async (langCode) => {
        // Optimistic update - apply immediately for instant feedback
        setSelectedLang(langCode);
        i18n.changeLanguage(langCode);

        // Then sync to backend in background
        try {
            await updatePreferences({ language: langCode });
        } catch (error) {
            console.error('Failed to update language:', error);
            // Revert on error
            setSelectedLang(user?.language || 'fr');
            i18n.changeLanguage(user?.language || 'fr');
        }
    };

    return (
        <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
                <Globe size={20} className="text-text-muted" />
                <span className="text-text-main">{t('settings.language')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`p-3 rounded-xl flex items-center justify-center gap-2 transition-colors ${
                            selectedLang === lang.code
                                ? 'bg-primary text-white'
                                : 'bg-white/5 text-text-muted hover:bg-white/10'
                        }`}
                    >
                        <img src={`https://flagcdn.com/24x18/${lang.countryCode}.png`} alt={lang.code} width="24" height="18" className="rounded-sm" />
                        <span className="font-medium text-sm">{lang.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default LanguageSelector;
