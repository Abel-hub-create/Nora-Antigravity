import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Camera, ArrowRight, Upload, Loader2 } from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';

const OnboardingModal = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, completeOnboarding } = useAuth();
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    // Don't show if onboarding is already completed
    if (user?.onboarding_completed) {
        return null;
    }

    const handleNameSubmit = (e) => {
        e.preventDefault();
        if (name.trim().length < 2) {
            setError(t('auth.nameRequired'));
            return;
        }
        setError('');
        setStep(2);
    };

    const handlePhotoSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError(t('settings.profileModal.selectImage'));
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setError(t('settings.profileModal.imageTooLarge'));
            return;
        }

        // Convert to base64
        const reader = new FileReader();
        reader.onload = (event) => {
            setAvatar(event.target.result);
            setError('');
        };
        reader.readAsDataURL(file);
    };

    const handleStep2Continue = () => {
        setStep(3);
    };

    const handleComplete = async () => {
        setIsLoading(true);
        try {
            await completeOnboarding({ name: name.trim(), avatar });
            navigate('/import');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
    };

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.9, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.9, y: 20 }
    };

    const stepVariants = {
        hidden: { opacity: 0, x: 50 },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -50 }
    };

    return (
        <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
        >
            <motion.div
                className="bg-surface rounded-2xl p-6 max-w-md w-full border border-white/10 shadow-2xl"
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                {/* Step indicators */}
                <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3].map((s) => (
                        <div
                            key={s}
                            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                                s === step ? 'bg-primary' : s < step ? 'bg-primary/50' : 'bg-white/20'
                            }`}
                        />
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {/* Step 1: Name */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            variants={stepVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={{ duration: 0.2 }}
                        >
                            <h2 className="text-2xl font-bold text-text-main text-center mb-8">
                                {t('onboarding.step1.title')}
                            </h2>
                            <form onSubmit={handleNameSubmit}>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('onboarding.step1.placeholder')}
                                    className="w-full px-4 py-4 rounded-xl bg-black/30 border border-white/10 text-text-main placeholder-text-muted focus:outline-none focus:border-primary transition-colors text-lg text-center"
                                    maxLength={50}
                                    autoFocus
                                />
                                {error && (
                                    <p className="text-error text-sm text-center mt-2">{error}</p>
                                )}
                                <button
                                    type="submit"
                                    className="w-full mt-6 p-4 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                                >
                                    {t('onboarding.step1.button')}
                                    <ArrowRight size={18} />
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {/* Step 2: Profile Photo */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            variants={stepVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={{ duration: 0.2 }}
                        >
                            <h2 className="text-2xl font-bold text-text-main text-center mb-2">
                                {t('onboarding.step2.title')}
                            </h2>
                            <p className="text-text-muted text-center mb-8">
                                {t('onboarding.step2.subtitle')}
                            </p>

                            {/* Avatar preview */}
                            <div className="flex justify-center mb-6">
                                <div className="relative">
                                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-secondary p-[3px]">
                                        <div className="w-full h-full rounded-full bg-surface flex items-center justify-center overflow-hidden">
                                            {avatar ? (
                                                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-4xl font-bold text-text-main">
                                                    {name?.charAt(0)?.toUpperCase() || 'U'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Upload button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-text-main hover:border-primary/50 transition-colors flex items-center justify-center gap-3"
                            >
                                {avatar ? <Camera size={20} /> : <Upload size={20} />}
                                {avatar ? t('onboarding.step2.changeButton') : t('onboarding.step2.uploadButton')}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoSelect}
                                className="hidden"
                            />

                            {error && (
                                <p className="text-error text-sm text-center mt-2">{error}</p>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleStep2Continue}
                                    className="flex-1 p-4 rounded-xl bg-white/5 text-text-muted hover:bg-white/10 transition-colors"
                                >
                                    {t('onboarding.step2.skipButton')}
                                </button>
                                <button
                                    onClick={handleStep2Continue}
                                    className="flex-1 p-4 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                                >
                                    {t('onboarding.step2.continueButton')}
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Complete */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            variants={stepVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={{ duration: 0.2 }}
                        >
                            <div className="flex justify-center mb-6">
                                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                                    <span className="text-4xl">🎉</span>
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-text-main text-center mb-4">
                                {t('onboarding.step3.title')}
                            </h2>
                            <p className="text-text-muted text-center mb-8">
                                {t('onboarding.step3.message')}
                            </p>

                            {error && (
                                <p className="text-error text-sm text-center mb-4">{error}</p>
                            )}

                            <button
                                onClick={handleComplete}
                                disabled={isLoading}
                                className="w-full p-4 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <>
                                        {t('onboarding.step3.button')}
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
};

export default OnboardingModal;
