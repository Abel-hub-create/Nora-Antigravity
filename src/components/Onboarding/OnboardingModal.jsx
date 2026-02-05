import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Camera, ArrowRight, Upload, Loader2, Moon, Sun, Globe, CameraIcon, BookOpen } from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';

// Liste des langues disponibles
const languages = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'zh', label: '中文', flag: '🇨🇳' }
];

// Liste des matières
const SUBJECTS = [
    { id: 'mathematics', icon: '📐' },
    { id: 'french', icon: '📚' },
    { id: 'physics', icon: '⚡' },
    { id: 'chemistry', icon: '🧪' },
    { id: 'biology', icon: '🧬' },
    { id: 'history', icon: '🏛️' },
    { id: 'geography', icon: '🌍' },
    { id: 'english', icon: '🇬🇧' },
    { id: 'dutch', icon: '🇳🇱' }
];

const TOTAL_STEPS = 5;

const OnboardingModal = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { user, completeOnboarding, updatePreferences } = useAuth();
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    // États pour les préférences
    const [selectedTheme, setSelectedTheme] = useState(user?.theme || 'dark');
    const [selectedLang, setSelectedLang] = useState(user?.language || i18n.language || 'fr');

    // Don't show if onboarding is already completed
    if (user?.onboarding_completed) {
        return null;
    }

    // Step 1: Language & Theme
    const handleThemeChange = (theme) => {
        setSelectedTheme(theme);
        document.documentElement.setAttribute('data-theme', theme);
    };

    const handleLangChange = (langCode) => {
        setSelectedLang(langCode);
        i18n.changeLanguage(langCode);
    };

    const handleStep1Continue = async () => {
        try {
            await updatePreferences({ theme: selectedTheme, language: selectedLang });
        } catch (err) {
            console.error('Error saving preferences:', err);
        }
        setStep(2);
    };

    // Step 2: Name
    const handleNameSubmit = (e) => {
        e.preventDefault();
        if (name.trim().length < 2) {
            setError(t('auth.nameRequired'));
            return;
        }
        setError('');
        setStep(3);
    };

    // Step 3: Photo
    const handlePhotoSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError(t('settings.profileModal.selectImage'));
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setError(t('settings.profileModal.imageTooLarge'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setAvatar(event.target.result);
            setError('');
        };
        reader.readAsDataURL(file);
    };

    const handleStep3Continue = () => {
        setStep(4);
    };

    // Step 4: Subject
    const handleStep4Continue = () => {
        setStep(5);
    };

    // Step 5: Complete
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
                className="bg-surface rounded-2xl p-6 max-w-md w-full border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto"
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                {/* Step indicators */}
                <div className="flex justify-center gap-2 mb-6">
                    {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
                        <div
                            key={s}
                            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                                s === step ? 'bg-primary' : s < step ? 'bg-primary/50' : 'bg-white/20'
                            }`}
                        />
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {/* Step 1: Language & Theme (was step 3) */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            variants={stepVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={{ duration: 0.2 }}
                        >
                            <h2 className="text-2xl font-bold text-text-main text-center mb-2">
                                {t('onboarding.step3.title')}
                            </h2>
                            <p className="text-text-muted text-center mb-6">
                                {t('onboarding.step3.subtitle')}
                            </p>

                            {/* Langue */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <Globe size={18} className="text-text-muted" />
                                    <span className="text-text-main text-sm font-medium">{t('settings.language')}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {languages.map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => handleLangChange(lang.code)}
                                            className={`p-3 rounded-xl flex items-center justify-center gap-2 transition-colors ${
                                                selectedLang === lang.code
                                                    ? 'bg-primary text-white'
                                                    : 'bg-white/5 text-text-muted hover:bg-white/10'
                                            }`}
                                        >
                                            <span className="text-lg">{lang.flag}</span>
                                            <span className="font-medium text-sm">{lang.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Thème */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-3">
                                    {selectedTheme === 'dark' ? <Moon size={18} className="text-text-muted" /> : <Sun size={18} className="text-text-muted" />}
                                    <span className="text-text-main text-sm font-medium">{t('settings.theme')}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleThemeChange('dark')}
                                        className={`flex-1 p-3 rounded-xl flex items-center justify-center gap-2 transition-colors ${
                                            selectedTheme === 'dark'
                                                ? 'bg-primary text-white'
                                                : 'bg-white/5 text-text-muted hover:bg-white/10'
                                        }`}
                                    >
                                        <Moon size={18} />
                                        <span className="font-medium">{t('settings.darkTheme')}</span>
                                    </button>
                                    <button
                                        onClick={() => handleThemeChange('light')}
                                        className={`flex-1 p-3 rounded-xl flex items-center justify-center gap-2 transition-colors ${
                                            selectedTheme === 'light'
                                                ? 'bg-primary text-white'
                                                : 'bg-white/5 text-text-muted hover:bg-white/10'
                                        }`}
                                    >
                                        <Sun size={18} />
                                        <span className="font-medium">{t('settings.lightTheme')}</span>
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleStep1Continue}
                                className="w-full p-4 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                            >
                                {t('common.continue')}
                                <ArrowRight size={18} />
                            </button>
                        </motion.div>
                    )}

                    {/* Step 2: Name (was step 1) */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
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

                    {/* Step 3: Profile Photo (was step 2) */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
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
                                    onClick={handleStep3Continue}
                                    className="flex-1 p-4 rounded-xl bg-white/5 text-text-muted hover:bg-white/10 transition-colors"
                                >
                                    {t('onboarding.step2.skipButton')}
                                </button>
                                <button
                                    onClick={handleStep3Continue}
                                    className="flex-1 p-4 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                                >
                                    {t('onboarding.step2.continueButton')}
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 4: Choose Subject Info */}
                    {step === 4 && (
                        <motion.div
                            key="step4"
                            variants={stepVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={{ duration: 0.2 }}
                        >
                            <div className="flex justify-center mb-6">
                                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                                    <BookOpen size={40} className="text-primary" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-text-main text-center mb-4">
                                {t('onboarding.step4.title')}
                            </h2>
                            <p className="text-text-muted text-center mb-6">
                                {t('onboarding.step4.message')}
                            </p>

                            {/* Aperçu des matières */}
                            <div className="grid grid-cols-3 gap-2 mb-6">
                                {SUBJECTS.slice(0, 6).map((subject) => (
                                    <div
                                        key={subject.id}
                                        className="bg-white/5 rounded-xl p-3 flex flex-col items-center gap-1"
                                    >
                                        <span className="text-2xl">{subject.icon}</span>
                                        <span className="text-xs text-text-muted text-center truncate w-full">
                                            {t(`subjects.${subject.id}`)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleStep4Continue}
                                className="w-full p-4 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                            >
                                {t('onboarding.step4.button')}
                                <ArrowRight size={18} />
                            </button>
                        </motion.div>
                    )}

                    {/* Step 5: Import Method Info */}
                    {step === 5 && (
                        <motion.div
                            key="step5"
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
                                {t('onboarding.step5.title')}
                            </h2>
                            <p className="text-text-muted text-center mb-6">
                                {t('onboarding.step5.message')}
                            </p>

                            {/* Icône du mode d'import */}
                            <div className="flex justify-center gap-6 mb-8">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                                        <CameraIcon size={28} className="text-primary" />
                                    </div>
                                    <span className="text-xs text-text-muted">{t('import.photo')}</span>
                                </div>
                            </div>

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
                                        {t('onboarding.step5.button')}
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
