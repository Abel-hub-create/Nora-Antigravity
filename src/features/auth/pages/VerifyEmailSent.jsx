import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import api from '../../../lib/api';

const VerifyEmailSent = () => {
  const location = useLocation();
  const email = location.state?.email || '';
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleResend = async () => {
    if (!email) return;

    setIsResending(true);
    setResendMessage('');

    try {
      await api.post('/auth/resend-verification', { email });
      setResendMessage('Email renvoye ! Verifie ta boite mail.');
    } catch (error) {
      setResendMessage('Erreur lors de l\'envoi. Reessaie plus tard.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        <div className="bg-surface rounded-3xl shadow-xl p-8 border border-white/5">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center justify-center w-20 h-20 bg-primary/20 rounded-2xl mb-6"
          >
            <Mail size={40} className="text-primary" />
          </motion.div>

          <h1 className="text-2xl font-bold text-text-main mb-3">
            Verifie ton email
          </h1>

          <p className="text-text-muted mb-2">
            Un email de verification a ete envoye a :
          </p>

          {email && (
            <p className="text-primary font-medium mb-6">{email}</p>
          )}

          <p className="text-text-muted text-sm mb-6">
            Clique sur le lien dans l'email pour activer ton compte.
            Le lien expire dans 24 heures.
          </p>

          {resendMessage && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-sm mb-4 ${resendMessage.includes('Erreur') ? 'text-error' : 'text-success'}`}
            >
              {resendMessage}
            </motion.p>
          )}

          {email && (
            <button
              onClick={handleResend}
              disabled={isResending}
              className="flex items-center justify-center gap-2 w-full py-3 text-text-muted hover:text-primary transition-colors disabled:opacity-50 mb-4"
            >
              <RefreshCw size={18} className={isResending ? 'animate-spin' : ''} />
              <span>{isResending ? 'Envoi en cours...' : 'Renvoyer l\'email'}</span>
            </button>
          )}

          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors"
          >
            <ArrowLeft size={20} />
            Retour a la connexion
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmailSent;
