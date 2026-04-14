import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const PremiumGate = ({ isOpen, onClose, featureName, featureDescription = '' }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const perks = [
    t('premiumGate.perk1'),
    t('premiumGate.perk2'),
    t('premiumGate.perk3'),
    t('premiumGate.perk4'),
    t('premiumGate.perk5'),
  ];
  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]" />
          <motion.div initial={{ opacity: 0, scale: 0.93, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-sm bg-[#0d1117] border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-amber-500/15 to-orange-500/10">
                <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                  <X size={16} />
                </button>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/30">
                  <Crown size={24} className="text-white" />
                </div>
                <h2 className="text-lg font-bold text-white">{featureName || t('premiumGate.defaultDescription')}</h2>
                <p className="text-sm text-amber-300/80 mt-0.5">
                  {featureDescription || t('premiumGate.defaultDescription')}
                </p>
              </div>

              {/* Perks */}
              <div className="px-6 py-4 space-y-2.5">
                {perks.map((p) => (
                  <div key={p} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                      <Check size={10} className="text-amber-400" />
                    </div>
                    <span className="text-sm text-white/80">{p}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="px-6 pb-6 space-y-2">
                <button onClick={() => { onClose(); navigate('/pricing'); }}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25">
                  {t('premiumGate.cta')}
                </button>
                <button onClick={onClose} className="w-full py-2 text-sm text-white/40 hover:text-white/60 transition-colors">
                  {t('premiumGate.dismiss')}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export function usePremiumGate() {
  const [state, setState] = React.useState({ open: false, featureName: '', featureDescription: '' });
  const show = (featureName, featureDescription = '') => setState({ open: true, featureName, featureDescription });
  const hide = () => setState(s => ({ ...s, open: false }));
  return { gateProps: { isOpen: state.open, onClose: hide, featureName: state.featureName, featureDescription: state.featureDescription }, showGate: show };
}

export default PremiumGate;
