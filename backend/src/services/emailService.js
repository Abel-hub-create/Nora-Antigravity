/**
 * Email Service
 *
 * Gere l'envoi d'emails via Resend pour:
 * - Reset de mot de passe
 * - Verification d'email a l'inscription
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
 * Envoie un email de reset de mot de passe
 */
export const sendPasswordResetEmail = async (email, token) => {
  const resetLink = `${FRONTEND_URL}/reset-password/${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Reinitialise ton mot de passe - Nora',
      html: `
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
                      <h1 style="color: #f1f5f9; font-size: 24px; margin: 0 0 16px 0; text-align: center;">
                        Mot de passe oublie ?
                      </h1>
                      <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
                        Pas de panique ! Clique sur le bouton ci-dessous pour creer un nouveau mot de passe.
                      </p>

                      <!-- Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <a href="${resetLink}" style="display: inline-block; background-color: #38bdf8; color: #0f172a; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 12px; font-size: 16px;">
                              Reinitialiser mon mot de passe
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
                        Ce lien expire dans 1 heure.<br>
                        Si tu n'as pas demande de reinitialisation, ignore cet email.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding-top: 30px; text-align: center;">
                      <p style="color: #475569; font-size: 12px; margin: 0;">
                        Nora - Apprends sans pression
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('[EmailService] Erreur envoi reset password:', error);
      throw new Error('Erreur lors de l\'envoi de l\'email');
    }

    console.log(`[EmailService] Email reset password envoye a ${email}`);
    return data;
  } catch (error) {
    console.error('[EmailService] Erreur:', error);
    throw error;
  }
};

/**
 * Envoie un email de verification d'email
 */
export const sendVerificationEmail = async (email, token, name) => {
  const verifyLink = `${FRONTEND_URL}/verify-email/${token}`;
  const firstName = escapeHtml(name ? name.split(' ')[0] : '');

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verifie ton email - Nora',
      html: `
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
                      <h1 style="color: #f1f5f9; font-size: 24px; margin: 0 0 16px 0; text-align: center;">
                        Bienvenue${firstName ? ` ${firstName}` : ''} !
                      </h1>
                      <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
                        Merci de t'etre inscrit sur Nora. Pour commencer a apprendre, verifie ton adresse email.
                      </p>

                      <!-- Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <a href="${verifyLink}" style="display: inline-block; background-color: #38bdf8; color: #0f172a; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 12px; font-size: 16px;">
                              Verifier mon email
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
                        Ce lien expire dans 24 heures.<br>
                        Si tu n'as pas cree de compte, ignore cet email.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding-top: 30px; text-align: center;">
                      <p style="color: #475569; font-size: 12px; margin: 0;">
                        Nora - Apprends sans pression
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('[EmailService] Erreur envoi verification:', error);
      throw new Error('Erreur lors de l\'envoi de l\'email');
    }

    console.log(`[EmailService] Email verification envoye a ${email}`);
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
