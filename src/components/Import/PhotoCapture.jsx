import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Check, Loader2, AlertCircle, Image, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';

const PhotoCapture = ({ onComplete, onClose }) => {
    const { t } = useTranslation();
    const [photos, setPhotos] = useState([]);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [cameraError, setCameraError] = useState(null);
    const [ocrProgress, setOcrProgress] = useState(0);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const fileInputRef = useRef(null);

    // Initialiser la caméra
    const startCamera = useCallback(async () => {
        setCameraError(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCapturing(true);
            }
        } catch (err) {
            console.error('Erreur accès caméra:', err);

            if (err.name === 'NotAllowedError') {
                setCameraError(t('photo.cameraDenied'));
            } else if (err.name === 'NotFoundError') {
                setCameraError(t('photo.noCamera'));
            } else {
                setCameraError(t('photo.cameraUnavailable'));
            }
        }
    }, []);

    // Arrêter la caméra
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCapturing(false);
    }, []);

    // Initialiser au montage
    useEffect(() => {
        startCamera();

        return () => {
            stopCamera();
        };
    }, [startCamera, stopCamera]);

    // Capturer une photo
    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        const newPhoto = {
            id: Date.now(),
            dataUrl,
            isProcessing: false,
            success: false,
            error: null
        };

        setPhotos(prev => [...prev, newPhoto]);
    };

    // Supprimer une photo
    const removePhoto = (id) => {
        setPhotos(prev => prev.filter(p => p.id !== id));
    };

    // Importer depuis la galerie
    const handleGalleryClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);

        files.forEach(file => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target.result;
                const newPhoto = {
                    id: Date.now() + Math.random(),
                    dataUrl,
                    isProcessing: false,
                    success: false,
                    error: null
                };
                setPhotos(prev => [...prev, newPhoto]);
            };
            reader.readAsDataURL(file);
        });

        // Reset input pour permettre de sélectionner le même fichier
        e.target.value = '';
    };

    // Traiter toutes les photos avec Vision API
    const processPhotos = async () => {
        if (photos.length === 0) return;

        setIsProcessing(true);
        setError(null);
        setOcrProgress(0);

        try {
            // Marquer toutes les photos comme en traitement
            setPhotos(prev => prev.map(p => ({ ...p, isProcessing: true })));

            // Préparer les images en base64
            const images = photos.map(p => p.dataUrl);

            // Progression simulée pendant l'envoi
            const progressInterval = setInterval(() => {
                setOcrProgress(prev => Math.min(prev + 10, 90));
            }, 500);

            // Envoyer au backend via le client API centralisé
            const data = await api.post('/ai/ocr', { images });

            clearInterval(progressInterval);
            setOcrProgress(100);

            // Marquer toutes les photos comme réussies
            setPhotos(prev => prev.map(p => ({
                ...p,
                isProcessing: false,
                success: true
            })));

            // Le backend a validé le texte (minimum 30 caractères)
            stopCamera();
            onComplete(data.text);
        } catch (err) {
            console.error('OCR error:', err);
            const errorCode = err?.response?.data?.errorCode || err?.response?.data?.error;
            let errorMessage;
            if (errorCode === 'NO_TEXT_DETECTED_PHOTO') {
                errorMessage = t('errors.noTextDetectedPhoto');
            } else {
                errorMessage = err?.message || t('errors.photoProcessing');
            }
            setError(errorMessage);

            // Marquer les photos comme en erreur
            setPhotos(prev => prev.map(p => ({
                ...p,
                isProcessing: false,
                error: t('photo.error')
            })));
        } finally {
            setIsProcessing(false);
        }
    };

    // Fermer et nettoyer
    const handleClose = () => {
        stopCamera();
        onClose();
    };

    // Réessayer d'initialiser la caméra
    const retryCamera = () => {
        startCamera();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[60] flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
                <button
                    onClick={handleClose}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                    <X size={24} className="text-white" />
                </button>
                <h2 className="text-white font-medium">
                    {photos.length > 0
                        ? (photos.length > 1
                            ? t('photo.photoCountPlural', { count: photos.length })
                            : t('photo.photoCount', { count: photos.length }))
                        : t('photo.takePhoto')}
                </h2>
                <div className="w-10" />
            </div>

            {/* Zone de caméra ou erreur - limitée en hauteur */}
            <div className="relative flex items-center justify-center mt-16 mx-4 rounded-2xl overflow-hidden bg-black/50" style={{ height: 'min(55vh, 400px)' }}>
                {cameraError ? (
                    <div className="text-center p-6">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/20 flex items-center justify-center">
                            <AlertCircle className="w-8 h-8 text-error" />
                        </div>
                        <p className="text-white text-sm mb-4">{cameraError}</p>
                        <button
                            onClick={retryCamera}
                            className="flex items-center gap-2 mx-auto px-4 py-2 bg-primary rounded-xl text-white text-sm"
                        >
                            <RotateCcw size={16} />
                            {t('photo.retry')}
                        </button>
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                        <canvas ref={canvasRef} className="hidden" />

                        {/* Overlay de guidage */}
                        {isCapturing && (
                            <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute inset-4 border-2 border-white/30 rounded-xl" />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Contrôles en bas */}
            <div className="mt-auto p-4 pt-6 bg-gradient-to-t from-black via-black/95 to-transparent" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0.5rem))' }}>
                {/* Galerie de photos */}
                {photos.length > 0 && (
                    <div className="px-2 mb-3">
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {photos.map((photo, index) => (
                                <motion.div
                                    key={photo.id}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 border-white/30"
                                >
                                    <img
                                        src={photo.dataUrl}
                                        alt={`Photo ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />

                                    {/* Overlay de traitement */}
                                    {photo.isProcessing && (
                                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                        </div>
                                    )}

                                    {/* Indicateur de succès */}
                                    {photo.success && !photo.isProcessing && (
                                        <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                                            <Check className="w-5 h-5 text-green-400" />
                                        </div>
                                    )}

                                    {/* Indicateur d'erreur */}
                                    {photo.error && (
                                        <div className="absolute inset-0 bg-error/30 flex items-center justify-center">
                                            <AlertCircle className="w-5 h-5 text-error" />
                                        </div>
                                    )}

                                    {/* Bouton supprimer */}
                                    {!isProcessing && (
                                        <button
                                            onClick={() => removePhoto(photo.id)}
                                            className="absolute -top-1 -right-1 w-5 h-5 bg-error rounded-full flex items-center justify-center"
                                        >
                                            <X size={12} className="text-white" />
                                        </button>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
                {/* Message d'erreur global */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 p-3 bg-error/20 border border-error/30 rounded-xl"
                    >
                        <p className="text-error text-sm text-center">{error}</p>
                    </motion.div>
                )}

                {/* Barre de progression OCR */}
                {isProcessing && (
                    <div className="mb-4">
                        <div className="flex justify-between text-sm text-white/70 mb-1">
                            <span>{t('photo.extractingText')}</span>
                            <span>{ocrProgress}%</span>
                        </div>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${ocrProgress}%` }}
                                className="h-full bg-primary rounded-full"
                            />
                        </div>
                    </div>
                )}

                {/* Input file caché pour la galerie */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                />

                {/* Boutons d'action */}
                <div className="flex items-center justify-center gap-5">
                    {/* Bouton Galerie */}
                    <button
                        onClick={handleGalleryClick}
                        disabled={isProcessing}
                        className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center disabled:opacity-50 hover:bg-white/20 transition-colors"
                    >
                        <Image size={22} className="text-white" />
                    </button>

                    {/* Bouton Capture */}
                    <button
                        onClick={capturePhoto}
                        disabled={!isCapturing || isProcessing || cameraError}
                        className="w-16 h-16 rounded-full bg-white flex items-center justify-center disabled:opacity-50 disabled:bg-white/50"
                    >
                        <div className="w-12 h-12 rounded-full border-4 border-black/20" />
                    </button>

                    {/* Bouton Traiter */}
                    <button
                        onClick={processPhotos}
                        disabled={photos.length === 0 || isProcessing}
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                            photos.length > 0 && !isProcessing
                                ? 'bg-primary'
                                : 'bg-white/10'
                        } disabled:opacity-50`}
                    >
                        {isProcessing ? (
                            <Loader2 size={22} className="text-white animate-spin" />
                        ) : (
                            <Check size={22} className="text-white" />
                        )}
                    </button>
                </div>

                {/* Instructions */}
                <p className="text-center text-white/60 text-xs mt-2">
                    {isProcessing
                        ? t('photo.aiAnalyzing')
                        : photos.length > 0
                            ? t('photo.tapCheckToExtract')
                            : t('photo.takePhotosOfCourse')}
                </p>
            </div>
        </motion.div>
    );
};

export default PhotoCapture;
