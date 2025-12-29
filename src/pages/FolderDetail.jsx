import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Folder,
  Plus,
  MoreVertical,
  Trash2,
  Edit2,
  FileText,
  Loader2,
  X
} from 'lucide-react';
import * as folderService from '../services/folderService';
import AddSynthesesModal from '../components/Folders/AddSynthesesModal';

const FolderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [folder, setFolder] = useState(null);
  const [syntheses, setSyntheses] = useState([]);
  const [availableSyntheses, setAvailableSyntheses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Action states
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editName, setEditName] = useState('');

  // Fetch folder data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [folderData, synthesesData] = await Promise.all([
          folderService.getFolder(id),
          folderService.getSynthesesInFolder(id)
        ]);

        setFolder(folderData);
        setSyntheses(synthesesData);
        setEditName(folderData.name);
      } catch (err) {
        console.error('Error fetching folder:', err);
        setError('Impossible de charger le dossier');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Load available syntheses when opening add modal
  const handleOpenAddModal = async () => {
    setShowAddModal(true);
    setIsLoadingAvailable(true);
    try {
      const available = await folderService.getAvailableSyntheses(id);
      setAvailableSyntheses(available);
    } catch (err) {
      console.error('Error loading available syntheses:', err);
    } finally {
      setIsLoadingAvailable(false);
    }
  };

  // Add syntheses to folder
  const handleAddSyntheses = async (syntheseIds) => {
    setIsSubmitting(true);
    try {
      await folderService.addSynthesesToFolder(id, syntheseIds);
      // Refresh syntheses list
      const updated = await folderService.getSynthesesInFolder(id);
      setSyntheses(updated);
      // Update folder count
      setFolder((prev) => ({
        ...prev,
        syntheses_count: updated.length
      }));
    } catch (err) {
      console.error('Error adding syntheses:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove synthese from folder
  const handleRemoveSynthese = async (syntheseId) => {
    try {
      await folderService.removeSyntheseFromFolder(id, syntheseId);
      setSyntheses((prev) => prev.filter((s) => s.id !== syntheseId));
      setFolder((prev) => ({
        ...prev,
        syntheses_count: (prev.syntheses_count || 1) - 1
      }));
    } catch (err) {
      console.error('Error removing synthese:', err);
    }
  };

  // Update folder name
  const handleUpdateName = async () => {
    if (!editName.trim() || editName === folder.name) {
      setShowEditModal(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await folderService.updateFolder(id, { name: editName.trim() });
      setFolder((prev) => ({ ...prev, name: editName.trim() }));
      setShowEditModal(false);
    } catch (err) {
      console.error('Error updating folder:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete folder
  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await folderService.deleteFolder(id);
      navigate('/profile');
    } catch (err) {
      console.error('Error deleting folder:', err);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !folder) {
    return (
      <div className="min-h-full bg-background p-6">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-text-muted mb-6"
        >
          <ArrowLeft size={20} />
          Retour
        </button>
        <div className="text-center py-12">
          <Folder size={48} className="mx-auto text-text-muted mb-4 opacity-50" />
          <p className="text-text-muted">{error || 'Dossier introuvable'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background p-6 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/profile')}
          className="p-2 -ml-2 text-text-muted hover:text-text-main transition-colors"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex-1 mx-4 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${folder.color}20` }}
          >
            <Folder size={20} style={{ color: folder.color }} />
          </div>
          <h1 className="text-xl font-bold text-text-main truncate">
            {folder.name}
          </h1>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-text-muted hover:text-text-main transition-colors"
          >
            <MoreVertical size={20} />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-0 top-full mt-2 bg-surface rounded-xl border border-white/10 overflow-hidden z-50 min-w-[160px]"
              >
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowEditModal(true);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-text-main hover:bg-white/5 transition-colors"
                >
                  <Edit2 size={16} />
                  Renommer
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-red-400 hover:bg-white/5 transition-colors"
                >
                  <Trash2 size={16} />
                  Supprimer
                </button>
              </motion.div>
            </>
          )}
        </div>
      </header>

      {/* Add Button */}
      <button
        onClick={handleOpenAddModal}
        className="w-full mb-6 py-3 border-2 border-dashed border-white/10 rounded-xl text-text-muted hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Ajouter des synthèses
      </button>

      {/* Syntheses List */}
      {syntheses.length === 0 ? (
        <div className="text-center py-12">
          <FileText size={48} className="mx-auto text-text-muted mb-4 opacity-50" />
          <p className="text-text-muted">
            Ce dossier est vide
          </p>
          <p className="text-sm text-text-muted mt-1">
            Ajoutez des synthèses pour les organiser
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {syntheses.map((synthese, index) => (
            <motion.div
              key={synthese.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-surface rounded-2xl border border-white/5 p-4 flex items-center gap-3"
            >
              <Link
                to={`/study/${synthese.id}`}
                className="flex-1 min-w-0"
              >
                <h3 className="font-semibold text-text-main truncate">
                  {synthese.title}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {new Date(synthese.created_at).toLocaleDateString('fr-FR')}
                </p>
              </Link>
              <button
                onClick={() => handleRemoveSynthese(synthese.id)}
                className="p-2 text-text-muted hover:text-red-400 transition-colors shrink-0"
                title="Retirer du dossier"
              >
                <X size={18} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Syntheses Modal */}
      <AddSynthesesModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddSyntheses}
        availableSyntheses={availableSyntheses}
        isLoading={isLoadingAvailable}
        isSubmitting={isSubmitting}
      />

      {/* Edit Name Modal */}
      {showEditModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-50"
            onClick={() => setShowEditModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-surface rounded-2xl border border-white/10 p-6 max-w-sm mx-auto"
          >
            <h2 className="text-lg font-bold text-text-main mb-4">
              Renommer le dossier
            </h2>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-4 py-3 bg-background rounded-xl border border-white/10 text-text-main focus:outline-none focus:border-primary transition-colors mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-3 bg-white/5 text-text-main rounded-xl"
              >
                Annuler
              </button>
              <button
                onClick={handleUpdateName}
                disabled={isSubmitting || !editName.trim()}
                className="flex-1 py-3 bg-primary text-white rounded-xl disabled:opacity-50"
              >
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </motion.div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-50"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-surface rounded-2xl border border-white/10 p-6 max-w-sm mx-auto"
          >
            <h2 className="text-lg font-bold text-text-main mb-2">
              Supprimer le dossier ?
            </h2>
            <p className="text-text-muted text-sm mb-6">
              Les synthèses ne seront pas supprimées, elles seront simplement retirées du dossier.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-white/5 text-text-main rounded-xl"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl disabled:opacity-50"
              >
                {isSubmitting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default FolderDetail;
