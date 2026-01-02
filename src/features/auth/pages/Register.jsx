import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import AuthInput from '../components/AuthInput';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, error: authError, clearError } = useAuth();
  const navigate = useNavigate();

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
      newErrors.name = 'Le nom doit contenir au moins 2 caractères';
    }

    if (!formData.email) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
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
          <h1 className="text-3xl font-bold text-text-main mb-2">Creer un compte</h1>
          <p className="text-text-muted">Rejoins Nora et commence a apprendre !</p>
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
              type="text"
              name="name"
              label="Prénom"
              placeholder="Ton prénom"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              icon={User}
              autoComplete="name"
            />

            <AuthInput
              type="email"
              name="email"
              label="Email"
              placeholder="ton@email.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              icon={Mail}
              autoComplete="email"
            />

            <AuthInput
              type="password"
              name="password"
              label="Mot de passe"
              placeholder="Minimum 8 caractères"
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
              label="Confirmer le mot de passe"
              placeholder="••••••••"
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
              {isSubmitting ? 'Création du compte...' : 'Créer mon compte'}
            </motion.button>
          </form>

          <p className="text-center text-text-muted text-sm mt-6">
            Déjà un compte ?{' '}
            <Link
              to="/login"
              className="text-primary hover:text-primary-dark font-medium transition-colors"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
