import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, RotateCcw, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Modal plein écran caméra pour le /ana.
 * onCapture(base64string) — appelé avec le base64 sans le préfixe data:...
 * onClose() — appelé si l'utilisateur annule
 */
export default function AnaCameraModal({ onCapture, onClose }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsReady(true);
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') setCameraError(t('photo.cameraDenied'));
      else if (err.name === 'NotFoundError') setCameraError(t('photo.noCamera'));
      else setCameraError(t('photo.cameraUnavailable'));
    }
  }, [t]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setIsReady(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64 = dataUrl.split(',')[1];
    stopCamera();
    onCapture(base64);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-[60] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent">
        <button
          onClick={handleClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X size={22} className="text-white" />
        </button>
        <span className="text-white text-sm font-medium">{t('assistant.ana.cameraTitle')}</span>
        <div className="w-10" />
      </div>

      {/* Flux caméra */}
      <div className="flex-1 relative flex items-center justify-center mt-16 mx-4 mb-2 overflow-hidden bg-black" style={{ borderRadius: '1rem', backdropFilter: 'none', WebkitBackdropFilter: 'none' }}>
        {cameraError ? (
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-white text-sm mb-4">{cameraError}</p>
            <button
              onClick={startCamera}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-sky-500 rounded-xl text-white text-sm"
            >
              <RotateCcw size={16} />
              {t('photo.retry')}
            </button>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            {isReady && (
              <div className="absolute inset-4 border-2 border-white/30 pointer-events-none" style={{ borderRadius: '0.75rem', backdropFilter: 'none', WebkitBackdropFilter: 'none' }} />
            )}
          </>
        )}
      </div>

      {/* Bouton capture */}
      <div
        className="px-4 pt-3 pb-6 bg-black/90 flex flex-col items-center gap-3"
        style={{ paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))' }}
      >
        <button
          onClick={handleCapture}
          disabled={!isReady}
          className="w-16 h-16 rounded-full bg-white flex items-center justify-center disabled:opacity-40"
        >
          <div className="w-12 h-12 rounded-full border-4 border-black/20" />
        </button>
        <p className="text-white/50 text-xs">{t('assistant.ana.cameraTip')}</p>
      </div>
    </motion.div>
  );
}
