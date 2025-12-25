import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Target, Gift, AlertTriangle, X } from 'lucide-react';
import { useUser } from '../../context/UserContext';

const NotificationStack = () => {
    const { notifications, removeNotification } = useUser();

    const getIcon = (type) => {
        switch (type) {
            case 'goal':
                return <Target className="w-5 h-5 text-primary" />;
            case 'reward':
                return <Gift className="w-5 h-5 text-yellow-400" />;
            case 'warning':
                return <AlertTriangle className="w-5 h-5 text-orange-400" />;
            case 'success':
            default:
                return <CheckCircle className="w-5 h-5 text-green-400" />;
        }
    };

    const getBorderColor = (type) => {
        switch (type) {
            case 'goal':
                return 'border-primary/30';
            case 'reward':
                return 'border-yellow-400/30';
            case 'warning':
                return 'border-orange-400/30';
            case 'success':
            default:
                return 'border-green-400/30';
        }
    };

    const getGlowColor = (type) => {
        switch (type) {
            case 'goal':
                return 'shadow-primary/20';
            case 'reward':
                return 'shadow-yellow-400/20';
            case 'warning':
                return 'shadow-orange-400/20';
            case 'success':
            default:
                return 'shadow-green-400/20';
        }
    };

    return (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4">
            <AnimatePresence mode="popLayout">
                {notifications.map((notification) => (
                    <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: -50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className={`
                            pointer-events-auto
                            bg-surface/95 backdrop-blur-md
                            border ${getBorderColor(notification.type)}
                            rounded-xl px-4 py-3
                            shadow-lg ${getGlowColor(notification.type)}
                            flex items-center gap-3
                        `}
                    >
                        {getIcon(notification.type)}
                        <span className="flex-1 text-sm text-text-main font-medium">
                            {notification.message}
                        </span>
                        <button
                            onClick={() => removeNotification(notification.id)}
                            className="p-1 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-4 h-4 text-text-muted" />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default NotificationStack;
