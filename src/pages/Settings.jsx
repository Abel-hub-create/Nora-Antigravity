import React, { useState } from 'react';
import { ArrowLeft, User, CreditCard, Bell, Moon, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useAuth } from '../features/auth/hooks/useAuth';

const Settings = () => {
    const { user, logout } = useAuth();
    const { dailyGoals, setDailyGoals } = useUser();
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const sections = [
        {
            title: "Compte",
            items: [
                { icon: User, label: "Modifier le Profil", value: user?.name || "Utilisateur" },
                { icon: CreditCard, label: "Abonnement", value: "Plan Gratuit" },
            ]
        },
        {
            title: "Préférences",
            items: [
                { icon: Bell, label: "Notifications", toggle: true },
                { icon: Moon, label: "Mode Sombre", toggle: true, active: true },
            ]
        }
    ];

    const handleGoalChange = (type, value) => {
        setDailyGoals(prev => prev.map(g =>
            g.type === type ? { ...g, targetMinutes: parseInt(value) } : g
        ));
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <div className="min-h-full bg-background p-6 pb-24">
            <header className="flex items-center gap-4 mb-8">
                <Link to="/profile" className="p-2 -ml-2 text-text-muted hover:text-text-main transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-2xl font-bold text-text-main">Paramètres</h1>
            </header>

            {/* Daily Goals Section */}
            <div className="mb-8">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Objectifs Quotidiens</h3>
                <div className="bg-surface rounded-2xl p-6 border border-white/5 space-y-6">
                    {dailyGoals.map((goal) => (
                        <div key={goal.type}>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-text-main capitalize">{goal.type === 'summary' ? 'Synthèse' : goal.type}</span>
                                <span className="text-primary font-bold">{goal.targetMinutes} min</span>
                            </div>
                            <input
                                type="range"
                                min="5"
                                max="60"
                                step="5"
                                value={goal.targetMinutes}
                                onChange={(e) => handleGoalChange(goal.type, e.target.value)}
                                className="w-full h-2 bg-black rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    ))}
                    <p className="text-xs text-text-muted italic">
                        Modifier vos objectifs réinitialisera votre progression quotidienne.
                    </p>
                </div>
            </div>

            <div className="space-y-8">
                {sections.map((section) => (
                    <div key={section.title}>
                        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">{section.title}</h3>
                        <div className="bg-surface rounded-2xl overflow-hidden border border-white/5">
                            {section.items.map((item, index) => (
                                <div
                                    key={item.label}
                                    className={`p-4 flex items-center justify-between ${index !== section.items.length - 1 ? 'border-b border-white/5' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon size={20} className="text-text-muted" />
                                        <span className="text-text-main">{item.label}</span>
                                    </div>
                                    {item.value && (
                                        <span className="text-sm text-text-muted">{item.value}</span>
                                    )}
                                    {item.toggle && (
                                        <div className={`w-10 h-6 rounded-full relative transition-colors ${item.active ? 'bg-primary' : 'bg-white/10'}`}>
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${item.active ? 'left-5' : 'left-1'}`} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full p-4 rounded-2xl bg-error/10 text-error font-medium flex items-center justify-center gap-2 hover:bg-error/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <LogOut size={20} />
                    {isLoggingOut ? 'Déconnexion...' : 'Se Déconnecter'}
                </button>
            </div>
        </div>
    );
};

export default Settings;
