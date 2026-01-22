import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const QuickActionCard = ({ title, subtitle, icon: Icon, to, color = "bg-surface" }) => {
    return (
        <Link to={to} className="block w-full">
            <motion.div
                whileTap={{ scale: 0.98 }}
                className={`w-full p-5 rounded-2xl ${color} border border-white/5 shadow-lg relative overflow-hidden group`}
            >
                <div className="relative z-10 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                            <Icon size={24} className="text-text-main" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-text-main">{title}</h3>
                            <p className="text-sm text-text-muted">{subtitle}</p>
                        </div>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight size={16} className="text-text-main" />
                    </div>
                </div>

                {/* Decorative Background Blob */}
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />
            </motion.div>
        </Link>
    );
};

export default QuickActionCard;
