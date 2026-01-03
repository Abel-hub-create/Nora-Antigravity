import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import fr from './locales/fr.json';
import en from './locales/en.json';

// Detect language from localStorage or browser
const getDefaultLanguage = () => {
    const stored = localStorage.getItem('nora_language');
    if (stored && ['fr', 'en'].includes(stored)) {
        return stored;
    }
    // Fallback to browser language or French
    const browserLang = navigator.language?.split('-')[0];
    return ['fr', 'en'].includes(browserLang) ? browserLang : 'fr';
};

i18n
    .use(initReactI18next)
    .init({
        resources: {
            fr: { translation: fr },
            en: { translation: en }
        },
        lng: getDefaultLanguage(),
        fallbackLng: 'fr',
        interpolation: {
            escapeValue: false
        }
    });

// Save language preference when it changes
i18n.on('languageChanged', (lng) => {
    localStorage.setItem('nora_language', lng);
});

export default i18n;
