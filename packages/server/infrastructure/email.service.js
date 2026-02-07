/**
 * Email Service - Send emails via Resend
 */

import { Resend } from 'resend';

/**
 * Create email service instance
 * @param {{ config: Object, logger?: Object }} deps
 */
export function createEmailService({ config, logger }) {
  const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

  return {
    /**
     * Send a password reset email
     * @param {{ to: string, resetUrl: string }} params
     * @returns {Promise<boolean>}
     */
    async sendPasswordReset({ to, resetUrl }) {
      if (!resend) {
        logger?.warning('Resend not configured, password reset email not sent');
        return false;
      }

      await resend.emails.send({
        from: config.emailFrom || 'noreply@pierrederache.fr',
        to,
        subject: 'Réinitialisation de mot de passe - Tilt',
        html: `<p>Clique sur ce lien pour réinitialiser ton mot de passe :</p>
               <a href="${resetUrl}">${resetUrl}</a>
               <p>Ce lien expire dans 1 heure.</p>`,
      });

      return true;
    },
  };
}
