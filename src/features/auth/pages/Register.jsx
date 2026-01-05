import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import AuthInput from '../components/AuthInput';
import api from '../../../lib/api';

const Register = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);

  const { register, error: authError, clearError } = useAuth();
  const navigate = useNavigate();

  // Check if error is about email already used
  const isEmailAlreadyUsed = authError?.toLowerCase().includes('email est déjà utilisé') ||
                              authError?.toLowerCase().includes('email est deja utilise') ||
                              authError?.toLowerCase().includes('email already');

  const handleResendVerification = async () => {
    if (!formData.email || isResending) return;

    setIsResending(true);
    setResendMessage('');

    try {
      await api.post('/auth/resend-verification', { email: formData.email });
      setResendMessage(t('auth.emailResent'));
      setResendSuccess(true);
    } catch (error) {
      setResendMessage(t('auth.resendError'));
      setResendSuccess(false);
    } finally {
      setIsResending(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (authError) {
      clearError();
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name || formData.name.length < 2) {
      newErrors.name = t('auth.nameRequired');
    }

    if (!formData.email) {
      newErrors.email = t('auth.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('auth.emailInvalid');
    }

    if (!formData.password) {
      newErrors.password = t('auth.passwordRequired');
    } else if (formData.password.length < 8) {
      newErrors.password = t('auth.passwordMin');
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.passwordMismatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      // Redirect to verification pending page
      navigate('/verify-email-sent', { state: { email: formData.email } });
    } catch {
      // Error handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <motion.img
            src="/nora-logo.png"
            alt="Nora"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 mx-auto mb-4 rounded-2xl"
          />
          <h1 className="text-3xl font-bold text-text-main mb-2">{t('auth.register')}</h1>
          <p className="text-text-muted">{t('auth.welcomeNew')}</p>
        </div>

        {/* Form Card */}
        <div className="bg-surface rounded-3xl shadow-xl p-8 border border-white/5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {authError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-error/10 border border-error/20 rounded-xl p-3 text-error text-sm"
              >
                <p>{authError}</p>
                {isEmailAlreadyUsed && (
                  <div className="mt-3 pt-3 border-t border-error/20">
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={isResending || !formData.email}
                      className="flex items-center justify-center gap-2 w-full py-2 text-primary hover:text-primary-dark transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={16} className={isResending ? 'animate-spin' : ''} />
                      <span>{isResending ? t('auth.sendingEmail') : t('auth.resendVerificationEmail')}</span>
                    </button>
                    {resendMessage && (
                      <p className={`text-center mt-2 ${resendSuccess ? 'text-success' : 'text-error'}`}>
                        {resendMessage}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            <AuthInput
              type="text"
              name="name"
              label={t('auth.name')}
              placeholder={t('auth.namePlaceholder')}
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              icon={User}
              autoComplete="name"
            />

            <AuthInput
              type="email"
              name="email"
              label={t('auth.email')}
              placeholder={t('auth.emailPlaceholder')}
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              icon={Mail}
              autoComplete="email"
            />

            <AuthInput
              type="password"
              name="password"
              label={t('auth.password')}
              placeholder={t('auth.passwordMin')}
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              icon={Lock}
              showPasswordToggle
              autoComplete="new-password"
            />

            <AuthInput
              type="password"
              name="confirmPassword"
              label={t('auth.confirmPassword')}
              placeholder={t('auth.passwordPlaceholder')}
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              icon={Lock}
              showPasswordToggle
              autoComplete="new-password"
            />

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary-dark text-background font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isSubmitting ? t('auth.creating') : t('auth.createAccount')}
            </motion.button>
          </form>

          <p className="text-center text-text-muted text-sm mt-6">
            {t('auth.hasAccount')}{' '}
            <Link
              to="/login"
              className="text-primary hover:text-primary-dark font-medium transition-colors"
            >
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
