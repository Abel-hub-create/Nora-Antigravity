import React from 'react';
import DailyProgress from '../components/Home/DailyProgress';
import QuickActionCard from '../components/Home/QuickActionCard';
import { Plus, Brain, Zap, FolderOpen } from 'lucide-react';
import { useUser } from '../context/UserContext';

const Home = () => {
    const { dailyGoals, dailyStats } = useUser();

    // Calculate Progress
    const totalGoals = dailyGoals.length;
    const completedGoals = dailyGoals.filter(g => g.completed).length;
    const progressPercentage = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

    return (
        <div className="p-6 pt-8 pb-24 space-y-6">
            {/* Header */}
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-main">Bonjour, Alex</h1>
                    <p className="text-text-muted">Prêt à apprendre quelque chose de nouveau ?</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary p-[2px]">
                    <div className="w-full h-full rounded-full bg-surface flex items-center justify-center overflow-hidden">
                        {/* Placeholder Avatar */}
                        <span className="text-lg font-bold text-white">A</span>
                    </div>
                </div>
            </header>

            {/* Daily Progress */}
            <DailyProgress progress={progressPercentage} />

            {/* Quick Actions Grid */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Actions Rapides</h3>

                <QuickActionCard
                    title="Quiz"
                    subtitle="Teste-toi"
                    icon={Brain}
                    to="/quiz" // We'll create this route
                />

                <QuickActionCard
                    title="Flashcards"
                    subtitle="Révision rapide"
                    icon={Zap}
                    to="/flashcards" // We'll create this route
                />

                <QuickActionCard
                    title="Nouvel Import"
                    subtitle="Texte ou Vocal"
                    icon={Plus}
                    to="/import"
                    color="bg-gradient-to-br from-primary/20 to-primary/5 hover:from-primary/30 hover:to-primary/10"
                />
            </div>
        </div>
    );
};

export default Home;
