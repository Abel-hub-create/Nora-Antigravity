import React from 'react';
import { useTranslation } from 'react-i18next';
import DailyProgress from '../components/Home/DailyProgress';
import QuickActionCard from '../components/Home/QuickActionCard';
import { Plus, BookOpen, Sparkles, MessageSquare } from 'lucide-react';
import { useUser } from '../context/UserContext';

const Home = () => {
    const { t } = useTranslation();
    const { user } = useUser();

    return (
        <div className="p-6 pt-8 pb-24 space-y-6">
            {/* Header */}
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-text-main">{t('home.greeting', { name: user.name?.split(' ')[0] || t('common.user') })}</h1>
                <p className="text-text-muted italic">{t('home.tagline')}</p>
            </header>

            {/* Daily Progress */}
            <DailyProgress />

            {/* Quick Actions Grid */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">{t('home.quickActions')}</h3>

                <QuickActionCard
                    title={t('home.viewSyntheses')}
                    subtitle={t('home.allStudies')}
                    icon={BookOpen}
                    to="/study"
                />

                <QuickActionCard
                    title={t('home.viewCollection')}
                    subtitle={t('home.myCreatures')}
                    icon={Sparkles}
                    to="/collection"
                />

                <QuickActionCard
                    title={t('home.newImport')}
                    subtitle={t('home.textOrVoice')}
                    icon={Plus}
                    to="/import"
                />

                <QuickActionCard
                    title={t('home.feedback')}
                    subtitle={t('home.feedbackSubtitle')}
                    icon={MessageSquare}
                    to="/feedback"
                />
            </div>
        </div>
    );
};

export default Home;
