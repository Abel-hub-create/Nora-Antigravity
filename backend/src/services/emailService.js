/**
 * Email Service
 *
 * Gere l'envoi d'emails via Resend pour:
 * - Reset de mot de passe
 * - Verification d'email a l'inscription
 *
 * Supporte 4 langues: fr, en, es, zh
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'Nora <noreply@mirora.cloud>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://mirora.cloud';

// HTML escape to prevent XSS in email templates
const escapeHtml = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Traductions des emails
 */
const EMAIL_TRANSLATIONS = {
  fr: {
    passwordReset: {
      subject: 'Réinitialise ton mot de passe - Nora',
      title: 'Mot de passe oublié ?',
      message: 'Pas de panique ! Clique sur le bouton ci-dessous pour créer un nouveau mot de passe.',
      button: 'Modifier mon mot de passe',
      expiry: 'Ce lien expire dans 1 heure.',
      ignore: 'Si tu n\'as pas demandé de réinitialisation, ignore cet email.'
    },
    verification: {
      subject: 'Vérifie ton email - Nora',
      title: 'Bienvenue',
      message: 'Merci de t\'être inscrit sur Nora. Pour commencer à apprendre, vérifie ton adresse email.',
      button: 'Vérifier mon email',
      expiry: 'Ce lien expire dans 1 heure.',
      ignore: 'Si tu n\'as pas créé de compte, ignore cet email.'
    },
    footer: 'Nora - Apprends sans pression'
  },
  en: {
    passwordReset: {
      subject: 'Reset your password - Nora',
      title: 'Forgot your password?',
      message: 'No worries! Click the button below to create a new password.',
      button: 'Reset my password',
      expiry: 'This link expires in 1 hour.',
      ignore: 'If you didn\'t request a password reset, please ignore this email.'
    },
    verification: {
      subject: 'Verify your email - Nora',
      title: 'Welcome',
      message: 'Thanks for signing up for Nora. To start learning, please verify your email address.',
      button: 'Verify my email',
      expiry: 'This link expires in 1 hour.',
      ignore: 'If you didn\'t create an account, please ignore this email.'
    },
    footer: 'Nora - Learn without pressure'
  },
  es: {
    passwordReset: {
      subject: 'Restablece tu contraseña - Nora',
      title: '¿Olvidaste tu contraseña?',
      message: '¡No te preocupes! Haz clic en el botón de abajo para crear una nueva contraseña.',
      button: 'Cambiar mi contraseña',
      expiry: 'Este enlace expira en 1 hora.',
      ignore: 'Si no solicitaste restablecer tu contraseña, ignora este correo.'
    },
    verification: {
      subject: 'Verifica tu email - Nora',
      title: 'Bienvenido',
      message: 'Gracias por registrarte en Nora. Para empezar a aprender, verifica tu dirección de correo.',
      button: 'Verificar mi email',
      expiry: 'Este enlace expira en 1 hora.',
      ignore: 'Si no creaste una cuenta, ignora este correo.'
    },
    footer: 'Nora - Aprende sin presión'
  },
  zh: {
    passwordReset: {
      subject: '重置密码 - Nora',
      title: '忘记密码了？',
      message: '别担心！点击下面的按钮创建新密码。',
      button: '重置我的密码',
      expiry: '此链接将在1小时后过期。',
      ignore: '如果您没有请求重置密码，请忽略此邮件。'
    },
    verification: {
      subject: '验证您的邮箱 - Nora',
      title: '欢迎',
      message: '感谢您注册Nora。请验证您的邮箱地址以开始学习。',
      button: '验证我的邮箱',
      expiry: '此链接将在1小时后过期。',
      ignore: '如果您没有创建账户，请忽略此邮件。'
    },
    footer: 'Nora - 轻松学习'
  }
};

/**
 * Obtient les traductions pour une langue donnée
 */
const getTranslations = (language) => {
  return EMAIL_TRANSLATIONS[language] || EMAIL_TRANSLATIONS.fr;
};

/**
 * Génère le template HTML de base pour les emails
 */
const generateEmailTemplate = (content, footer) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="500" cellpadding="0" cellspacing="0" style="max-width: 500px;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <img src="${FRONTEND_URL}/nora-logo.png" alt="Nora" width="80" height="80" style="border-radius: 16px;">
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color: #1e293b; border-radius: 24px; padding: 40px; border: 1px solid rgba(255,255,255,0.05);">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 30px; text-align: center;">
              <p style="color: #475569; font-size: 12px; margin: 0;">
                ${footer}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Envoie un email de reset de mot de passe
 * @param {string} email - Adresse email du destinataire
 * @param {string} token - Token de reset
 * @param {string} language - Langue (fr, en, es, zh)
 */
export const sendPasswordResetEmail = async (email, token, language = 'fr') => {
  const resetLink = `${FRONTEND_URL}/reset-password/${token}`;
  const t = getTranslations(language).passwordReset;
  const footer = getTranslations(language).footer;

  const content = `
    <h1 style="color: #f1f5f9; font-size: 24px; margin: 0 0 16px 0; text-align: center;">
      ${t.title}
    </h1>
    <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
      ${t.message}
    </p>

    <!-- Button -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="${resetLink}" style="display: inline-block; background-color: #38bdf8; color: #0f172a; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 12px; font-size: 16px;">
            ${t.button}
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
      ${t.expiry}<br>
      ${t.ignore}
    </p>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: t.subject,
      html: generateEmailTemplate(content, footer)
    });

    if (error) {
      console.error('[EmailService] Erreur envoi reset password:', error);
      throw new Error('Erreur lors de l\'envoi de l\'email');
    }

    console.log(`[EmailService] Email reset password envoye a ${email} (langue: ${language})`);
    return data;
  } catch (error) {
    console.error('[EmailService] Erreur:', error);
    throw error;
  }
};

/**
 * Envoie un email de verification d'email
 * @param {string} email - Adresse email du destinataire
 * @param {string} token - Token de vérification
 * @param {string} name - Nom de l'utilisateur
 * @param {string} language - Langue (fr, en, es, zh)
 */
export const sendVerificationEmail = async (email, token, name, language = 'fr') => {
  const verifyLink = `${FRONTEND_URL}/verify-email/${token}`;
  const firstName = escapeHtml(name ? name.split(' ')[0] : '');
  const t = getTranslations(language).verification;
  const footer = getTranslations(language).footer;

  // Titre avec le prénom si disponible
  const titleWithName = firstName ? `${t.title} ${firstName} !` : `${t.title} !`;

  const content = `
    <h1 style="color: #f1f5f9; font-size: 24px; margin: 0 0 16px 0; text-align: center;">
      ${titleWithName}
    </h1>
    <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
      ${t.message}
    </p>

    <!-- Button -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="${verifyLink}" style="display: inline-block; background-color: #38bdf8; color: #0f172a; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 12px; font-size: 16px;">
            ${t.button}
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
      ${t.expiry}<br>
      ${t.ignore}
    </p>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: t.subject,
      html: generateEmailTemplate(content, footer)
    });

    if (error) {
      console.error('[EmailService] Erreur envoi verification:', error);
      throw new Error('Erreur lors de l\'envoi de l\'email');
    }

    console.log(`[EmailService] Email verification envoye a ${email} (langue: ${language})`);
    return data;
  } catch (error) {
    console.error('[EmailService] Erreur:', error);
    throw error;
  }
};

export default {
  sendPasswordResetEmail,
  sendVerificationEmail
};
