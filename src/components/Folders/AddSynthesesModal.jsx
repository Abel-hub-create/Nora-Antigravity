import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, FileText, Loader2 } from 'lucide-react';

const AddSynthesesModal = ({
  isOpen,
  onClose,
  onSubmit,
  availableSyntheses = [],
  isLoading = false,
  isSubmitting = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds([]);
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredSyntheses = availableSyntheses.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return;
    await onSubmit(selectedIds);
    setSelectedIds([]);
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
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-surface rounded-t-3xl border-t border-white/10 max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-text-main">
                  Ajouter des synthèses
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 text-text-muted hover:text-text-main transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full pl-10 pr-4 py-2.5 bg-background rounded-xl border border-white/10 text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-primary" />
                </div>
              ) : filteredSyntheses.length === 0 ? (
                <div className="text-center py-12">
                  <FileText size={48} className="mx-auto text-text-muted mb-4 opacity-50" />
                  <p className="text-text-muted">
                    {searchQuery
                      ? 'Aucune synthèse trouvée'
                      : 'Toutes vos synthèses sont déjà dans ce dossier'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSyntheses.map((synthese) => {
                    const isSelected = selectedIds.includes(synthese.id);
                    return (
                      <button
                        key={synthese.id}
                        onClick={() => toggleSelection(synthese.id)}
                        className={`w-full p-4 rounded-xl border transition-all flex items-center gap-3 text-left ${
                          isSelected
                            ? 'bg-primary/10 border-primary'
                            : 'bg-background border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-primary border-primary'
                              : 'border-text-muted'
                          }`}
                        >
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-text-main truncate">
                            {synthese.title}
                          </h4>
                          <p className="text-xs text-text-muted mt-0.5">
                            {new Date(synthese.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 shrink-0">
              <button
                onClick={handleSubmit}
                disabled={selectedIds.length === 0 || isSubmitting}
                className="w-full py-3 bg-primary text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-primary-dark flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Ajout en cours...
                  </>
                ) : (
                  <>
                    Ajouter {selectedIds.length > 0 && `(${selectedIds.length})`}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AddSynthesesModal;
