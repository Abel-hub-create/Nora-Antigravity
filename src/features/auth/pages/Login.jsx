import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import AuthInput from '../components/AuthInput';
import api from '../../../lib/api';

const Login = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);

  const { login, error: authError, clearError } = useAuth();
  const navigate = useNavigate();

  // Check if error is about email not verified
  const isEmailNotVerified = authError?.toLowerCase().includes('verifie ton email') || authError?.toLowerCase().includes('verify your email');

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
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (authError) {
      clearError();
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = t('auth.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('auth.emailInvalid');
    }

    if (!formData.password) {
      newErrors.password = t('auth.passwordRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      await login(formData);
      navigate('/');
    } catch {
      // Error handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
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
          <h1 className="text-3xl font-bold text-text-main mb-2">Nora</h1>
          <p className="text-text-muted">{t('auth.welcomeBack')}</p>
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
                {isEmailNotVerified && (
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
              placeholder={t('auth.passwordPlaceholder')}
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              icon={Lock}
              showPasswordToggle
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary bg-surface border-white/20 rounded focus:ring-primary focus:ring-2"
                />
                <span className="ml-2 text-sm text-text-muted">{t('auth.rememberMe')}</span>
              </label>

              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:text-primary-dark transition-colors"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary-dark text-background font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isSubmitting ? t('auth.connecting') : t('auth.login')}
            </motion.button>
          </form>

          <p className="text-center text-text-muted text-sm mt-6">
            {t('auth.noAccount')}{' '}
            <Link
              to="/register"
              className="text-primary hover:text-primary-dark font-medium transition-colors"
            >
              {t('auth.register')}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
