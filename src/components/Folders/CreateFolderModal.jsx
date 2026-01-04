import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Folder, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PRESET_COLORS = [
  '#6366f1', // Indigo (default)
  '#f43f5e', // Rose
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#84cc16', // Lime
];

const CreateFolderModal = ({ isOpen, onClose, onSubmit, isLoading = false }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(t('folders.nameRequired'));
      return;
    }

    if (name.length > 100) {
      setError(t('folders.nameTooLong'));
      return;
    }

    try {
      await onSubmit({ name: name.trim(), color });
      setName('');
      setColor(PRESET_COLORS[0]);
      onClose();
    } catch (err) {
      setError(err.message || t('folders.createError'));
    }
  };

  const handleClose = () => {
    setName('');
    setColor(PRESET_COLORS[0]);
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-surface rounded-2xl border border-white/10 p-6 max-w-sm mx-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-text-main">{t('folders.new')}</h2>
              <button
                onClick={handleClose}
                className="p-2 text-text-muted hover:text-text-main transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Preview */}
              <div className="flex justify-center mb-6">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <Folder size={40} style={{ color }} />
                </div>
              </div>

              {/* Name Input */}
              <div className="mb-4">
                <label className="block text-sm text-text-muted mb-2">
                  {t('folders.name')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('folders.namePlaceholder')}
                  className="w-full px-4 py-3 bg-background rounded-xl border border-white/10 text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              {/* Color Picker */}
              <div className="mb-6">
                <label className="block text-sm text-text-muted mb-2">
                  {t('folders.color')}
                </label>
                <div className="flex flex-wrap gap-3">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: c }}
                    >
                      {color === c && (
                        <Check size={18} className="text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-red-400 text-sm mb-4">{error}</p>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !name.trim()}
                className="w-full py-3 bg-primary text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-primary-dark"
              >
                {isLoading ? t('common.creating') : t('folders.createFolder')}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CreateFolderModal;
