import React, { useState, useEffect } from 'react';
import { Bot, Server, Key, ChevronRight, Loader2, RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { adminApi } from '../services/adminApiClient.js';
import AdminLayout from '../components/AdminLayout.jsx';

export default function AdminDebug() {
  const [aiConfig, setAiConfig] = useState(null);
  const [userId, setUserId] = useState('');
  const [userModelInfo, setUserModelInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load AI config on mount
  useEffect(() => {
    loadAiConfig();
  }, []);

  const loadAiConfig = async () => {
    try {
      setLoading(true);
      const config = await adminApi.get('/debug/ai-config');
      setAiConfig(config);
    } catch (err) {
      setError(err.message || 'Failed to load AI config');
    } finally {
      setLoading(false);
    }
  };

  const checkUserModel = async (e) => {
    e.preventDefault();
    if (!userId.trim()) return;
    
    try {
      setLoading(true);
      setError('');
      setUserModelInfo(null);
      const info = await adminApi.get(`/debug/ai-model/${userId.trim()}`);
      setUserModelInfo(info);
    } catch (err) {
      setError(err.message || 'Failed to get user model info');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Debug IA</h1>
          <button
            onClick={loadAiConfig}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* API Configuration Status */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Server size={20} className="text-sky-400" />
            Configuration API
          </h2>
          
          {aiConfig ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-white">Gemini API</span>
                  {aiConfig.gemini?.configured ? (
                    <CheckCircle size={16} className="text-emerald-400" />
                  ) : (
                    <XCircle size={16} className="text-red-400" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-1">Modèle: {aiConfig.gemini?.model}</p>
                <p className={`text-xs ${aiConfig.gemini?.configured ? 'text-emerald-400' : 'text-red-400'}`}>
                  {aiConfig.gemini?.configured ? 'Clé API configurée' : 'Clé API manquante'}
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-white">OpenAI API</span>
                  {aiConfig.openai?.configured ? (
                    <CheckCircle size={16} className="text-emerald-400" />
                  ) : (
                    <XCircle size={16} className="text-red-400" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-1">
                  Modèles: {aiConfig.openai?.models?.join(', ')}
                </p>
                <p className={`text-xs ${aiConfig.openai?.configured ? 'text-emerald-400' : 'text-red-400'}`}>
                  {aiConfig.openai?.configured ? 'Clé API configurée' : 'Clé API manquante'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 size={20} className="animate-spin mr-2" />
              Chargement...
            </div>
          )}
        </div>

        {/* Model Tiers */}
        {aiConfig?.modelTiers && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Bot size={20} className="text-sky-400" />
              Modèles par Plan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(aiConfig.modelTiers).map(([plan, models]) => (
                <div key={plan} className="bg-gray-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2 h-2 rounded-full ${
                      plan === 'free' ? 'bg-gray-400' : 
                      plan === 'premium' ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                    <span className="text-sm font-medium text-white capitalize">{plan}</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-gray-500">Principal:</span>
                      <span className="text-sm text-sky-400 ml-2">{models.primary}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Fallback:</span>
                      <span className="text-sm text-gray-300 ml-2">{models.fallback}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Model Checker */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Key size={20} className="text-sky-400" />
            Vérifier le modèle d'un utilisateur
          </h2>
          
          <form onSubmit={checkUserModel} className="flex gap-3 mb-6">
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="ID utilisateur..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              disabled={loading || !userId.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white rounded-xl transition-colors"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
              Vérifier
            </button>
          </form>

          {userModelInfo && (
            <div className="bg-gray-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-medium text-white">Utilisateur #{userModelInfo.userId}</span>
                <span className="text-xs text-gray-500">({userModelInfo.userEmail})</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Plan:</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                    userModelInfo.plan === 'free' ? 'bg-gray-700 text-gray-300' :
                    userModelInfo.plan === 'premium' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {userModelInfo.plan}
                  </span>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 mb-1">Gemini configuré:</p>
                  <span className={`text-sm ${userModelInfo.geminiConfigured ? 'text-emerald-400' : 'text-red-400'}`}>
                    {userModelInfo.geminiConfigured ? 'Oui' : 'Non'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-500 mb-2">Modèle actuel:</p>
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-sm text-white font-medium">{userModelInfo.models?.primary}</p>
                  <p className="text-xs text-gray-500 mt-1">Fallback: {userModelInfo.models?.fallback}</p>
                  <p className="text-xs text-sky-400 mt-2 italic">{userModelInfo.models?.reasoning}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
