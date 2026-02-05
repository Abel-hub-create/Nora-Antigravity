import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, ThumbsUp, ThumbsDown, Trash2, Loader2, MessageSquare, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../features/auth/hooks/useAuth';
import * as feedbackService from '../services/feedbackService';

const Feedback = () => {
    const { t } = useTranslation();
    const { user } = useAuth();

    // State
    const [activeTab, setActiveTab] = useState('reviews'); // 'reviews' or 'suggestions'
    const [reviews, setReviews] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dailyInfo, setDailyInfo] = useState({ count: 0, limit: 100, remaining: 100 });

    // Form state
    const [reviewContent, setReviewContent] = useState('');
    const [suggestionContent, setSuggestionContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Load data
    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [reviewsData, suggestionsData, dailyData] = await Promise.all([
                feedbackService.getReviews(),
                feedbackService.getSuggestions(),
                feedbackService.getDailyCount()
            ]);
            setReviews(reviewsData);
            setSuggestions(suggestionsData);
            setDailyInfo(dailyData);
        } catch (err) {
            console.error('Error loading feedback:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Format relative time
    const formatRelativeTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return t('feedback.justNow');
        if (diffMins < 60) return t('feedback.minutesAgo', { count: diffMins });
        if (diffHours < 24) return t('feedback.hoursAgo', { count: diffHours });
        return t('feedback.daysAgo', { count: diffDays });
    };

    // Submit review
    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!reviewContent.trim() || isSubmitting) return;

        try {
            setIsSubmitting(true);
            setError(null);
            await feedbackService.createReview(reviewContent.trim());
            setReviewContent('');
            await loadData();
        } catch (err) {
            if (err.response?.data?.error === 'DAILY_LIMIT_REACHED') {
                setError(t('feedback.dailyLimitReached'));
            } else {
                setError(t('feedback.errorSubmitting'));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Submit suggestion
    const handleSubmitSuggestion = async (e) => {
        e.preventDefault();
        if (!suggestionContent.trim() || isSubmitting) return;

        try {
            setIsSubmitting(true);
            setError(null);
            await feedbackService.createSuggestion(suggestionContent.trim());
            setSuggestionContent('');
            await loadData();
        } catch (err) {
            if (err.response?.data?.error === 'DAILY_LIMIT_REACHED') {
                setError(t('feedback.dailyLimitReached'));
            } else {
                setError(t('feedback.errorSubmitting'));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle vote
    const handleVote = async (feedbackId, voteValue, isReview) => {
        try {
            const result = await feedbackService.vote(feedbackId, voteValue);

            // Update local state
            const updateFn = (items) => items.map(item => {
                if (item.id === feedbackId) {
                    return {
                        ...item,
                        net_score: result.netScore,
                        user_vote: voteValue === 0 ? null : voteValue
                    };
                }
                return item;
            });

            if (isReview) {
                setReviews(updateFn);
            } else {
                setSuggestions(updateFn);
            }
        } catch (err) {
            console.error('Error voting:', err);
        }
    };

    // Handle delete
    const handleDelete = async (feedbackId, isReview) => {
        try {
            await feedbackService.deleteFeedback(feedbackId);
            if (isReview) {
                setReviews(prev => prev.filter(r => r.id !== feedbackId));
            } else {
                setSuggestions(prev => prev.filter(s => s.id !== feedbackId));
            }
        } catch (err) {
            console.error('Error deleting:', err);
        }
    };

    // Feedback item component
    const FeedbackItem = ({ item, isReview }) => {
        const isOwner = item.user_id === user?.id;
        const currentVote = item.user_vote;

        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface rounded-xl p-4 border border-white/5"
            >
                {/* Content */}
                <p className="text-text-main text-sm mb-3 break-words">{item.content}</p>

                {/* Author info */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">
                            {item.author_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-main truncate">{item.author_name}</p>
                        <p className="text-xs text-text-muted truncate">{item.author_email}</p>
                    </div>
                    <span className="text-xs text-text-muted shrink-0">
                        {formatRelativeTime(item.created_at)}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Like button */}
                        <button
                            onClick={() => handleVote(item.id, currentVote === 1 ? 0 : 1, isReview)}
                            className={`p-2 rounded-lg transition-colors ${
                                currentVote === 1
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-white/5 text-text-muted hover:text-green-400'
                            }`}
                        >
                            <ThumbsUp size={16} />
                        </button>

                        {/* Score */}
                        <span className={`text-sm font-bold min-w-[2rem] text-center ${
                            item.net_score > 0 ? 'text-green-400' :
                            item.net_score < 0 ? 'text-red-400' : 'text-text-muted'
                        }`}>
                            {item.net_score > 0 ? '+' : ''}{item.net_score}
                        </span>

                        {/* Dislike button */}
                        <button
                            onClick={() => handleVote(item.id, currentVote === -1 ? 0 : -1, isReview)}
                            className={`p-2 rounded-lg transition-colors ${
                                currentVote === -1
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-white/5 text-text-muted hover:text-red-400'
                            }`}
                        >
                            <ThumbsDown size={16} />
                        </button>
                    </div>

                    {/* Delete button (owner only) */}
                    {isOwner && (
                        <button
                            onClick={() => handleDelete(item.id, isReview)}
                            className="p-2 rounded-lg bg-white/5 text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </motion.div>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-full bg-background flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-full bg-background p-6 pb-24">
            {/* Header */}
            <header className="flex items-center gap-4 mb-6">
                <Link to="/" className="p-2 -ml-2 text-text-muted hover:text-text-main transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-text-main">{t('feedback.title')}</h1>
                    <p className="text-xs text-text-muted">
                        {t('feedback.remaining', { count: dailyInfo.remaining })}
                    </p>
                </div>
            </header>

            {/* Error message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tab Switcher */}
            <div className="flex p-1 bg-surface rounded-xl mb-6">
                <button
                    onClick={() => setActiveTab('reviews')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                        activeTab === 'reviews'
                            ? 'bg-background text-primary shadow-sm'
                            : 'text-text-muted hover:text-text-main'
                    }`}
                >
                    <MessageSquare size={18} />
                    {t('feedback.reviews')}
                </button>
                <button
                    onClick={() => setActiveTab('suggestions')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                        activeTab === 'suggestions'
                            ? 'bg-background text-primary shadow-sm'
                            : 'text-text-muted hover:text-text-main'
                    }`}
                >
                    <Lightbulb size={18} />
                    {t('feedback.suggestions')}
                </button>
            </div>

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
                <div className="space-y-4">
                    {/* Submit form */}
                    <form onSubmit={handleSubmitReview} className="bg-surface rounded-xl p-4 border border-white/5">
                        <div className="relative">
                            <textarea
                                value={reviewContent}
                                onChange={(e) => setReviewContent(e.target.value.slice(0, 120))}
                                placeholder={t('feedback.reviewPlaceholder')}
                                className="w-full h-20 bg-background text-text-main rounded-xl p-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-text-muted/50 text-sm"
                                disabled={isSubmitting}
                            />
                            <div className="absolute bottom-2 right-2 flex items-center gap-2">
                                <span className="text-xs text-text-muted">{reviewContent.length}/120</span>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={!reviewContent.trim() || isSubmitting}
                            className="mt-3 w-full py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <Send size={18} />
                                    {t('feedback.submitReview')}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Reviews list */}
                    <div className="space-y-3">
                        {reviews.length === 0 ? (
                            <div className="text-center py-8 text-text-muted">
                                <MessageSquare size={40} className="mx-auto mb-3 opacity-50" />
                                <p>{t('feedback.noReviews')}</p>
                            </div>
                        ) : (
                            reviews.map(review => (
                                <FeedbackItem key={review.id} item={review} isReview={true} />
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Suggestions Tab */}
            {activeTab === 'suggestions' && (
                <div className="space-y-4">
                    {/* Submit form */}
                    <form onSubmit={handleSubmitSuggestion} className="bg-surface rounded-xl p-4 border border-white/5">
                        <div className="relative">
                            <textarea
                                value={suggestionContent}
                                onChange={(e) => setSuggestionContent(e.target.value.slice(0, 70))}
                                placeholder={t('feedback.suggestionPlaceholder')}
                                className="w-full h-20 bg-background text-text-main rounded-xl p-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-text-muted/50 text-sm"
                                disabled={isSubmitting}
                            />
                            <div className="absolute bottom-2 right-2 flex items-center gap-2">
                                <span className="text-xs text-text-muted">{suggestionContent.length}/70</span>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={!suggestionContent.trim() || isSubmitting}
                            className="mt-3 w-full py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <Send size={18} />
                                    {t('feedback.submitSuggestion')}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Suggestions list */}
                    <div className="space-y-3">
                        {suggestions.length === 0 ? (
                            <div className="text-center py-8 text-text-muted">
                                <Lightbulb size={40} className="mx-auto mb-3 opacity-50" />
                                <p>{t('feedback.noSuggestions')}</p>
                            </div>
                        ) : (
                            suggestions.map(suggestion => (
                                <FeedbackItem key={suggestion.id} item={suggestion} isReview={false} />
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Feedback;
