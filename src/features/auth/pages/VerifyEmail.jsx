import React, { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '../../../lib/api';

const VerifyEmail = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading, success, already_verified, expired, error
  const [message, setMessage] = useState('');
  const hasVerified = useRef(false);

  useEffect(() => {
    const verifyEmail = async () => {
      // Prevent double call in StrictMode
      if (hasVerified.current) return;
      hasVerified.current = true;

      try {
        const data = await api.get(`/auth/verify-email/${token}`);
        if (data.alreadyVerified) {
          setStatus('already_verified');
          setMessage('Ton compte est deja actif.');
        } else {
          setStatus('success');
          setMessage('Ton compte a bien ete active !');
        }
      } catch (error) {
        const errorMessage = error.response?.data?.error || error.message || '';
        if (errorMessage.toLowerCase().includes('expire')) {
          setStatus('expired');
          setMessage('Le lien de verification a expire. Demande un nouveau lien depuis la page de connexion.');
        } else {
          setStatus('error');
          setMessage(errorMessage || 'Lien invalide');
        }
      }
    };

    if (token) {
      verifyEmail();
    } else {
      setStatus('error');
      setMessage('Token manquant');
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        <div className="bg-surface rounded-3xl shadow-xl p-8 border border-white/5">
          {status === 'loading' && (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="inline-flex items-center justify-center w-20 h-20 bg-primary/20 rounded-2xl mb-6"
              >
                <Loader2 size={40} className="text-primary" />
              </motion.div>
              <h1 className="text-2xl font-bold text-text-main mb-3">
                Verification en cours...
              </h1>
            </>
          )}

          {status === 'success' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="inline-flex items-center justify-center w-20 h-20 bg-success/20 rounded-2xl mb-6"
              >
                <CheckCircle size={40} className="text-success" />
              </motion.div>
              <h1 className="text-2xl font-bold text-text-main mb-3">
                Compte active !
              </h1>
              <p className="text-text-muted mb-6">
                {message}
              </p>
              <Link
                to="/login"
                className="inline-block w-full bg-primary hover:bg-primary-dark text-background font-semibold py-3 rounded-xl transition-colors"
              >
                Se connecter
              </Link>
            </>
          )}

          {status === 'already_verified' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="inline-flex items-center justify-center w-20 h-20 bg-primary/20 rounded-2xl mb-6"
              >
                <CheckCircle size={40} className="text-primary" />
              </motion.div>
              <h1 className="text-2xl font-bold text-text-main mb-3">
                Compte deja actif
              </h1>
              <p className="text-text-muted mb-6">
                {message}
              </p>
              <Link
                to="/login"
                className="inline-block w-full bg-primary hover:bg-primary-dark text-background font-semibold py-3 rounded-xl transition-colors"
              >
                Se connecter
              </Link>
            </>
          )}

          {status === 'expired' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="inline-flex items-center justify-center w-20 h-20 bg-amber-400/20 rounded-2xl mb-6"
              >
                <XCircle size={40} className="text-amber-400" />
              </motion.div>
              <h1 className="text-2xl font-bold text-text-main mb-3">
                Lien expire
              </h1>
              <p className="text-text-muted mb-6">
                {message}
              </p>
              <Link
                to="/login"
                className="inline-block w-full bg-primary hover:bg-primary-dark text-background font-semibold py-3 rounded-xl transition-colors"
              >
                Retour a la connexion
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="inline-flex items-center justify-center w-20 h-20 bg-error/20 rounded-2xl mb-6"
              >
                <XCircle size={40} className="text-error" />
              </motion.div>
              <h1 className="text-2xl font-bold text-text-main mb-3">
                Erreur de verification
              </h1>
              <p className="text-text-muted mb-6">
                {message}
              </p>
              <div className="space-y-3">
                <Link
                  to="/login"
                  className="inline-block w-full bg-surface border border-white/10 text-text-main font-medium py-3 rounded-xl hover:bg-surface/80 transition-colors"
                >
                  Retour a la connexion
                </Link>
                <Link
                  to="/register"
                  className="inline-block w-full text-primary hover:text-primary-dark transition-colors py-2"
                >
                  Creer un nouveau compte
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
