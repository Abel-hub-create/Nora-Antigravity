import React from 'react';
import DailyProgress from '../components/Home/DailyProgress';
import QuickActionCard from '../components/Home/QuickActionCard';
import { Plus, BookOpen, Sparkles } from 'lucide-react';
import { useUser } from '../context/UserContext';

const Home = () => {
    const { user } = useUser();

    return (
        <div className="p-6 pt-8 pb-24 space-y-6">
            {/* Header */}
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-text-main">Bonjour, {user.name?.split(' ')[0] || 'Utilisateur'}</h1>
                <p className="text-text-muted italic">"Un prix pensé pour ceux qui étudient, pas pour les gros budgets."</p>
            </header>

            {/* Daily Progress */}
            <DailyProgress />

            {/* Quick Actions Grid */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Actions Rapides</h3>

                <QuickActionCard
                    title="Voir mes syntheses"
                    subtitle="Toutes mes etudes"
                    icon={BookOpen}
                    to="/study"
                />

                <QuickActionCard
                    title="Voir la collection"
                    subtitle="Mes creatures"
                    icon={Sparkles}
                    to="/collection"
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
