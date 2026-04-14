import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, X, Crown, School, Zap, Loader2, Sparkles, MessageSquare, Brain, FolderOpen, Target, Star } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../features/auth/hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Pricing() {
  const { user, token } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);

  // School contact form
  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [schoolForm, setSchoolForm] = useState({ school_name: '', contact_email: '', contact_name: '', student_count: '', message: '' });
  const [schoolSubmitting, setSchoolSubmitting] = useState(false);
  const [schoolSuccess, setSchoolSuccess] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/subscription/plans`)
      .then(r => r.json())
      .then(data => setPlans(data.plans || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getLimitsMap = (plan) => {
    const map = {};
    (plan.limits || []).forEach(l => { map[l.limit_key] = l.limit_value; });
    return map;
  };

  const handleCheckout = async (planSlug) => {
    if (!token) { navigate('/login'); return; }
    setCheckoutLoading(planSlug);
    try {
      const res = await fetch(`${API_URL}/subscription/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ plan_slug: planSlug, promo_code: promoCode || undefined }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || t('pricing.checkoutError'));
      }
    } catch (err) {
      alert(t('pricing.connectionError'));
    } finally { setCheckoutLoading(null); }
  };

  const validatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const res = await fetch(`${API_URL}/subscription/promo/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode, plan: 'premium' }),
      });
      const data = await res.json();
      setPromoResult(data.valid ? { valid: true, discount_type: data.discount_type, discount_value: data.discount_value } : { valid: false, error: data.error });
    } catch { setPromoResult({ valid: false, error: t('pricing.connectionError') }); }
    finally { setPromoLoading(false); }
  };

  const handleSchoolSubmit = async (e) => {
    e.preventDefault();
    setSchoolSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/subscription/school/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...schoolForm, student_count: schoolForm.student_count ? parseInt(schoolForm.student_count) : null }),
      });
      if (res.ok) {
        setSchoolSuccess(true);
        setSchoolForm({ school_name: '', contact_email: '', contact_name: '', student_count: '', message: '' });
      } else {
        const data = await res.json();
        alert(data.error || t('common.error'));
      }
    } catch { alert(t('pricing.connectionError')); }
    finally { setSchoolSubmitting(false); }
  };

  const currentPlan = user?.plan_type || 'free';
  const checkoutSuccess = searchParams.get('checkout') === 'success';

  if (loading) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const freePlan = plans.find(p => p.slug === 'free');
  const premiumPlan = plans.find(p => p.slug === 'premium');
  const schoolPlan = plans.find(p => p.slug === 'school');

  const freeLimits = freePlan ? getLimitsMap(freePlan) : {};
  const premiumLimits = premiumPlan ? getLimitsMap(premiumPlan) : {};
  const schoolLimits = schoolPlan ? getLimitsMap(schoolPlan) : {};

  const features = [
    { key: 'ai_speed', label: t('pricing.features.aiSpeed'), free: t('pricing.features.slow'), premium: t('pricing.features.fast'), school: t('pricing.features.fast'), icon: Zap },
    { key: 'ai_model', label: t('pricing.features.aiModel'), free: t('pricing.features.basic'), premium: 'GPT-4 / Gemini', school: 'GPT-4 / Gemini', icon: Brain },
    { key: 'max_syntheses', label: t('pricing.features.syntheses'), free: `${freeLimits.max_syntheses || 3}`, premium: `${premiumLimits.max_syntheses || 20}`, school: `${schoolLimits.max_syntheses || 20}`, icon: Sparkles },
    { key: 'max_chat', label: t('pricing.features.chatPerDay'), free: `${freeLimits.max_chat_per_day || 3}`, premium: `${premiumLimits.max_chat_per_day || 15}`, school: `${schoolLimits.max_chat_per_day || 20}`, icon: MessageSquare },
    { key: 'max_ana', label: t('pricing.features.analysesPerDay'), free: `${freeLimits.max_ana_per_day || 3}`, premium: `${premiumLimits.max_ana_per_day || 3}`, school: `${schoolLimits.max_ana_per_day || 5}`, icon: Target },
    { key: 'max_exs', label: t('pricing.features.exercisesPerDay'), free: `${freeLimits.max_exs_per_day || 3}`, premium: `${premiumLimits.max_exs_per_day || 3}`, school: `${schoolLimits.max_exs_per_day || 5}`, icon: Star },
    { key: 'has_daily_goals', label: t('pricing.features.dailyGoals'), free: false, premium: true, school: true, icon: Target },
    { key: 'has_folders', label: t('pricing.features.folders'), free: false, premium: true, school: true, icon: FolderOpen },
    { key: 'has_flashcards', label: t('pricing.features.flashcardsQuiz'), free: false, premium: true, school: true, icon: Sparkles },
  ];

  return (
    <div className="min-h-full bg-background p-6 pb-24">
      <header className="flex items-center gap-4 mb-8">
        <Link to="/settings" className="p-2 -ml-2 text-text-muted hover:text-text-main transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-text-main">{t('pricing.title')}</h1>
      </header>

      {checkoutSuccess && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-sm text-center">
          {t('pricing.paymentSuccess')}
        </motion.div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Free */}
        <div className="bg-surface rounded-2xl border border-white/5 p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-text-main">{t('pricing.free.name')}</h3>
            <p className="text-sm text-text-muted mt-1">{t('pricing.free.description')}</p>
          </div>
          <div className="mb-6">
            <span className="text-3xl font-bold text-text-main">{t('pricing.free.price')}</span>
            <span className="text-text-muted text-sm">{t('pricing.perMonth')}</span>
          </div>
          <div className="space-y-3 flex-1">
            {features.map(f => (
              <div key={f.key} className="flex items-center gap-2 text-sm">
                {typeof f.free === 'boolean' ? (
                  f.free ? <Check size={16} className="text-emerald-400 shrink-0" /> : <X size={16} className="text-gray-600 shrink-0" />
                ) : <f.icon size={16} className="text-text-muted shrink-0" />}
                <span className={typeof f.free === 'boolean' && !f.free ? 'text-gray-600' : 'text-text-muted'}>
                  {f.label}{typeof f.free !== 'boolean' ? `: ${f.free}` : ''}
                </span>
              </div>
            ))}
          </div>
          {currentPlan === 'free' ? (
            <div className="mt-6 p-3 rounded-xl bg-white/5 text-center text-text-muted text-sm">
              {t('pricing.free.currentPlan')}
            </div>
          ) : (
            <button onClick={() => handleCheckout('free')} disabled
              className="mt-6 w-full p-3 rounded-xl bg-white/5 text-text-muted text-sm cursor-default">
              {t('pricing.free.downgrade')}
            </button>
          )}
        </div>

        {/* Premium */}
        <div className="bg-surface rounded-2xl border-2 border-primary/30 p-6 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
            {t('pricing.premium.popular')}
          </div>
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Crown size={20} className="text-amber-400" />
              <h3 className="text-lg font-bold text-text-main">{t('pricing.premium.name')}</h3>
            </div>
            <p className="text-sm text-text-muted mt-1">{t('pricing.premium.description')}</p>
          </div>
          <div className="mb-6">
            <span className="text-3xl font-bold text-text-main">{premiumPlan ? Number(premiumPlan.price_monthly).toFixed(2).replace('.', ',') : '9,99'}€</span>
            <span className="text-text-muted text-sm">{t('pricing.perMonth')}</span>
          </div>
          <div className="space-y-3 flex-1">
            {features.map(f => (
              <div key={f.key} className="flex items-center gap-2 text-sm">
                {typeof f.premium === 'boolean' ? (
                  f.premium ? <Check size={16} className="text-emerald-400 shrink-0" /> : <X size={16} className="text-gray-600 shrink-0" />
                ) : <f.icon size={16} className="text-primary shrink-0" />}
                <span className="text-text-main">
                  {f.label}{typeof f.premium !== 'boolean' ? `: ${f.premium}` : ''}
                </span>
              </div>
            ))}
          </div>
          {currentPlan === 'premium' ? (
            <div className="mt-6 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center text-amber-400 text-sm font-medium">
              {t('pricing.premium.currentPlan')}
            </div>
          ) : (
            <button onClick={() => handleCheckout('premium')} disabled={checkoutLoading === 'premium'}
              className="mt-6 w-full p-3 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {checkoutLoading === 'premium' ? <Loader2 size={18} className="animate-spin" /> : <Crown size={18} />}
              {t('pricing.premium.subscribe')}
            </button>
          )}
        </div>

        {/* School */}
        <div className="bg-surface rounded-2xl border border-violet-500/20 p-6 flex flex-col">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <School size={20} className="text-violet-400" />
              <h3 className="text-lg font-bold text-text-main">{t('pricing.school.name')}</h3>
            </div>
            <p className="text-sm text-text-muted mt-1">{t('pricing.school.description')}</p>
          </div>
          <div className="mb-6">
            <span className="text-3xl font-bold text-text-main">{schoolPlan ? Number(schoolPlan.price_monthly).toFixed(2).replace('.', ',') : '10,00'}€</span>
            <span className="text-text-muted text-sm">{t('pricing.school.perStudentPerMonth')}</span>
          </div>
          <div className="space-y-3 flex-1">
            {features.map(f => (
              <div key={f.key} className="flex items-center gap-2 text-sm">
                {typeof f.school === 'boolean' ? (
                  f.school ? <Check size={16} className="text-emerald-400 shrink-0" /> : <X size={16} className="text-gray-600 shrink-0" />
                ) : <f.icon size={16} className="text-violet-400 shrink-0" />}
                <span className="text-text-main">
                  {f.label}{typeof f.school !== 'boolean' ? `: ${f.school}` : ''}
                </span>
              </div>
            ))}
          </div>
          {currentPlan === 'school' ? (
            <div className="mt-6 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-center text-violet-400 text-sm font-medium">
              {t('pricing.school.currentPlan')}
            </div>
          ) : (
            <button onClick={() => setShowSchoolForm(!showSchoolForm)}
              className="mt-6 w-full p-3 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-400 font-medium hover:bg-violet-500/30 transition-colors flex items-center justify-center gap-2">
              <School size={18} />
              {t('pricing.school.contact')}
            </button>
          )}
        </div>
      </div>

      {/* Promo Code */}
      <div className="bg-surface rounded-2xl border border-white/5 p-5 mb-6">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">{t('pricing.promo.title')}</h3>
        <div className="flex gap-2">
          <input value={promoCode} onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoResult(null); }}
            placeholder={t('pricing.promo.placeholder')} className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary" />
          <button onClick={validatePromo} disabled={promoLoading || !promoCode.trim()}
            className="px-4 py-2.5 rounded-xl bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors disabled:opacity-50">
            {promoLoading ? <Loader2 size={16} className="animate-spin" /> : t('pricing.promo.apply')}
          </button>
        </div>
        {promoResult && (
          <div className={`mt-2 text-xs ${promoResult.valid ? 'text-emerald-400' : 'text-red-400'}`}>
            {promoResult.valid
              ? (promoResult.discount_type === 'percent'
                  ? t('pricing.promo.discountPercent', { value: promoResult.discount_value })
                  : t('pricing.promo.discountFixed', { value: promoResult.discount_value }))
              : promoResult.error}
          </div>
        )}
      </div>

      {/* School Contact Form */}
      {showSchoolForm && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-2xl border border-violet-500/20 p-6 mb-6">
          <h3 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
            <School size={20} className="text-violet-400" /> {t('pricing.schoolContact.title')}
          </h3>
          {schoolSuccess ? (
            <div className="text-center py-6">
              <Check size={48} className="text-emerald-400 mx-auto mb-3" />
              <p className="text-text-main font-medium">{t('pricing.schoolContact.successTitle')}</p>
              <p className="text-sm text-text-muted mt-1">{t('pricing.schoolContact.successText')}</p>
            </div>
          ) : (
            <form onSubmit={handleSchoolSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-text-muted mb-1 block">{t('pricing.schoolContact.schoolName')}</label>
                  <input required value={schoolForm.school_name} onChange={e => setSchoolForm(f => ({ ...f, school_name: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-violet-400" />
                </div>
                <div>
                  <label className="text-sm text-text-muted mb-1 block">{t('pricing.schoolContact.contactEmail')}</label>
                  <input type="email" required value={schoolForm.contact_email} onChange={e => setSchoolForm(f => ({ ...f, contact_email: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-violet-400" />
                </div>
                <div>
                  <label className="text-sm text-text-muted mb-1 block">{t('pricing.schoolContact.contactName')}</label>
                  <input value={schoolForm.contact_name} onChange={e => setSchoolForm(f => ({ ...f, contact_name: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-violet-400" />
                </div>
                <div>
                  <label className="text-sm text-text-muted mb-1 block">{t('pricing.schoolContact.studentCount')}</label>
                  <input type="number" value={schoolForm.student_count} onChange={e => setSchoolForm(f => ({ ...f, student_count: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-violet-400" />
                </div>
              </div>
              <div>
                <label className="text-sm text-text-muted mb-1 block">{t('pricing.schoolContact.message')}</label>
                <textarea value={schoolForm.message} onChange={e => setSchoolForm(f => ({ ...f, message: e.target.value }))} rows={3}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-violet-400 resize-none" />
              </div>
              <button type="submit" disabled={schoolSubmitting}
                className="w-full p-3 rounded-xl bg-violet-500 text-white font-medium hover:bg-violet-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {schoolSubmitting ? <Loader2 size={18} className="animate-spin" /> : t('pricing.schoolContact.submit')}
              </button>
            </form>
          )}
        </motion.div>
      )}
    </div>
  );
}
