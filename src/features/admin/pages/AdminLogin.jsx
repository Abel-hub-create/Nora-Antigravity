import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Loader2, Smartphone, Copy, Check } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { adminApi } from '../services/adminApiClient.js';

export default function AdminLogin() {
  const { adminUser, adminLogin, adminCompleteLogin } = useAdminAuth();
  const navigate = useNavigate();

  // step: 'credentials' | 'setup' | 'verify'
  const [step, setStep] = useState('credentials');
  const [pendingToken, setPendingToken] = useState('');

  // Credentials step
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // Setup step (first time TOTP)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [copied, setCopied] = useState(false);

  // Code input (setup + verify)
  const [code, setCode] = useState('');
  const codeRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (adminUser) navigate('/admin/dashboard', { replace: true });
  }, [adminUser, navigate]);

  useEffect(() => {
    if ((step === 'setup' || step === 'verify') && codeRef.current) {
      codeRef.current.focus();
    }
  }, [step]);

  // ─── Step 1: credentials ──────────────────────────────────────────────────

  const handleCredentials = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const data = await adminLogin(email, password);

      if (data.status === 'setup_required') {
        // Fetch QR code
        const qr = await adminApi.post('/auth/totp/qrcode', { pendingToken: data.pendingToken });
        setQrCodeDataUrl(qr.qrCodeDataUrl);
        setTotpSecret(qr.secret);
        setPendingToken(data.pendingToken);
        setStep('setup');
      } else if (data.status === 'totp_required') {
        setPendingToken(data.pendingToken);
        setStep('verify');
      } else if (data.adminAccessToken) {
        // Shouldn't happen but handle gracefully
        adminCompleteLogin(data.adminAccessToken, data.admin);
        navigate('/admin/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Identifiants incorrects');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Step 2a: enable TOTP (first time) ───────────────────────────────────

  const handleEnable = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setError('');
    setIsLoading(true);
    try {
      const data = await adminApi.post('/auth/totp/enable', { pendingToken, code });
      adminCompleteLogin(data.adminAccessToken, data.admin);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Code incorrect');
      setCode('');
      codeRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Step 2b: verify TOTP ─────────────────────────────────────────────────

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setError('');
    setIsLoading(true);
    try {
      const data = await adminApi.post('/auth/totp/verify', { pendingToken, code });
      adminCompleteLogin(data.adminAccessToken, data.admin);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Code incorrect');
      setCode('');
      codeRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeInput = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(val);
  };

  const copySecret = () => {
    navigator.clipboard.writeText(totpSecret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="admin-root min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center mb-4">
            <Shield size={24} className="text-sky-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Accès administrateur</h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === 'credentials' && 'Authentification requise'}
            {step === 'setup' && 'Configuration 2FA'}
            {step === 'verify' && 'Vérification 2FA'}
          </p>
        </div>

        {/* Step 1: credentials */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentials} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-sky-500 transition-colors"
                placeholder="mail"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-sky-500 transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? <><Loader2 size={16} className="animate-spin" /> Vérification...</> : 'Continuer'}
            </button>
          </form>
        )}

        {/* Step 2a: TOTP setup (first time) */}
        {step === 'setup' && (
          <form onSubmit={handleEnable} className="space-y-5">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Smartphone size={16} className="text-sky-400" />
                <span className="text-sm font-medium text-white">Configuration Google Authenticator</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Scanne ce QR code avec l'application Google Authenticator (ou Authy) pour activer la 2FA.
              </p>
              {qrCodeDataUrl && (
                <div className="flex justify-center mb-4">
                  <img src={qrCodeDataUrl} alt="QR Code TOTP" className="w-44 h-44 rounded-xl" />
                </div>
              )}
              <p className="text-xs text-gray-500 mb-2">Ou entre le code manuellement :</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 rounded-lg font-mono break-all">
                  {totpSecret}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors shrink-0"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Code de confirmation (6 chiffres)</label>
              <input
                ref={codeRef}
                type="text"
                inputMode="numeric"
                value={code}
                onChange={handleCodeInput}
                placeholder="000000"
                maxLength={6}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white text-center tracking-[0.3em] font-mono placeholder:text-gray-600 focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? <><Loader2 size={16} className="animate-spin" /> Activation...</> : 'Activer la 2FA et se connecter'}
            </button>

            <button
              type="button"
              onClick={() => { setStep('credentials'); setError(''); setCode(''); }}
              className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              Retour
            </button>
          </form>
        )}

        {/* Step 2b: TOTP verify */}
        {step === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
              <Smartphone size={20} className="text-sky-400 mx-auto mb-2" />
              <p className="text-sm text-gray-300 font-medium">Code d'authentification</p>
              <p className="text-xs text-gray-500 mt-1">Entre le code à 6 chiffres de ton application d'authentification.</p>
            </div>

            <div>
              <input
                ref={codeRef}
                type="text"
                inputMode="numeric"
                value={code}
                onChange={handleCodeInput}
                placeholder="000000"
                maxLength={6}
                autoComplete="one-time-code"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-lg text-white text-center tracking-[0.5em] font-mono placeholder:text-gray-600 focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? <><Loader2 size={16} className="animate-spin" /> Vérification...</> : 'Se connecter'}
            </button>

            <button
              type="button"
              onClick={() => { setStep('credentials'); setError(''); setCode(''); }}
              className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              Retour
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
