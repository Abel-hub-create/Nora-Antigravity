import React, { useState } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import AuthInput from '../components/AuthInput';

const ResetPassword = () => {
  const { t, i18n } = useTranslation();
  const { token } = useParams();
  const [searchParams] = useSearchParams();

  // Apply language from URL query param (set when email was sent)
  React.useEffect(() => {
    const lang = searchParams.get('lang');
    if (lang && ['fr', 'en', 'es', 'zh'].includes(lang)) {
      i18n.changeLanguage(lang);
    }
  }, [searchParams, i18n]);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { resetPassword, error: authError } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

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
      await resetPassword(token, formData.password);
      setIsSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000);
    } catch {
      // Error handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="bg-surface rounded-3xl shadow-xl p-8 border border-white/5">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-error/20 rounded-2xl mb-4">
              <AlertCircle size={32} className="text-error" />
            </div>

            <h2 className="text-2xl font-bold text-text-main mb-2">{t('auth.invalidLink')}</h2>
            <p className="text-text-muted mb-6">
              {t('auth.linkExpiredText')}
            </p>

            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors"
            >
              {t('auth.sendResetLink')}
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
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
              className="inline-flex items-center justify-center w-16 h-16 bg-success/20 rounded-2xl mb-4"
            >
              <CheckCircle size={32} className="text-success" />
            </motion.div>

            <h2 className="text-2xl font-bold text-text-main mb-2">{t('auth.passwordReset')}</h2>
            <p className="text-text-muted mb-6">
              {t('auth.passwordResetSuccess')}
            </p>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors"
            >
              <ArrowLeft size={20} />
              {t('auth.login')}
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-main mb-2">{t('auth.newPassword')}</h1>
          <p className="text-text-muted">{t('auth.chooseNewPassword')}</p>
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
                {authError}
              </motion.div>
            )}

            <AuthInput
              type="password"
              name="password"
              label={t('auth.newPassword')}
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
              className="w-full bg-primary hover:bg-primary-dark text-background font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? t('auth.modifying') : t('auth.modifyPassword')}
            </motion.button>
          </form>

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-text-muted hover:text-text-main transition-colors mt-6"
          >
            <ArrowLeft size={18} />
            {t('auth.backToLogin')}
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
