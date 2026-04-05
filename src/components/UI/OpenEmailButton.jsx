import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Détecte le webmail à partir du domaine email
const getWebmailUrl = (email) => {
    const domain = (email.split('@')[1] || '').toLowerCase();
    if (domain.includes('gmail'))                          return 'https://mail.google.com';
    if (/outlook|hotmail|live|msn/.test(domain))          return 'https://outlook.live.com/mail';
    if (domain.includes('yahoo'))                          return 'https://mail.yahoo.com';
    if (/icloud|me\.com|mac\.com/.test(domain))           return 'https://www.icloud.com/mail';
    if (domain.includes('proton'))                         return 'https://mail.proton.me';
    if (domain.includes('orange'))                         return 'https://messagerie.orange.fr';
    if (/sfr|neuf/.test(domain))                          return 'https://webmail.sfr.fr';
    if (domain.includes('laposte'))                        return 'https://www.laposte.net/accueil';
    return null; // fallback mailto
};

/**
 * Bouton "Ouvrir ma boîte mail" — détecte le provider et ouvre le bon webmail.
 * @param {string} email  adresse email de l'utilisateur
 */
const OpenEmailButton = ({ email }) => {
    const { t } = useTranslation();

    const handleClick = () => {
        const url = getWebmailUrl(email);
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            window.open(`mailto:${email}`);
        }
    };

    return (
        <button
            onClick={handleClick}
            className="flex items-center justify-center gap-2 w-full py-3 px-4
                       bg-primary text-background font-semibold rounded-xl
                       hover:bg-primary-dark transition-colors mb-4"
        >
            <ExternalLink size={18} />
            {t('auth.openMailbox')}
        </button>
    );
};

export default OpenEmailButton;
