import React from 'react';
import { Folder, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const FolderCard = ({ folder, index = 0 }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => navigate(`/folders/${folder.id}`)}
      className="bg-surface rounded-2xl border border-white/5 p-4 flex items-center gap-3 cursor-pointer active:bg-white/5 transition-colors"
    >
      {/* Folder Icon with color */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${folder.color}20` }}
      >
        <Folder size={24} style={{ color: folder.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-text-main truncate">
          {folder.name}
        </h3>
        <p className="text-xs text-text-muted mt-0.5">
          {folder.syntheses_count || 0} synthèse{(folder.syntheses_count || 0) !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight className="text-text-muted shrink-0" size={20} />
    </motion.div>
  );
};

export default FolderCard;
