import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import fr from './locales/fr.json';
import en from './locales/en.json';

// Priority: localStorage (set on login + language change) > browser language
const getDefaultLanguage = () => {
    const stored = localStorage.getItem('i18nextLng');
    if (stored && ['fr', 'en'].includes(stored)) return stored;
    const browserLang = navigator.language?.split('-')[0];
    return ['fr', 'en'].includes(browserLang) ? browserLang : 'fr';
};

i18n
    .use(initReactI18next)
    .init({
        resources: {
            fr: { translation: fr },
            en: { translation: en },
        },
        lng: getDefaultLanguage(),
        fallbackLng: 'fr',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
