import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sprout, BookOpen, Target, Settings, Play, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Requirement levels with their default precision settings
 */
const REQUIREMENT_LEVELS = {
    beginner: {
        icon: Sprout,
        color: '#22c55e', // Green
        settings: { definitions: 70, concepts: 70, data: 70 }
    },
    intermediate: {
        icon: BookOpen,
        color: '#3b82f6', // Blue
        settings: { definitions: 85, concepts: 85, data: 95 }
    },
    expert: {
        icon: Target,
        color: '#ef4444', // Red
        settings: { definitions: 95, concepts: 95, data: 100 }
    },
    custom: {
        icon: Settings,
        color: '#8b5cf6', // Violet
        settings: null // User-defined
    }
};

const RequirementLevelModal = ({ isOpen, onClose, onStart }) => {
    const { t } = useTranslation();
    const [selectedLevel, setSelectedLevel] = useState('intermediate');
    const [customSettings, setCustomSettings] = useState({
        definitions: 85,
        concepts: 85,
        data: 95
    });

    const handleStart = () => {
        const level = REQUIREMENT_LEVELS[selectedLevel];
        const settings = selectedLevel === 'custom'
            ? customSettings
            : level.settings;

        onStart({
            level: selectedLevel,
            settings
        });
    };

    const handleSliderChange = (key, value) => {
        setCustomSettings(prev => ({
            ...prev,
            [key]: parseInt(value)
        }));
    };

    const LevelIcon = REQUIREMENT_LEVELS[selectedLevel].icon;

    return (
        <AnimatePresence>
            {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
                    >
                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-surface rounded-2xl border border-white/10 p-5 w-full max-w-md max-h-[90vh] overflow-y-auto"
                        >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-text-main">
                                {t('revision.requirementLevel.title')}
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 text-text-muted hover:text-text-main transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Subtitle */}
                        <p className="text-sm text-text-muted mb-5">
                            {t('revision.requirementLevel.subtitle')}
                        </p>

                        {/* Level Options */}
                        <div className="space-y-3 mb-5">
                            {Object.entries(REQUIREMENT_LEVELS).map(([key, level]) => {
                                const Icon = level.icon;
                                const isSelected = selectedLevel === key;

                                return (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedLevel(key)}
                                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                                            isSelected
                                                ? 'border-primary bg-primary/10'
                                                : 'border-white/10 bg-white/5 hover:border-white/20'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: `${level.color}20` }}
                                            >
                                                <Icon size={20} style={{ color: level.color }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-text-main">
                                                        {t(`revision.requirementLevel.levels.${key}.name`)}
                                                    </span>
                                                    {isSelected && (
                                                        <Check size={16} className="text-primary" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                                                    {t(`revision.requirementLevel.levels.${key}.description`)}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Custom Sliders (only shown when custom is selected) */}
                        <AnimatePresence>
                            {selectedLevel === 'custom' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="bg-background rounded-xl p-4 mb-5 space-y-4">
                                        <h3 className="text-sm font-semibold text-text-main mb-3">
                                            {t('revision.requirementLevel.customSettings')}
                                        </h3>

                                        {/* Definitions Slider */}
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-sm text-text-muted">
                                                    {t('revision.requirementLevel.criteria.definitions')}
                                                </label>
                                                <span className="text-sm font-medium text-primary">
                                                    {customSettings.definitions}%
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min="50"
                                                max="100"
                                                step="5"
                                                value={customSettings.definitions}
                                                onChange={(e) => handleSliderChange('definitions', e.target.value)}
                                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-primary"
                                            />
                                        </div>

                                        {/* Concepts Slider */}
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-sm text-text-muted">
                                                    {t('revision.requirementLevel.criteria.concepts')}
                                                </label>
                                                <span className="text-sm font-medium text-primary">
                                                    {customSettings.concepts}%
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min="50"
                                                max="100"
                                                step="5"
                                                value={customSettings.concepts}
                                                onChange={(e) => handleSliderChange('concepts', e.target.value)}
                                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-primary"
                                            />
                                        </div>

                                        {/* Data Slider */}
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-sm text-text-muted">
                                                    {t('revision.requirementLevel.criteria.data')}
                                                </label>
                                                <span className="text-sm font-medium text-primary">
                                                    {customSettings.data}%
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min="50"
                                                max="100"
                                                step="5"
                                                value={customSettings.data}
                                                onChange={(e) => handleSliderChange('data', e.target.value)}
                                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-primary"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Start Button */}
                        <button
                            onClick={handleStart}
                            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-emerald-700 transition-all active:scale-[0.98]"
                        >
                            <Play size={20} />
                            {t('revision.requirementLevel.startButton')}
                        </button>
                        </motion.div>
                    </motion.div>
            )}
        </AnimatePresence>
    );
};

export default RequirementLevelModal;
