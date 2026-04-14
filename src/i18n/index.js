import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import fr from './locales/fr.json';
import en from './locales/en.json';
import es from './locales/es.json';
import zh from './locales/zh.json';

// Detect language from browser (user preferences applied after login from DB)
const getDefaultLanguage = () => {
    // Fallback to browser language or French
    const browserLang = navigator.language?.split('-')[0];
    return ['fr', 'en', 'es', 'zh'].includes(browserLang) ? browserLang : 'fr';
};

i18n
    .use(initReactI18next)
    .init({
        resources: {
            fr: { translation: fr },
            en: { translation: en },
            es: { translation: es },
            zh: { translation: zh }
        },
        lng: getDefaultLanguage(),
        fallbackLng: 'fr',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
