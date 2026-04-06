import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const AppleLoginButton = ({ onSuccess, onError }) => {
  const { t } = useTranslation();
  const initialized = useRef(false);

  useEffect(() => {
    const init = () => {
      if (initialized.current) return;
      initialized.current = true;
      window.AppleID.auth.init({
        clientId: import.meta.env.VITE_APPLE_CLIENT_ID,
        scope: 'email name',
        redirectURI: window.location.origin + '/login',
        usePopup: true
      });
    };

    if (window.AppleID) {
      init();
    } else {
      const script = document.createElement('script');
      script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
      script.onload = init;
      document.head.appendChild(script);
    }
  }, []);

  const handleClick = async () => {
    try {
      const result = await window.AppleID.auth.signIn();
      await onSuccess(result.authorization.id_token, result.user || null);
    } catch (error) {
      // User closed the popup — not an error
      if (error?.error === 'popup_closed_by_user' || error?.error === 'user_cancelled_authorize') return;
      onError();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-text-main text-sm font-medium transition-colors"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
        <path d="M14.14 9.53a4.18 4.18 0 0 1 2-3.51 4.28 4.28 0 0 0-3.37-1.82c-1.42-.15-2.8.85-3.52.85s-1.85-.83-3.05-.81A4.5 4.5 0 0 0 2.4 6.54C.74 9.36 1.95 13.56 3.55 15.86c.8 1.14 1.74 2.42 2.98 2.37 1.2-.05 1.65-.77 3.1-.77s1.86.77 3.12.74c1.3-.02 2.1-1.15 2.88-2.3a9.3 9.3 0 0 0 1.31-2.66 4.04 4.04 0 0 1-2.8-3.71ZM11.9 3.32A4.12 4.12 0 0 0 12.84 0a4.19 4.19 0 0 0-2.72 1.41 3.92 3.92 0 0 0-.97 2.84 3.47 3.47 0 0 0 2.75-1.93Z"/>
      </svg>
      {t('auth.continueWithApple')}
    </button>
  );
};

export default AppleLoginButton;
